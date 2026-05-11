import { supabase } from '../config/supabase';

/**
 * Venue Info screen (More > Venue Info) service helpers.
 * Reads and writes `public.venues` with graceful fallback when the DB is
 * drifted and some columns (email/phone/opening_hours_json/lat/lng) are missing.
 */

export type VenueCategory = 'Nightclub' | 'Beach Club' | 'Lounge' | 'Bar' | 'Restaurant';

export const VENUE_CATEGORIES: VenueCategory[] = [
    'Nightclub',
    'Beach Club',
    'Lounge',
    'Bar',
    'Restaurant',
];

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<DayKey, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
};

export type DaySchedule = {
    closed: boolean;
    open: string;  // 'HH:MM'
    close: string; // 'HH:MM'
};

export type OpeningHoursJson = Record<DayKey, DaySchedule>;

export const DEFAULT_OPENING_HOURS: OpeningHoursJson = {
    mon: { closed: true, open: '21:00', close: '03:00' },
    tue: { closed: true, open: '21:00', close: '03:00' },
    wed: { closed: true, open: '21:00', close: '03:00' },
    thu: { closed: false, open: '21:00', close: '03:00' },
    fri: { closed: false, open: '21:00', close: '04:00' },
    sat: { closed: false, open: '21:00', close: '04:00' },
    sun: { closed: true, open: '21:00', close: '03:00' },
};

export function normalizeOpeningHours(raw: unknown): OpeningHoursJson {
    const base: OpeningHoursJson = JSON.parse(JSON.stringify(DEFAULT_OPENING_HOURS));
    if (!raw || typeof raw !== 'object') return base;
    for (const key of DAY_KEYS) {
        const cell = (raw as Record<string, unknown>)[key];
        if (cell && typeof cell === 'object') {
            const c = cell as Partial<DaySchedule>;
            base[key] = {
                closed: typeof c.closed === 'boolean' ? c.closed : base[key].closed,
                open: typeof c.open === 'string' ? c.open : base[key].open,
                close: typeof c.close === 'string' ? c.close : base[key].close,
            };
        }
    }
    return base;
}

export type DaySpecificAges = Partial<Record<DayKey, number>>;

export function normalizeDaySpecificAges(raw: unknown): DaySpecificAges {
    const out: DaySpecificAges = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const key of DAY_KEYS) {
        const v = (raw as Record<string, unknown>)[key];
        if (typeof v === 'number' && Number.isFinite(v)) {
            out[key] = Math.max(0, Math.round(v));
        } else if (typeof v === 'string' && v.trim()) {
            const n = Number(v);
            if (Number.isFinite(n)) out[key] = Math.max(0, Math.round(n));
        }
    }
    return out;
}

export type VenueProfile = {
    id: string;
    name: string;
    category: VenueCategory | null;
    description: string;
    address: string;
    city_id: string | null;
    email: string;
    phone: string;
    music_genre: string;
    entrance_rules: string;
    default_age_limit: number | null;
    day_specific_ages: DaySpecificAges;
    dress_code: string;
    instagram_handle: string;
    spotify_link: string;
    menu_url: string;
    google_maps_url: string;
    gallery_images: string[];
    opening_hours_json: OpeningHoursJson;
    latitude: number | null;
    longitude: number | null;
};

export type CityRow = { id: string; name: string; country: string | null };

function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
    if (!err) return false;
    if (err.code === '42703') return true;
    if (err.code === 'PGRST204') return true;
    const msg = err.message ?? '';
    if (/column\s+.*does not exist/i.test(msg)) return true;
    if (/could not find the .* column of .* in the schema cache/i.test(msg)) return true;
    return false;
}

function extractMissingColumn(message: string): string | null {
    const pgMatch = message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
    if (pgMatch?.[1]) return pgMatch[1];
    const pgrstMatch = message.match(/could not find the '([a-zA-Z0-9_]+)' column/i);
    if (pgrstMatch?.[1]) return pgrstMatch[1];
    return null;
}

