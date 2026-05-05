import { supabase } from '../config/supabase';
import { isMissingSchemaTableError } from '../utils/supabasePostgrestErrors';

/** Shown in-app when PostgREST has no `activity_logs` (migrations not applied to this Supabase project). */
export const ACTIVITY_LOGS_SETUP_MESSAGE =
    'No public.activity_logs on this Supabase project. Open the Dashboard for the project in mobile-app/src/config/supabase.ts → SQL Editor → paste and run the full script from supabase/manual/activity_logs_standalone.sql (repo root), wait ~30s, reload the app.';

export const VENUE_REPORT_TYPE_SLUGS = ['incident', 'summary', 'compliance', 'end_of_night'] as const;
export type VenueReportTypeSlug = (typeof VENUE_REPORT_TYPE_SLUGS)[number];

export const VENUE_REPORT_TYPE_LABELS: Record<VenueReportTypeSlug, string> = {
    incident: 'Incident',
    summary: 'Summary',
    compliance: 'Compliance',
    end_of_night: 'End of night',
};

export type VenueReportRow = {
    id: string;
    action: string;
    details: string | null;
    performed_by: string | null;
    created_at: string;
    entity_id: string | null;
};

export function labelForReportTypeSlug(slug: string | null | undefined): string {
    if (slug == null || slug === '') return 'Summary';
    if (slug in VENUE_REPORT_TYPE_LABELS) {
        return VENUE_REPORT_TYPE_LABELS[slug as VenueReportTypeSlug];
    }
    return slug;
}

const REPORT_LIST_LIMIT = 200;

export async function fetchVenueReports(
    venueId: string,
    opts: { scope: 'today' | 'all' }
): Promise<{ rows: VenueReportRow[]; error: string | null; missingTable: boolean }> {
    let q = supabase
        .from('activity_logs')
        .select('id, action, details, performed_by, created_at, entity_id')
        .eq('venue_id', venueId)
        .eq('entity_type', 'report')
        .order('created_at', { ascending: false })
        .limit(REPORT_LIST_LIMIT);

    if (opts.scope === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        q = q.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data, error } = await q;

    if (error) {
        const missingTable = isMissingSchemaTableError(error);
        if (!missingTable && __DEV__) {
            console.warn('[venueReports] fetch', error.message);
        }
        return {
            rows: [],
            error: missingTable ? ACTIVITY_LOGS_SETUP_MESSAGE : error.message,
            missingTable,
        };
    }

    return { rows: (data || []) as VenueReportRow[], error: null, missingTable: false };
}

export async function fetchVenueReportStats(venueId: string): Promise<{
    total: number;
    thisMonth: number;
    contributors: number;
    error: string | null;
    missingTable: boolean;
}> {
    const base = () =>
        supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('venue_id', venueId).eq('entity_type', 'report');

    const { count: total, error: e1 } = await base();
    if (e1) {
        const missingTable = isMissingSchemaTableError(e1);
        return {
            total: 0,
            thisMonth: 0,
            contributors: 0,
            error: missingTable ? ACTIVITY_LOGS_SETUP_MESSAGE : e1.message,
            missingTable,
        };
    }

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const { count: thisMonth, error: e2 } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('venue_id', venueId)
        .eq('entity_type', 'report')
        .gte('created_at', startMonth.toISOString());

    if (e2) {
        return {
            total: total ?? 0,
            thisMonth: 0,
            contributors: 0,
            error: e2.message,
            missingTable: false,
        };
    }

    const { data: rows, error: e3 } = await supabase
        .from('activity_logs')
        .select('performed_by')
        .eq('venue_id', venueId)
        .eq('entity_type', 'report')
        .limit(800);

    if (e3) {
        return {
            total: total ?? 0,
            thisMonth: thisMonth ?? 0,
            contributors: 0,
            error: e3.message,
            missingTable: false,
        };
    }

    const contributors = new Set(
        (rows || []).map((r: { performed_by: string | null }) => r.performed_by).filter((v): v is string => !!v && v.trim().length > 0)
    ).size;

    return {
        total: total ?? 0,
        thisMonth: thisMonth ?? 0,
        contributors,
        error: null,
        missingTable: false,
    };
}

export async function insertVenueReportDraft(params: {
    venueId: string;
    performedBy: string;
    reportTypeSlug: VenueReportTypeSlug;
    title: string;
    details: string;
    /** When set, stored as `created_at` (same as web Write Report). */
    createdAtIso?: string;
}): Promise<{ error: string | null; missingTable?: boolean }> {
    const row: Record<string, unknown> = {
        venue_id: params.venueId,
        entity_type: 'report',
        entity_id: params.reportTypeSlug,
        action: params.title,
        details: params.details,
        performed_by: params.performedBy,
        portal: 'venue',
    };
    if (params.createdAtIso) {
        row.created_at = params.createdAtIso;
    }
    const { error } = await supabase.from('activity_logs').insert(row);

    if (error) {
        const missingTable = isMissingSchemaTableError(error);
        if (!missingTable && __DEV__) {
            console.warn('[venueReports] insert', error.message);
        }
        return {
            error: missingTable ? ACTIVITY_LOGS_SETUP_MESSAGE : error.message,
            missingTable,
        };
    }
    return { error: null };
}

export function subscribeVenueActivityLogs(venueId: string, onEvent: () => void): () => void {
    const channel = supabase
        .channel(`venue-activity-logs-${venueId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'activity_logs',
                filter: `venue_id=eq.${venueId}`,
            },
            () => {
                onEvent();
            }
        )
        .subscribe();

    return () => {
        void supabase.removeChannel(channel);
    };
}
