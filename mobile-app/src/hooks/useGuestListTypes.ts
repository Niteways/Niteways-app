import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { GUEST_TYPE_OPTIONS } from './useRealtimeGuestLists';

export type GuestListTypeRow = {
    id: string;
    name: string;
    color: string;
};

const DEFAULT_NAMES: string[] = [...GUEST_TYPE_OPTIONS];

export function useGuestListTypes(listId: string | null | undefined) {
    const [rows, setRows] = useState<GuestListTypeRow[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!listId?.trim()) {
            setRows([]);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('guest_list_types')
                .select('id, name, color')
                .eq('list_id', listId)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            setRows(
                (data || []).map((r: any) => ({
                    id: r.id,
                    name: String(r.name || '').trim() || 'Standard',
                    color: String(r.color || 'teal'),
                }))
            );
        } catch (e) {
            console.warn('[useGuestListTypes]', e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [listId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const typeNames = useMemo(
        () => (rows.length > 0 ? rows.map((r) => r.name) : DEFAULT_NAMES),
        [rows]
    );

    const colorByTypeName = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of rows) {
            m.set(r.name.trim().toLowerCase(), r.color);
        }
        return m;
    }, [rows]);

    return { rows, typeNames, colorByTypeName, loading, refresh };
}
