import { supabase } from '../config/supabase';
import { isMissingSchemaTableError } from '../utils/supabasePostgrestErrors';

export type TableBookingRow = {
    id: string;
    booking_id: string;
    venue_id: string;
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    table_number: string;
    party_size: number;
    booking_date: string;
    booking_time: string;
    status: string;
    price: number | null;
    notes: string | null;
    created_at: string;
    guests?: { name: string; guest_id: string } | null;
    venues?: { name: string } | null;
};

export type GuestListEntryRow = {
    id: string;
    venue_id: string;
    guest_name: string;
    plus_guests: number | null;
    list_type: string;
    event_date: string;
    notes: string | null;
    checked_in: boolean | null;
    status: string;
    promoter: string | null;
};

/** Profiles linked to a venue (for guest-list permission pickers). RLS may limit rows. */
export type VenueStaffProfile = {
    id: string;
    label: string;
    role: string | null;
};

export async function fetchVenueStaffProfiles(venueId: string): Promise<VenueStaffProfile[]> {
    const { data, error } = await supabase.from('profiles').select('id, role').eq('venue_id', venueId);
    if (error) {
        console.warn('[venuePortal] fetchVenueStaffProfiles', error.message);
        return [];
    }
    return (data || []).map((p: { id: string; role: string | null }) => {
        const short = p.id.replace(/-/g, '').slice(0, 8);
        const roleLabel = p.role ? String(p.role).replace(/_/g, ' ') : 'member';
        return {
            id: p.id,
            role: p.role ?? null,
            label: `${roleLabel} · ${short}`,
        };
    });
}

export async function fetchProfileSummary(userId: string): Promise<{
    role: string | null;
    venue_id: string | null;
}> {
    const { data, error } = await supabase
        .from('profiles')
        .select('role, venue_id')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.warn('[venuePortal] fetchProfileSummary', error.message);
        return { role: null, venue_id: null };
    }
    return { role: data?.role ?? null, venue_id: data?.venue_id ?? null };
}

export async function resolveVenueForUser(userId: string): Promise<{
    venueId: string | null;
    venueName: string | null;
}> {
    const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('venue_id')
        .eq('id', userId)
        .maybeSingle();

    if (!pErr && profile?.venue_id) {
        const { data: v } = await supabase.from('venues').select('name').eq('id', profile.venue_id).maybeSingle();
        return { venueId: profile.venue_id, venueName: v?.name ?? null };
    }

    const { data: owned } = await supabase
        .from('venues')
        .select('id, name')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

    if (owned?.id) {
        // Many flows set venues.owner_id but never set profiles.venue_id; portal + guest lists need the UUID.
        const vid = String(owned.id);
        const current = profile?.venue_id != null ? String(profile.venue_id) : '';
        const shouldBackfill = !pErr && (!profile || !current || current !== vid);
        if (shouldBackfill) {
            const { error: upErr } = await supabase
                .from('profiles')
                .update({ venue_id: owned.id })
                .eq('id', userId);
            if (upErr) console.warn('[venuePortal] backfill profiles.venue_id from owner_id', upErr.message);
        }
        return { venueId: owned.id, venueName: owned.name ?? null };
    }

    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user;
    if (u?.id === userId) {
        const metaVid = u.user_metadata?.venue_id;
        if (typeof metaVid === 'string' && metaVid.length >= 8) {
            const { data: v } = await supabase.from('venues').select('id, name').eq('id', metaVid).maybeSingle();
            if (v?.id) {
                return { venueId: v.id, venueName: v.name ?? null };
            }
        }
    }

    return { venueId: null, venueName: null };
}

/** Human-readable `venues.venue_id` slug (unique); not the UUID primary key. */
function makeVenueSlugToken(displayName: string): string {
    const base = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 36);
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    return `${base || 'venue'}-${suffix}`;
}

/**
 * Inserts a venue row, sets profiles.venue_id, and mirrors UUID in auth user_metadata
 * so the venue portal can resolve the owner after signup.
 */
export async function createVenueAndLinkProfile(params: {
    ownerUserId: string;
    venueName: string;
    cityId: string;
    ownerEmail?: string | null;
    ownerPhone?: string | null;
}): Promise<{ venueUuid: string | null; error?: string }> {
    for (let attempt = 0; attempt < 6; attempt++) {
        const token = makeVenueSlugToken(params.venueName + (attempt ? `-${attempt}` : ''));
        const { data, error } = await supabase
            .from('venues')
            .insert({
                venue_id: token,
                name: params.venueName,
                city_id: params.cityId,
                owner_id: params.ownerUserId,
                email: params.ownerEmail?.trim() || null,
                phone: params.ownerPhone?.trim() || null,
                status: 'pending',
            })
            .select('id')
            .single();

        if (error?.code === '23505') continue;
        if (error) {
            console.warn('[venuePortal] createVenueAndLinkProfile', error.message);
            return { venueUuid: null, error: error.message };
        }
        if (!data?.id) return { venueUuid: null, error: 'No venue id returned' };

        const { error: pErr } = await supabase
            .from('profiles')
            .update({ venue_id: data.id })
            .eq('id', params.ownerUserId);

        if (pErr) {
            console.warn('[venuePortal] profile venue_id update', pErr.message);
        }

        const { error: metaErr } = await supabase.auth.updateUser({
            data: { venue_id: data.id },
        });
        if (metaErr) {
            console.warn('[venuePortal] auth metadata venue_id', metaErr.message);
        }

        return { venueUuid: data.id };
    }
    return { venueUuid: null, error: 'Could not create venue (slug conflict)' };
}

