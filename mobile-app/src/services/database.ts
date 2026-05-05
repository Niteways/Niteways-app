import { supabase } from '../config/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface City {
    id: string;
    name: string;
    country: string;
    image_url: string;
    is_active: boolean;
}

export interface Venue {
    id: string;
    name: string;
    description: string;
    city_id: string;
    address: string;
    latitude: number;
    longitude: number;
    image_url: string;
    gallery: string[];
    genre: string[];
    vibe: string[];
    min_age: number;
    dress_code: string;
    opening_hours: any;
    is_active: boolean;
    cities?: City;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    venue_id: string;
    date: string;
    time: string;
    image_url: string;
    ticket_price: number;
    genre: string;
    lineup: string[];
    is_active: boolean;
    venues?: Venue;
}

export interface Booking {
    id: string;
    user_id: string;
    venue_id: string;
    event_id: string;
    booking_type: string;
    status: string;
    guests: number;
    special_requests: string;
    total_amount: number;
    created_at: string;
    venues?: Venue;
    events?: Event;
}

export interface CreateTableBookingInput {
    venue_id: string;
    guest_name: string;
    guest_email?: string | null;
    guest_phone?: string | null;
    table_number: string;
    party_size: number;
    booking_date: string;
    booking_time: string;
    price?: number | null;
    notes?: string | null;
}

export interface TableBooking {
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
}

export interface CreateGuestListEntryInput {
    venue_id: string;
    guest_name: string;
    plus_guests?: number | null;
    list_type?: 'aa' | 'vip' | 'standard' | 'promo';
    event_date: string;
    notes?: string | null;
    added_by?: string | null;
}

export interface GuestListEntry {
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
}

export interface VenueTicket {
    id: string;
    venue_id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    status: 'active' | 'soldout' | 'hidden' | string;
    type: 'regular' | 'special' | string;
    description: string | null;
    active_days: string[] | null;
    specific_dates: string[] | null;
    sort_order: number;
}

export interface CreateTicketPurchaseInput {
    venue_id: string;
    ticket_row_id: string;
    ticket_name: string;
    ticket_price: number;
    guest_name: string;
    guest_email?: string | null;
    event_name: string;
    event_date: string;
    quantity?: number;
}

// ── Cities ─────────────────────────────────────────────────────────────────────

export const getCities = async (): Promise<City[]> => {
    const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data || [];
};

// ── Venues ─────────────────────────────────────────────────────────────────────