function buildProfile(
    row: Record<string, unknown>,
    fallbackId: string
): VenueProfile {
    return {
        id: typeof row.id === 'string' ? row.id : fallbackId,
        name: typeof row.name === 'string' ? row.name : '',
        category:
            typeof row.category === 'string' && (VENUE_CATEGORIES as string[]).includes(row.category)
                ? (row.category as VenueCategory)
                : null,
        description: typeof row.description === 'string' ? row.description : '',
        address: typeof row.address === 'string' ? row.address : '',
        city_id: typeof row.city_id === 'string' ? row.city_id : null,
        email: typeof row.email === 'string' ? row.email : '',
        phone: typeof row.phone === 'string' ? row.phone : '',
        music_genre: typeof row.music_genre === 'string' ? row.music_genre : '',
        entrance_rules: typeof row.entrance_rules === 'string' ? row.entrance_rules : '',
        default_age_limit:
            typeof row.default_age_limit === 'number' && Number.isFinite(row.default_age_limit)
                ? Math.max(0, Math.round(row.default_age_limit))
                : null,
        day_specific_ages: normalizeDaySpecificAges(row.day_specific_ages),
        dress_code: typeof row.dress_code === 'string' ? row.dress_code : '',
        instagram_handle: typeof row.instagram_handle === 'string' ? row.instagram_handle : '',
        spotify_link: typeof row.spotify_link === 'string' ? row.spotify_link : '',
        menu_url: typeof row.menu_url === 'string' ? row.menu_url : '',
        google_maps_url: typeof row.google_maps_url === 'string' ? row.google_maps_url : '',
        gallery_images: Array.isArray(row.gallery_images)
            ? (row.gallery_images as unknown[]).filter((x): x is string => typeof x === 'string')
            : [],
        opening_hours_json: normalizeOpeningHours(row.opening_hours_json),
        latitude: typeof row.latitude === 'number' ? row.latitude : null,
        longitude: typeof row.longitude === 'number' ? row.longitude : null,
    };
}

const FULL_COLS =
    'id, name, category, description, address, city_id, email, phone, music_genre, entrance_rules, default_age_limit, day_specific_ages, dress_code, instagram_handle, spotify_link, menu_url, google_maps_url, gallery_images, opening_hours_json, latitude, longitude';

export async function fetchVenueProfile(venueId: string): Promise<VenueProfile | null> {
    const first = await supabase.from('venues').select(FULL_COLS).eq('id', venueId).maybeSingle();
    if (!first.error) {
        return first.data ? buildProfile(first.data as Record<string, unknown>, venueId) : null;
    }
    if (!isMissingColumnError(first.error)) {
        console.warn('[venueInfo] fetchVenueProfile', first.error.message);
        return null;
    }
    // Drifted DB: pull * and let buildProfile default any missing columns.
    const wild = await supabase.from('venues').select('*').eq('id', venueId).maybeSingle();
    if (wild.error) {
        console.warn('[venueInfo] fetchVenueProfile wildcard', wild.error.message);
        return null;
    }
    return wild.data ? buildProfile(wild.data as Record<string, unknown>, venueId) : null;
}

/** Patch keys map 1:1 to `venues` columns for a straightforward update. */
export type VenueProfilePatch = {
    name?: string;
    category?: VenueCategory | null;
    description?: string;
    address?: string;
    city_id?: string | null;
    email?: string;
    phone?: string;
    music_genre?: string;
    entrance_rules?: string;
    default_age_limit?: number | null;
    day_specific_ages?: DaySpecificAges;
    dress_code?: string;
    instagram_handle?: string;
    spotify_link?: string;
    menu_url?: string;
    google_maps_url?: string;
    gallery_images?: string[];
    opening_hours_json?: OpeningHoursJson;
    latitude?: number | null;
    longitude?: number | null;
};

function trimOrNull(v: string | undefined): string | null | undefined {
    if (v === undefined) return undefined;
    const trimmed = v.trim();
    return trimmed.length ? trimmed : null;
}

