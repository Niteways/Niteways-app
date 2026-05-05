import { supabase } from '../config/supabase';

/**
 * Team / staff service for the Venue Portal.
 * Reads/writes `public.venue_team_members` — see
 * supabase/manual/venue_team_members_standalone.sql for the table definition.
 *
 * The ROLES / ALL_PERMISSIONS / ROLE_PERMISSIONS constants intentionally
 * mirror the web admin (src/pages/TeamManagement.tsx) so both portals produce
 * interchangeable rows in the same table.
 */

export type TeamRole =
    | 'manager'
    | 'host'
    | 'promoter'
    | 'security'
    | 'marketing';

export const ROLES: { value: TeamRole; label: string }[] = [
    { value: 'manager', label: 'Manager' },
    { value: 'host', label: 'Host' },
    { value: 'promoter', label: 'Promoter' },
    { value: 'security', label: 'Security' },
    { value: 'marketing', label: 'Marketing' },
];

export const ALL_PERMISSIONS: {
    id: string;
    label: string;
    category: string;
}[] = [
    { id: 'dashboard', label: 'Dashboard', category: 'Overview' },
    { id: 'live_performance', label: 'Live Performance', category: 'Overview' },
    { id: 'bookings', label: 'Table Bookings', category: 'Booking' },
    { id: 'guests', label: 'Guest List', category: 'Booking' },
    { id: 'tickets', label: 'Ticketing', category: 'Booking' },
    { id: 'floor_map', label: 'Floor Map Editor', category: 'Booking' },
    { id: 'crm', label: 'Smart CRM', category: 'Customer' },
    { id: 'campaigns', label: 'Campaigns & Events', category: 'Marketing' },
    { id: 'analytics', label: 'Analytics & Reports', category: 'Marketing' },
    { id: 'team', label: 'Team Management', category: 'Operations' },
    { id: 'checkin', label: 'Security & Check-in', category: 'Operations' },
    { id: 'venues', label: 'Multi-Venue Control', category: 'Venue' },
    { id: 'settings', label: 'Settings', category: 'System' },
];

export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
    manager: [
        'dashboard',
        'live_performance',
        'bookings',
        'guests',
        'tickets',
        'floor_map',
        'crm',
        'campaigns',
        'analytics',
        'team',
        'checkin',
        'venues',
        'settings',
    ],
    host: ['dashboard', 'bookings', 'guests', 'checkin'],
    promoter: ['dashboard', 'guests', 'analytics'],
    security: ['checkin', 'guests'],
    marketing: ['dashboard', 'campaigns', 'analytics'],
};

export type TeamMemberRow = {
    id: string;
    venue_id: string;
    user_id: string | null;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    status: 'active' | 'inactive' | string;
    avatar_url: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type RawRow = {
    id: string;
    venue_id: string;
    user_id: string | null;
    name: string;
    email: string;
    role: string | null;
    permissions: unknown;
    status: string | null;
    avatar_url: string | null;
    created_at: string | null;
    updated_at: string | null;
};

function normalisePermissions(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.filter((x): x is string => typeof x === 'string');
    }
    // Legacy shape from admin portal: { granted: [...] } or { [perm]: true }.
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.granted)) {
            return (obj.granted as unknown[]).filter(
                (x): x is string => typeof x === 'string',
            );
        }
        return Object.keys(obj).filter((k) => obj[k] === true);
    }
    return [];
}

function mapRow(r: RawRow): TeamMemberRow {
    return {
        id: r.id,
        venue_id: r.venue_id,
        user_id: r.user_id ?? null,
        name: r.name,
        email: r.email,
        role: r.role ?? 'staff',
        permissions: normalisePermissions(r.permissions),
        status: (r.status ?? 'active') as TeamMemberRow['status'],
        avatar_url: r.avatar_url ?? null,
        created_at: r.created_at ?? null,
        updated_at: r.updated_at ?? null,
    };
}

export async function fetchTeamMembers(venueId: string): Promise<TeamMemberRow[]> {
    const { data, error } = await supabase
        .from('venue_team_members')
        .select(
            'id, venue_id, user_id, name, email, role, permissions, status, avatar_url, created_at, updated_at',
        )
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('[venueTeam] fetchTeamMembers', error.message);
        return [];
    }
    return (data as RawRow[] | null ?? []).map(mapRow);
}

export type CreateTeamMemberInput = {
    name: string;
    email: string;
    /** When `permissions` is provided and non-null we treat this as "set manually" and store those; role is the display label. */
    role: TeamRole;
    permissions?: string[];
};

export type CreateTeamMemberResult =
    | { ok: true; row: TeamMemberRow }
    | { ok: false; error: string };

/**
 * Inserts a new row in `venue_team_members`. Returns a discriminated result so
 * the modal can show an inline error without throwing.
 */
export async function createTeamMember(
    venueId: string,
    input: CreateTeamMemberInput,
): Promise<CreateTeamMemberResult> {
    const trimmedName = input.name.trim();
    const trimmedEmail = input.email.trim().toLowerCase();

    if (!trimmedName) return { ok: false, error: 'Please enter the team member’s full name.' };
    if (!trimmedEmail) return { ok: false, error: 'Please enter an email address.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { ok: false, error: 'That email address doesn’t look right.' };
    }
    if (!ROLES.some((r) => r.value === input.role)) {
        return { ok: false, error: 'Please choose a role.' };
    }

    const permissions =
        input.permissions && input.permissions.length > 0
            ? input.permissions
            : ROLE_PERMISSIONS[input.role];

    const { data, error } = await supabase
        .from('venue_team_members')
        .insert({
            venue_id: venueId,
            name: trimmedName,
            email: trimmedEmail,
            role: input.role,
            permissions,
            status: 'active',
        })
        .select(
            'id, venue_id, user_id, name, email, role, permissions, status, avatar_url, created_at, updated_at',
        )
        .maybeSingle();

    if (error) {
        if (error.code === '23505') {
            return { ok: false, error: 'Someone with this email is already on your team.' };
        }
        console.warn('[venueTeam] createTeamMember', error.message);
        return { ok: false, error: error.message };
    }
    if (!data) return { ok: false, error: 'No row returned by the database.' };

    return { ok: true, row: mapRow(data as RawRow) };
}

export function subscribeTeamMembers(
    venueId: string,
    onChange: () => void,
): () => void {
    const channel = supabase
        .channel(`venue-team-${venueId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'venue_team_members',
                filter: `venue_id=eq.${venueId}`,
            },
            () => onChange(),
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