export const getVenues = async (cityId?: string): Promise<Venue[]> => {
    let query = supabase
        .from('venues')
        .select('*, cities(name, country)')
        .eq('is_active', true);

    if (cityId) {
        query = query.eq('city_id', cityId);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;
    return data || [];
};

export const getVenueById = async (id: string): Promise<Venue | null> => {
    const { data, error } = await supabase
        .from('venues')
        .select('*, cities(name, country)')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

export const searchVenues = async (query: string): Promise<Venue[]> => {
    const { data, error } = await supabase
        .from('venues')
        .select('*, cities(name, country)')
        .eq('is_active', true)
        .ilike('name', `%${query}%`);

    if (error) throw error;
    return data || [];
};

// ── Events ─────────────────────────────────────────────────────────────────────

export const getEvents = async (venueId?: string): Promise<Event[]> => {
    let query = supabase
        .from('events')
        .select('*, venues(name, image_url, address, city_id, latitude, longitude)')
        .eq('is_active', true);

    if (venueId) {
        query = query.eq('venue_id', venueId);
    }

    const { data, error } = await query.order('date');
    if (error) throw error;
    return data || [];
};

export const getEventById = async (id: string): Promise<Event | null> => {
    const { data, error } = await supabase
        .from('events')
        .select('*, venues(name, image_url, address, latitude, longitude, cities(name, country))')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

// ── Bookings ───────────────────────────────────────────────────────────────────

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
    const { data, error } = await supabase
        .from('bookings')
        .select('*, venues(name, image_url), events(title, date, time)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createBooking = async (booking: Partial<Booking>): Promise<Booking> => {
    const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const generateTableBookingId = (): string => {
    const stamp = Date.now().toString(36).toUpperCase();
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `TB-${stamp}-${suffix}`;
};

export const createTableBooking = async (
    booking: CreateTableBookingInput,
): Promise<TableBooking> => {
    const { data, error } = await supabase
        .from('table_bookings')
        .insert({
            booking_id: generateTableBookingId(),
            venue_id: booking.venue_id,
            guest_name: booking.guest_name,
            guest_email: booking.guest_email ?? null,
            guest_phone: booking.guest_phone ?? null,
            table_number: booking.table_number,
            party_size: booking.party_size,
            booking_date: booking.booking_date,
            booking_time: booking.booking_time,
            status: 'pending',
            price: booking.price ?? 0,
            notes: booking.notes ?? null,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getUserTableBookings = async (email: string): Promise<TableBooking[]> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return [];

    const { data, error } = await supabase
        .from('table_bookings')
        .select('*, venues(name, image_url, address, gallery_images)')
        .eq('guest_email', normalizedEmail)
        .neq('status', 'blocked')
        .order('booking_date', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createGuestListEntry = async (
    entry: CreateGuestListEntryInput,
): Promise<GuestListEntry> => {
    const { data, error } = await supabase
        .from('guest_list_entries')
        .insert({
            venue_id: entry.venue_id,
            guest_name: entry.guest_name,
            plus_guests: entry.plus_guests ?? 0,
            list_type: entry.list_type ?? 'standard',
            event_date: entry.event_date,
            notes: entry.notes ?? null,
            added_by: entry.added_by ?? null,
            status: 'pending',
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const getVenueTicketsForDate = async (
    venueId: string,
    selectedDate: Date,
): Promise<Array<VenueTicket & { available: number; soldOut: boolean }>> => {
    const { data, error } = await supabase
        .from('venue_tickets')
        .select('*')
        .eq('venue_id', venueId)
        .neq('status', 'hidden')
        .order('sort_order');

    if (error) throw error;

    const selectedDateStr = selectedDate.toISOString().slice(0, 10);
    const selectedDay = dayNames[selectedDate.getDay()];

    return ((data || []) as VenueTicket[])
        .filter((ticket) => {
            if (ticket.status === 'soldout') return true;
            if (ticket.type === 'special') {
                return (ticket.specific_dates || []).includes(selectedDateStr);
            }
            const activeDays = ticket.active_days || [];
            return activeDays.length === 0 || activeDays.some((d) => d.toLowerCase() === selectedDay);
        })
        .map((ticket) => {
            const available = Math.max(0, Number(ticket.quantity || 0) - Number(ticket.sold || 0));
            return {
                ...ticket,
                available,
                soldOut: ticket.status === 'soldout' || available <= 0,
            };
        });
};

const generateTicketPurchaseId = (): string => {
    const stamp = Date.now().toString(36).toUpperCase();
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `TP-${stamp}-${suffix}`;
};

export const createTicketPurchase = async (
    input: CreateTicketPurchaseInput,
) => {
    const quantity = input.quantity ?? 1;
    const ticketRef = generateTicketPurchaseId();

    const { data: ticket, error: ticketError } = await supabase
        .from('venue_tickets')
        .select('sold, quantity, status')
        .eq('id', input.ticket_row_id)
        .single();

    if (ticketError) throw ticketError;

    const sold = Number(ticket?.sold || 0);
    const maxQuantity = Number(ticket?.quantity || 0);
    if (ticket?.status === 'soldout' || sold + quantity > maxQuantity) {
        throw new Error('This ticket is sold out.');
    }

    const { data, error } = await supabase
        .from('ticket_purchases')
        .insert({
            ticket_id: ticketRef,
            venue_id: input.venue_id,
            guest_name: input.guest_name,
            guest_email: input.guest_email ?? null,
            event_name: input.event_name,
            event_date: input.event_date,
            ticket_type: input.ticket_name,
            quantity,
            price: input.ticket_price * quantity,
            status: 'active',
        })
        .select()
        .single();

    if (error) throw error;

    const nextSold = sold + quantity;
    const { error: updateError } = await supabase
        .from('venue_tickets')
        .update({
            sold: nextSold,
            status: nextSold >= maxQuantity ? 'soldout' : ticket.status,
        })
        .eq('id', input.ticket_row_id);

    if (updateError) throw updateError;

    return data;
};

// ── Favorites (public.user_favorites — same table as Venue Web Portal) ─────────

export const getUserFavorites = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from('user_favorites')
        .select('venue_id')
        .eq('user_id', userId);

    if (error) throw error;
    return (data || []).map(f => f.venue_id);
};

export const addFavorite = async (userId: string, venueId: string): Promise<void> => {
    const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: userId, venue_id: venueId });

    if (error) throw error;
};

export const removeFavorite = async (userId: string, venueId: string): Promise<void> => {
    const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('venue_id', venueId);

    if (error) throw error;
};

// ── Profile ────────────────────────────────────────────────────────────────────

export const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};

export const updateUserProfile = async (userId: string, updates: any) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};
