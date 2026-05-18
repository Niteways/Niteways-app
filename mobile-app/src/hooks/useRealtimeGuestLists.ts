import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { isMissingSchemaTableError } from '../utils/supabasePostgrestErrors';
import { subscribeToTables } from '../services/realtime';

export interface RecurringListGuest {
    id: string;
    name: string;
    plusGuests: number;
    payingGuests: number;
    listType: string;
    promoter: string;
    addedBy: string;
    addedAt: string;
    notes?: string;
    checkedIn: boolean;
    checkedInCount: number;
    checkInTime?: string;
    isSticky: boolean;
}

export interface GuestList {
    id: string;
    name: string;
    dayOfWeek?: string;
    eventDate?: string;
    resetTime?: string;
    isActive: boolean;
    guestCount: number;
    lastReset: string;
    guests: RecurringListGuest[];
    type: 'recurring' | 'oneday';
}

/** DB uses 0 = Sunday … 6 = Saturday (matches reference hook). */
export const DAYS_SUNDAY_FIRST = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

export const GUEST_TYPE_OPTIONS = ['Standard', 'VIP', 'AA'] as const;

async function getDisplayNameFromSession(): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const fn = String(user.user_metadata?.first_name ?? '').trim();
        const ln = String(user.user_metadata?.last_name ?? '').trim();
        const n = `${fn} ${ln}`.trim();
        if (n) return n;
        return user.email?.split('@')[0] ?? null;
    } catch {
        return null;
    }
}

const normalizeAddedBy = (
    addedBy: string | null | undefined,
    currentUserId: string | null,
    currentProfileName: string | null
) => {
    const raw = (addedBy || '').trim();
    if (!raw) return 'Unknown';
    if (raw.toLowerCase() === 'current user') {
        return currentProfileName || 'Current user';
    }
    if (currentUserId && raw === currentUserId) {
        return currentProfileName || raw;
    }
    return raw;
};

export const toDbGuestType = (label: string) => {
    const v = (label || '').trim().toLowerCase();
    if (v === 'vip') return 'vip';
    if (v === 'aa') return 'aa';
    return 'standard';
};

const toUiGuestType = (dbValue: string | null | undefined) => {
    const v = (dbValue || 'standard').toLowerCase();
    if (v === 'vip') return 'VIP';
    if (v === 'aa') return 'AA';
    return 'Standard';
};

function warnGuestList(tag: string, err: unknown) {
    if (!isMissingSchemaTableError(err)) {
        console.warn(`[useRealtimeGuestLists] ${tag}`, err);
    }
}

export interface UseRealtimeGuestListsOptions {
    venueId: string | null;
}