/** Backfill for accounts that signed up as venue_owner before venue rows were created. */
export async function ensureVenueFromSignupMetadata(user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
}): Promise<void> {
    const resolved = await resolveVenueForUser(user.id);
    if (resolved.venueId) return;
    const meta = user.user_metadata || {};
    const vname = typeof meta.venue_name === 'string' ? meta.venue_name.trim() : '';
    const cityId = typeof meta.venue_city_id === 'string' ? meta.venue_city_id : '';
    if (!vname || !cityId) return;
    await createVenueAndLinkProfile({
        ownerUserId: user.id,
        venueName: vname,
        cityId,
        ownerEmail: user.email ?? null,
        ownerPhone: typeof meta.mobile === 'string' ? meta.mobile : null,
    });
}

export type SeedDevTestResult = { ok: true; venueId: string; reusedVenue: boolean } | { ok: false; error: string };

/**
 * Development / QA only: ensures the signed-in user has a venue + profile link and one sample recurring guest list.
 * Safe to call multiple times (reuses existing owned venue; only adds sample list if none exist).
 */
export async function seedDevTestVenueAndSampleGuestList(userId: string): Promise<SeedDevTestResult> {
    let venueUuid: string | null = null;
    let reusedVenue = false;

    const resolved = await resolveVenueForUser(userId);
    if (resolved.venueId) {
        venueUuid = resolved.venueId;
        reusedVenue = true;
    } else {
        const { data: owned } = await supabase
            .from('venues')
            .select('id')
            .eq('owner_id', userId)
            .limit(1)
            .maybeSingle();
        if (owned?.id) {
            venueUuid = owned.id;
            reusedVenue = true;
        }
    }

    if (!venueUuid) {
        const { data: cityRow } = await supabase.from('cities').select('id').limit(1).maybeSingle();
        const token = makeVenueSlugToken('dev-test-venue');
        const { data: inserted, error: insErr } = await supabase
            .from('venues')
            .insert({
                venue_id: token,
                name: 'Dev test venue',
                city_id: cityRow?.id ?? null,
                owner_id: userId,
                status: 'pending',
            })
            .select('id')
            .single();

        if (insErr || !inserted?.id) {
            return { ok: false, error: insErr?.message || 'Could not create test venue (check RLS / DB).' };
        }
        venueUuid = inserted.id;
    }

    const { data: updatedRows, error: upErr } = await supabase
        .from('profiles')
        .update({ venue_id: venueUuid, role: 'venue_owner' })
        .eq('id', userId)
        .select('id');
    if (upErr) {
        return { ok: false, error: upErr.message || 'Could not update profile.venue_id.' };
    }
    if (!updatedRows?.length) {
        const { error: insErr } = await supabase
            .from('profiles')
            .insert({ id: userId, venue_id: venueUuid, role: 'venue_owner' });
        if (insErr) {
            return { ok: false, error: insErr.message || 'Could not insert profile row.' };
        }
    }

    const { error: metaErr } = await supabase.auth.updateUser({
        data: { venue_id: venueUuid },
    });
    if (metaErr) {
        console.warn('[venuePortal] seedDevTest auth metadata', metaErr.message);
    }

    const { count, error: cntErr } = await supabase
        .from('recurring_guest_lists')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venueUuid);

    if (cntErr && !isMissingSchemaTableError(cntErr)) {
        console.warn('[venuePortal] seedDevTest list count', cntErr.message);
    } else if (!cntErr && (count ?? 0) === 0) {
        const { error: listErr } = await supabase.from('recurring_guest_lists').insert({
            venue_id: venueUuid,
            name: 'Sample recurring list (dev)',
            day_of_week: 5,
            reset_time: '06:00:00',
            is_active: true,
        });
        if (listErr) {
            return { ok: false, error: listErr.message || 'Venue linked but could not create sample list.' };
        }
    }

    return { ok: true, venueId: venueUuid, reusedVenue };
}

/** Public-facing venue info edited from the Settings > Venue tab. */
export type VenueInfoRow = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
};