export async function updateVenueProfile(
    venueId: string,
    patch: VenueProfilePatch
): Promise<{ ok: boolean; error?: string; missingColumns?: string[] }> {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name.trim() || null;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.description !== undefined) payload.description = trimOrNull(patch.description);
    if (patch.address !== undefined) payload.address = trimOrNull(patch.address);
    if (patch.city_id !== undefined) payload.city_id = patch.city_id;
    if (patch.email !== undefined) payload.email = trimOrNull(patch.email);
    if (patch.phone !== undefined) payload.phone = trimOrNull(patch.phone);
    if (patch.music_genre !== undefined) payload.music_genre = trimOrNull(patch.music_genre);
    if (patch.entrance_rules !== undefined) payload.entrance_rules = trimOrNull(patch.entrance_rules);
    if (patch.default_age_limit !== undefined) {
        payload.default_age_limit = patch.default_age_limit;
        payload.age_limit = patch.default_age_limit;
    }
    if (patch.day_specific_ages !== undefined) payload.day_specific_ages = patch.day_specific_ages;
    if (patch.dress_code !== undefined) payload.dress_code = trimOrNull(patch.dress_code);
    if (patch.instagram_handle !== undefined) payload.instagram_handle = trimOrNull(patch.instagram_handle);
    if (patch.spotify_link !== undefined) payload.spotify_link = trimOrNull(patch.spotify_link);
    if (patch.menu_url !== undefined) payload.menu_url = trimOrNull(patch.menu_url);
    if (patch.google_maps_url !== undefined) payload.google_maps_url = trimOrNull(patch.google_maps_url);
    if (patch.gallery_images !== undefined) payload.gallery_images = patch.gallery_images;
    if (patch.opening_hours_json !== undefined) payload.opening_hours_json = patch.opening_hours_json;
    if (patch.latitude !== undefined) payload.latitude = patch.latitude;
    if (patch.longitude !== undefined) payload.longitude = patch.longitude;

    const attempt = async (body: Record<string, unknown>) =>
        supabase.from('venues').update(body).eq('id', venueId);

    let res = await attempt(payload);
    const missing: string[] = [];

    // Drop any column the DB rejects as missing and retry until success or empty payload.
    while (res.error && isMissingColumnError(res.error)) {
        const col = extractMissingColumn(res.error.message ?? '');
        if (!col || !(col in payload)) break;
        delete payload[col];
        missing.push(col);
        if (Object.keys(payload).length === 0) {
            return {
                ok: false,
                error:
                    'Your venues table is missing the needed columns. Run the latest migrations, then retry.',
                missingColumns: missing,
            };
        }
        res = await attempt(payload);
    }

    if (res.error) {
        console.warn('[venueInfo] updateVenueProfile', res.error.message);
        return { ok: false, error: res.error.message, missingColumns: missing.length ? missing : undefined };
    }
    return { ok: true, missingColumns: missing.length ? missing : undefined };
}