export function useRealtimeGuestLists(options: UseRealtimeGuestListsOptions) {
    const activeVenueId = options.venueId?.trim() || '';

    const [recurringLists, setRecurringLists] = useState<GuestList[]>([]);
    const [oneDayLists, setOneDayLists] = useState<GuestList[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLists = useCallback(async () => {
        if (!activeVenueId) {
            setRecurringLists([]);
            setOneDayLists([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const profileName = await getDisplayNameFromSession();
            let currentUserId: string | null = null;
            try {
                const { data: auth } = await supabase.auth.getUser();
                currentUserId = auth.user?.id ?? null;
            } catch {
                /* ignore */
            }

            const { data: recurringData, error: recurringError } = await supabase
                .from('recurring_guest_lists')
                .select('*')
                .eq('venue_id', activeVenueId)
                .order('created_at', { ascending: false });

            if (recurringError) throw recurringError;

            const recurringIds = (recurringData || []).map((l) => l.id);
            let recurringGuests: any[] = [];
            if (recurringIds.length > 0) {
                const { data: guestsData, error: guestsError } = await supabase
                    .from('recurring_list_guests')
                    .select('*')
                    .in('recurring_list_id', recurringIds);
                if (guestsError) throw guestsError;
                recurringGuests = guestsData || [];
            }

            const formattedRecurring: GuestList[] = (recurringData || []).map((list) => {
                const listGuests = recurringGuests
                    .filter((g) => g.recurring_list_id === list.id)
                    .map((g) => {
                        const addedBy = normalizeAddedBy(g.added_by, currentUserId, profileName);
                        return {
                            id: g.id,
                            name: g.guest_name,
                            plusGuests: g.plus_guests || 0,
                            payingGuests: g.paying_guests || 0,
                            listType: toUiGuestType(g.guest_type),
                            promoter: addedBy,
                            addedBy,
                            addedAt: new Date(g.added_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            }),
                            notes: g.notes || undefined,
                            checkedIn: g.checked_in || false,
                            checkedInCount:
                                g.checked_in_count || (g.checked_in ? 1 + (g.plus_guests || 0) : 0),
                            checkInTime: g.check_in_time
                                ? new Date(g.check_in_time).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false,
                                  })
                                : undefined,
                            isSticky: g.is_sticky || false,
                        };
                    });

                return {
                    id: list.id,
                    name: list.name,
                    dayOfWeek: DAYS_SUNDAY_FIRST[list.day_of_week] || 'Unknown',
                    resetTime: list.reset_time || '03:00',
                    isActive: list.is_active,
                    guestCount: listGuests.length,
                    lastReset: list.updated_at ? new Date(list.updated_at).toLocaleString() : 'Never',
                    guests: listGuests,
                    type: 'recurring' as const,
                };
            });

            const { data: oneDayData, error: oneDayError } = await supabase
                .from('one_day_guest_lists')
                .select('*')
                .eq('venue_id', activeVenueId)
                .order('event_date', { ascending: false });

            if (oneDayError) throw oneDayError;

            const oneDayIds = (oneDayData || []).map((l) => l.id);
            let oneDayGuests: any[] = [];
            if (oneDayIds.length > 0) {
                const { data: guestsData, error: guestsError } = await supabase
                    .from('one_day_list_guests')
                    .select('*')
                    .in('list_id', oneDayIds);
                if (guestsError) throw guestsError;
                oneDayGuests = guestsData || [];
            }

            const formattedOneDay: GuestList[] = (oneDayData || []).map((list) => {
                const listGuests = oneDayGuests
                    .filter((g) => g.list_id === list.id)
                    .map((g) => {
                        const addedBy = normalizeAddedBy(g.added_by, currentUserId, profileName);
                        return {
                            id: g.id,
                            name: g.guest_name,
                            plusGuests: g.plus_guests || 0,
                            payingGuests: g.paying_guests || 0,
                            listType: toUiGuestType(g.guest_type),
                            promoter: addedBy,
                            addedBy,
                            addedAt: new Date(g.added_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            }),
                            notes: g.notes || undefined,
                            checkedIn: g.checked_in || false,
                            checkedInCount:
                                g.checked_in_count || (g.checked_in ? 1 + (g.plus_guests || 0) : 0),
                            checkInTime: g.check_in_time
                                ? new Date(g.check_in_time).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false,
                                  })
                                : undefined,
                            isSticky: false,
                        };
                    });

                return {
                    id: list.id,
                    name: list.name,
                    eventDate: list.event_date,
                    isActive: list.is_active,
                    guestCount: listGuests.length,
                    lastReset: list.updated_at ? new Date(list.updated_at).toLocaleString() : 'Never',
                    guests: listGuests,
                    type: 'oneday' as const,
                };
            });

            setRecurringLists(formattedRecurring);
            setOneDayLists(formattedOneDay);
        } catch (error) {
            if (isMissingSchemaTableError(error)) {
                setRecurringLists([]);
                setOneDayLists([]);
            } else {
                warnGuestList('fetchLists', error);
            }
        } finally {
            setLoading(false);
        }
    }, [activeVenueId]);

    const createRecurringList = useCallback(
        async (name: string, dayOfWeek: string, resetTime: string) => {
            if (!activeVenueId) return null;
            try {
                const dayIndex = DAYS_SUNDAY_FIRST.indexOf(dayOfWeek);
                const { data, error } = await supabase
                    .from('recurring_guest_lists')
                    .insert({
                        venue_id: activeVenueId,
                        name,
                        day_of_week: dayIndex >= 0 ? dayIndex : 3,
                        reset_time: resetTime,
                        is_active: true,
                    })
                    .select()
                    .single();

                if (error) throw error;
                await fetchLists();
                return data;
            } catch (error) {
                warnGuestList('createRecurringList', error);
                return null;
            }
        },
        [activeVenueId, fetchLists]
    );

    const createOneDayList = useCallback(
        async (name: string, eventDate: string) => {
            if (!activeVenueId) return null;
            try {
                const { data, error } = await supabase
                    .from('one_day_guest_lists')
                    .insert({
                        venue_id: activeVenueId,
                        name,
                        event_date: eventDate,
                        is_active: true,
                    })
                    .select()
                    .single();

                if (error) throw error;
                await fetchLists();
                return data;
            } catch (error) {
                warnGuestList('createOneDayList', error);
                return null;
            }
        },
        [activeVenueId, fetchLists]
    );

    const toggleListActive = useCallback(async (listId: string, isActive: boolean, type: 'recurring' | 'oneday') => {
        try {
            const table = type === 'recurring' ? 'recurring_guest_lists' : 'one_day_guest_lists';
            const { error } = await supabase.from(table).update({ is_active: !isActive }).eq('id', listId);
            if (error) throw error;
            await fetchLists();
        } catch (error) {
            warnGuestList('toggleListActive', error);
        }
    }, [fetchLists]);

    const deleteList = useCallback(
        async (listId: string, type: 'recurring' | 'oneday') => {
            try {
                if (type === 'recurring') {
                    setRecurringLists((prev) => prev.filter((list) => list.id !== listId));
                } else {
                    setOneDayLists((prev) => prev.filter((list) => list.id !== listId));
                }

                const { error: typesError } = await supabase.from('guest_list_types').delete().eq('list_id', listId);
                if (typesError) warnGuestList('delete guest_list_types', typesError);

                if (type === 'recurring') {
                    const { error: guestsError } = await supabase
                        .from('recurring_list_guests')
                        .delete()
                        .eq('recurring_list_id', listId);
                    if (guestsError) throw guestsError;

                    const { error: permError } = await supabase
                        .from('recurring_list_permissions')
                        .delete()
                        .eq('recurring_list_id', listId);
                    if (permError) warnGuestList('delete permissions', permError);

                    const { error: listError } = await supabase
                        .from('recurring_guest_lists')
                        .delete()
                        .eq('id', listId);
                    if (listError) throw listError;
                } else {
                    const { error: guestsError } = await supabase
                        .from('one_day_list_guests')
                        .delete()
                        .eq('list_id', listId);
                    if (guestsError) throw guestsError;

                    const { error: listError } = await supabase.from('one_day_guest_lists').delete().eq('id', listId);
                    if (listError) throw listError;
                }
                return true;
            } catch (error) {
                warnGuestList('deleteList', error);
                fetchLists();
                return false;
            }
        },
        [fetchLists]
    );

    const addGuestToRecurring = useCallback(
        async (
            listId: string,
            guestName: string,
            plusGuests: number,
            payingGuests: number,
            listType: string,
            notes?: string,
            isSticky?: boolean
        ) => {
            try {
                const profileName = await getDisplayNameFromSession();
                let addedBy: string = profileName || 'Unknown';
                try {
                    const { data: auth } = await supabase.auth.getUser();
                    if (auth.user?.id) addedBy = auth.user.id;
                } catch {
                    /* ignore */
                }

                const { data, error } = await supabase
                    .from('recurring_list_guests')
                    .insert({
                        recurring_list_id: listId,
                        guest_name: guestName.trim(),
                        guest_type: toDbGuestType(listType),
                        plus_guests: Math.max(0, Number(plusGuests) || 0),
                        paying_guests: Math.max(0, Number(payingGuests) || 0),
                        added_by: addedBy,
                        notes: notes || null,
                        checked_in: false,
                        checked_in_count: 0,
                        is_sticky: !!isSticky,
                    })
                    .select()
                    .single();

                if (error) throw error;
                await fetchLists();
                return data;
            } catch (error: any) {
                warnGuestList('addGuestToRecurring', error);
                return null;
            }
        },
        [fetchLists]
    );

    const addGuestToOneDay = useCallback(
        async (
            listId: string,
            guestName: string,
            plusGuests: number,
            payingGuests: number,
            listType: string,
            notes?: string
        ) => {
            try {
                const profileName = await getDisplayNameFromSession();
                let addedBy: string = profileName || 'Unknown';
                try {
                    const { data: auth } = await supabase.auth.getUser();
                    if (auth.user?.id) addedBy = auth.user.id;
                } catch {
                    /* ignore */
                }

                const { data, error } = await supabase
                    .from('one_day_list_guests')
                    .insert({
                        list_id: listId,
                        guest_name: guestName.trim(),
                        guest_type: toDbGuestType(listType),
                        plus_guests: Math.max(0, Number(plusGuests) || 0),
                        paying_guests: Math.max(0, Number(payingGuests) || 0),
                        added_by: addedBy,
                        notes: notes || null,
                        checked_in: false,
                        checked_in_count: 0,
                    })
                    .select()
                    .single();

                if (error) throw error;
                await fetchLists();
                return data;
            } catch (error: any) {
                warnGuestList('addGuestToOneDay', error);
                return null;
            }
        },
        [fetchLists]
    );

    const updateRecurringGuest = useCallback(
        async (
            guestId: string,
            updates: {
                guestName?: string;
                plusGuests?: number;
                payingGuests?: number;
                listType?: string;
                notes?: string;
                isSticky?: boolean;
            }
        ) => {
            try {
                const updateData: Record<string, any> = {};
                if (updates.guestName) updateData.guest_name = updates.guestName;
                if (updates.plusGuests !== undefined) updateData.plus_guests = updates.plusGuests;
                if (updates.payingGuests !== undefined) updateData.paying_guests = updates.payingGuests;
                if (updates.listType) updateData.guest_type = toDbGuestType(updates.listType);
                if (updates.notes !== undefined) updateData.notes = updates.notes || null;
                if (updates.isSticky !== undefined) updateData.is_sticky = updates.isSticky;

                const { error } = await supabase.from('recurring_list_guests').update(updateData).eq('id', guestId);
                if (error) throw error;
                await fetchLists();
                return true;
            } catch (error) {
                warnGuestList('updateRecurringGuest', error);
                return false;
            }
        },
        [fetchLists]
    );

    const updateOneDayGuest = useCallback(
        async (
            guestId: string,
            updates: {
                guestName?: string;
                plusGuests?: number;
                payingGuests?: number;
                listType?: string;
                notes?: string;
            }
        ) => {
            try {
                const updateData: Record<string, any> = {};
                if (updates.guestName) updateData.guest_name = updates.guestName;
                if (updates.plusGuests !== undefined) updateData.plus_guests = updates.plusGuests;
                if (updates.payingGuests !== undefined) updateData.paying_guests = updates.payingGuests;
                if (updates.listType) updateData.guest_type = toDbGuestType(updates.listType);
                if (updates.notes !== undefined) updateData.notes = updates.notes || null;

                const { error } = await supabase.from('one_day_list_guests').update(updateData).eq('id', guestId);
                if (error) throw error;
                await fetchLists();
                return true;
            } catch (error) {
                warnGuestList('updateOneDayGuest', error);
                return false;
            }
        },
        [fetchLists]
    );

    const deleteGuest = useCallback(
        async (guestId: string, type: 'recurring' | 'oneday' = 'recurring') => {
            try {
                const table = type === 'recurring' ? 'recurring_list_guests' : 'one_day_list_guests';
                const { error } = await supabase.from(table).delete().eq('id', guestId);
                if (error) throw error;
                await fetchLists();
            } catch (error) {
                warnGuestList('deleteGuest', error);
            }
        },
        [fetchLists]
    );

    const checkInGuest = useCallback(
        async (guestId: string, currentCount: number, totalParty: number, type: 'recurring' | 'oneday' = 'recurring') => {
            try {
                const table = type === 'recurring' ? 'recurring_list_guests' : 'one_day_list_guests';
                const newCount = currentCount + 1;
                const isFullyCheckedIn = newCount >= totalParty;

                const { error } = await supabase
                    .from(table)
                    .update({
                        checked_in_count: newCount,
                        checked_in: isFullyCheckedIn,
                        check_in_time: new Date().toISOString(),
                    })
                    .eq('id', guestId);

                if (error) throw error;
                await fetchLists();
                return true;
            } catch (error) {
                warnGuestList('checkInGuest', error);
                return false;
            }
        },
        [fetchLists]
    );

    const resetRecurringList = useCallback(
        async (listId: string) => {
            try {
                const { error: deleteError } = await supabase
                    .from('recurring_list_guests')
                    .delete()
                    .eq('recurring_list_id', listId)
                    .eq('is_sticky', false);
                if (deleteError) throw deleteError;

                const { error: resetError } = await supabase
                    .from('recurring_list_guests')
                    .update({ checked_in: false, checked_in_count: 0, check_in_time: null })
                    .eq('recurring_list_id', listId)
                    .eq('is_sticky', true);
                if (resetError) throw resetError;

                const { error: updateError } = await supabase
                    .from('recurring_guest_lists')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', listId);
                if (updateError) throw updateError;

                await fetchLists();
                return true;
            } catch (error) {
                warnGuestList('resetRecurringList', error);
                return false;
            }
        },
        [fetchLists]
    );

    useEffect(() => {
        fetchLists();

        if (!activeVenueId) {
            return () => {};
        }

        const refresh = () => void fetchLists();
        const unsub = subscribeToTables([
            {
                options: {
                    channel: `rn-recurring-guest-lists-${activeVenueId}`,
                    table: 'recurring_guest_lists',
                    filter: `venue_id=eq.${activeVenueId}`,
                },
                onChange: refresh,
            },
            {
                options: {
                    channel: `rn-recurring-list-guests-${activeVenueId}`,
                    table: 'recurring_list_guests',
                },
                onChange: refresh,
            },
            {
                options: {
                    channel: `rn-one-day-guest-lists-${activeVenueId}`,
                    table: 'one_day_guest_lists',
                    filter: `venue_id=eq.${activeVenueId}`,
                },
                onChange: refresh,
            },
            {
                options: {
                    channel: `rn-one-day-list-guests-${activeVenueId}`,
                    table: 'one_day_list_guests',
                },
                onChange: refresh,
            },
        ]);

        return unsub;
    }, [fetchLists, activeVenueId]);

    const allLists = [...recurringLists, ...oneDayLists];

    return {
        lists: allLists,
        recurringLists,
        oneDayLists,
        loading,
        createRecurringList,
        createOneDayList,
        toggleListActive,
        deleteList,
        addGuestToRecurring,
        addGuestToOneDay,
        updateRecurringGuest,
        updateOneDayGuest,
        deleteGuest,
        checkInGuest,
        resetRecurringList,
        refetch: fetchLists,
    };
}