/**
 * Some older/drifted Supabase instances are missing venues.email / venues.phone.
 * We select those columns lazily and fall back to (id, name) so the UI still works.
 */
function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
    if (!err) return false;
    if (err.code === '42703') return true;
    if (err.code === 'PGRST204') return true;
    const msg = err.message ?? '';
    if (/column\s+.*does not exist/i.test(msg)) return true;
    if (/could not find the .* column of .* in the schema cache/i.test(msg)) return true;
    return false;
}

export async function fetchVenueInfo(venueId: string): Promise<VenueInfoRow | null> {
    const full = await supabase
        .from('venues')
        .select('id, name, email, phone')
        .eq('id', venueId)
        .maybeSingle();

    if (!full.error) {
        return (full.data as VenueInfoRow) ?? null;
    }
    if (!isMissingColumnError(full.error)) {
        console.warn('[venuePortal] fetchVenueInfo', full.error.message);
        return null;
    }

    const fallback = await supabase
        .from('venues')
        .select('id, name')
        .eq('id', venueId)
        .maybeSingle();
    if (fallback.error) {
        console.warn('[venuePortal] fetchVenueInfo fallback', fallback.error.message);
        return null;
    }
    const row = fallback.data as { id: string; name: string | null } | null;
    return row ? { id: row.id, name: row.name, email: null, phone: null } : null;
}

export async function updateVenueInfo(
    venueId: string,
    patch: { name?: string | null; email?: string | null; phone?: string | null }
): Promise<{ ok: boolean; error?: string }> {
    const payload: Record<string, string | null> = {};
    if (patch.name !== undefined) payload.name = patch.name?.trim() || null;
    if (patch.email !== undefined) payload.email = patch.email?.trim() || null;
    if (patch.phone !== undefined) payload.phone = patch.phone?.trim() || null;

    const first = await supabase.from('venues').update(payload).eq('id', venueId);
    if (!first.error) return { ok: true };

    if (isMissingColumnError(first.error)) {
        const nameOnly: Record<string, string | null> = {};
        if (payload.name !== undefined) nameOnly.name = payload.name;
        if (Object.keys(nameOnly).length === 0) {
            return {
                ok: false,
                error:
                    'Your venues table is missing the email/phone columns. Run the latest migration, then retry.',
            };
        }
        const second = await supabase.from('venues').update(nameOnly).eq('id', venueId);
        if (second.error) {
            return { ok: false, error: second.error.message };
        }
        return {
            ok: false,
            error:
                'Venue name saved, but email/phone columns are missing on your venues table. Run the latest migration to enable them.',
        };
    }

    console.warn('[venuePortal] updateVenueInfo', first.error.message);
    return { ok: false, error: first.error.message };
}

export async function fetchBookingsForVenue(venueId: string): Promise<TableBookingRow[]> {
    const { data, error } = await supabase
        .from('table_bookings')
        .select('*, guests(name, guest_id), venues(name)')
        .eq('venue_id', venueId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .limit(150);

    if (error) {
        if (!isMissingSchemaTableError(error)) {
            console.warn('[venuePortal] fetchBookingsForVenue', error.message);
        }
        return [];
    }
    return (data || []) as TableBookingRow[];
}

export async function fetchBookingById(bookingId: string): Promise<TableBookingRow | null> {
    const { data, error } = await supabase
        .from('table_bookings')
        .select('*, guests(name, guest_id), venues(name)')
        .eq('id', bookingId)
        .maybeSingle();

    if (error || !data) return null;
    return data as TableBookingRow;
}

export async function updateBookingStatus(
    bookingId: string,
    status: 'pending' | 'confirmed' | 'declined' | 'completed' | 'cancelled' | 'no_show'
): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('table_bookings').update({ status }).eq('id', bookingId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function fetchGuestListForVenue(venueId: string): Promise<GuestListEntryRow[]> {
    const { data, error } = await supabase
        .from('guest_list_entries')
        .select('*')
        .eq('venue_id', venueId)
        .order('event_date', { ascending: false })
        .limit(100);

    if (error) {
        if (!isMissingSchemaTableError(error)) {
            console.warn('[venuePortal] fetchGuestListForVenue', error.message);
        }
        return [];
    }
    return (data || []) as GuestListEntryRow[];
}

export function subscribeTableBookingsVenue(venueId: string, onChange: () => void): () => void {
    const channel = supabase
        .channel(`venue-portal-bookings-${venueId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'table_bookings',
                filter: `venue_id=eq.${venueId}`,
            },
            () => onChange()
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

export function subscribeGuestListVenue(venueId: string, onChange: () => void): () => void {
    const channel = supabase
        .channel(`venue-portal-guests-${venueId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'guest_list_entries',
                filter: `venue_id=eq.${venueId}`,
            },
            () => onChange()
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