/** Realtime: same `venues` row as the web portal — keeps Venue Info in sync when Settings saves. */
export function subscribeVenueRowChanges(
    venueId: string,
    onRemoteChange: () => void
): { unsubscribe: () => void } {
    const channel = supabase
        .channel(`venue-row-${venueId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'venues', filter: `id=eq.${venueId}` },
            () => {
                onRemoteChange();
            }
        )
        .subscribe((status, err) => {
            if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                console.warn('[venueInfo] venues realtime', status, err?.message ?? err);
            }
        });
    return {
        unsubscribe: () => {
            void supabase.removeChannel(channel);
        },
    };
}

// ---------------------------------------------------------------------------
// Photo gallery (Supabase Storage: venue-gallery bucket)
// ---------------------------------------------------------------------------

const GALLERY_BUCKET = 'venue-gallery';

function guessExtension(uri: string, mime?: string | null): string {
    if (mime) {
        if (/jpeg|jpg/i.test(mime)) return 'jpg';
        if (/png/i.test(mime)) return 'png';
        if (/webp/i.test(mime)) return 'webp';
        if (/gif/i.test(mime)) return 'gif';
    }
    const m = uri.match(/\.([a-zA-Z0-9]{3,4})(\?|$)/);
    return m ? m[1].toLowerCase() : 'jpg';
}

function mimeFromExt(ext: string): string {
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    return 'image/jpeg';
}

/**
 * Uploads a photo from a local file URI to the venue-gallery bucket and
 * returns its public URL.
 */
export async function uploadVenuePhoto(
    venueId: string,
    fileUri: string,
    mimeHint?: string | null
): Promise<{ ok: boolean; url?: string; storagePath?: string; error?: string }> {
    try {
        const ext = guessExtension(fileUri, mimeHint ?? undefined);
        const contentType = mimeFromExt(ext);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const storagePath = `venues/${venueId}/${fileName}`;

        const resp = await fetch(fileUri);
        const arrayBuffer = await resp.arrayBuffer();

        const { error: upErr } = await supabase.storage
            .from(GALLERY_BUCKET)
            .upload(storagePath, arrayBuffer, {
                contentType,
                upsert: false,
            });

        if (upErr) {
            console.warn('[venueInfo] uploadVenuePhoto', upErr.message);
            return { ok: false, error: upErr.message };
        }

        const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath);
        return { ok: true, url: data.publicUrl, storagePath };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[venueInfo] uploadVenuePhoto exception', msg);
        return { ok: false, error: msg };
    }
}

/** Attempts to parse a venue-gallery storage path from a public URL. */
function storagePathFromPublicUrl(url: string): string | null {
    const marker = `/${GALLERY_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length).split('?')[0];
}

/** Removes a photo from storage. Silent no-op if the URL isn't ours. */
export async function removeVenuePhoto(url: string): Promise<void> {
    const path = storagePathFromPublicUrl(url);
    if (!path) return;
    const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([path]);
    if (error) {
        console.warn('[venueInfo] removeVenuePhoto', error.message);
    }
}

// ---------------------------------------------------------------------------
// Menu PDF (Supabase Storage: venue-menus bucket)
// ---------------------------------------------------------------------------

const MENUS_BUCKET = 'venue-menus';

/** Uploads a PDF file to the venue-menus bucket, returns its public URL. */
export async function uploadVenueMenuPdf(
    venueId: string,
    fileUri: string,
    fileName: string | null | undefined
): Promise<{ ok: boolean; url?: string; storagePath?: string; error?: string }> {
    try {
        const safeName = (fileName ?? 'menu.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_');
        const storagePath = `venues/${venueId}/${Date.now()}-${safeName}`;

        const resp = await fetch(fileUri);
        const arrayBuffer = await resp.arrayBuffer();

        const { error: upErr } = await supabase.storage
            .from(MENUS_BUCKET)
            .upload(storagePath, arrayBuffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (upErr) {
            console.warn('[venueInfo] uploadVenueMenuPdf', upErr.message);
            return { ok: false, error: upErr.message };
        }

        const { data } = supabase.storage.from(MENUS_BUCKET).getPublicUrl(storagePath);
        return { ok: true, url: data.publicUrl, storagePath };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[venueInfo] uploadVenueMenuPdf exception', msg);
        return { ok: false, error: msg };
    }
}

/** Deletes a menu PDF from storage. No-op if URL isn't in the venue-menus bucket. */
export async function removeVenueMenuPdf(url: string): Promise<void> {
    const marker = `/${MENUS_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length).split('?')[0];
    const { error } = await supabase.storage.from(MENUS_BUCKET).remove([path]);
    if (error) {
        console.warn('[venueInfo] removeVenueMenuPdf', error.message);
    }
}

export async function fetchCities(): Promise<CityRow[]> {
    const filtered = await supabase
        .from('cities')
        .select('id, name, country')
        .eq('status', 'active')
        .order('name', { ascending: true });

    if (!filtered.error) {
        return (filtered.data as CityRow[]) ?? [];
    }
    // Drifted DB without cities.status: just list every city.
    if (isMissingColumnError(filtered.error)) {
        const all = await supabase
            .from('cities')
            .select('id, name, country')
            .order('name', { ascending: true });
        if (all.error) {
            console.warn('[venueInfo] fetchCities fallback', all.error.message);
            return [];
        }
        return (all.data as CityRow[]) ?? [];
    }
    console.warn('[venueInfo] fetchCities', filtered.error.message);
    return [];
}
