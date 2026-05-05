/**
 * Bottom-nav slot customization (Profile → Menu) + runtime labels/icons for VenueMainScreen.
 */

export const VENUE_MENU_STORAGE_KEY = '@venue_owner_menu_slots_v1';

export type VenueMenuSlotId =
    | 'home'
    | 'tables'
    | 'guests'
    | 'check_in'
    | 'requests'
    | 'team'
    | 'settings'
    | 'analytics'
    | 'security'
    | 'ticketing'
    | 'chat';

export type VenueMenuItem = {
    id: VenueMenuSlotId;
    label: string;
    icon: string;
    iconOn: string;
};

/**
 * Bottom-nav / picker options — fixed set of 11 (reference UI order).
 * Icons: outline in lists; iconOn for active tab bar.
 */
export const VENUE_MENU_ITEMS: VenueMenuItem[] = [
    { id: 'home', label: 'Home', icon: 'grid-outline', iconOn: 'grid' },
    { id: 'tables', label: 'Tables', icon: 'calendar-outline', iconOn: 'calendar' },
    { id: 'guests', label: 'Guests', icon: 'people-outline', iconOn: 'people' },
    { id: 'check_in', label: 'Check In', icon: 'qr-code-outline', iconOn: 'qr-code' },
    { id: 'requests', label: 'Requests', icon: 'document-text-outline', iconOn: 'document-text' },
    { id: 'team', label: 'Team', icon: 'person-outline', iconOn: 'person' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline', iconOn: 'settings' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', iconOn: 'bar-chart' },
    { id: 'security', label: 'Security', icon: 'shield-outline', iconOn: 'shield' },
    { id: 'ticketing', label: 'Tickets', icon: 'ticket-outline', iconOn: 'ticket' },
    { id: 'chat', label: 'Chat', icon: 'chatbubble-outline', iconOn: 'chatbubble' },
];

export const DEFAULT_MENU_SLOTS: VenueMenuSlotId[] = ['guests', 'requests', 'ticketing', 'team'];

const LEGACY_ID_MAP: Record<string, VenueMenuSlotId> = {
    dashboard: 'home',
    bookings: 'tables',
    tickets: 'ticketing',
};

export function getVenueMenuItem(id: string): VenueMenuItem | undefined {
    return VENUE_MENU_ITEMS.find((x) => x.id === id);
}

export function normalizeMenuSlots(raw: unknown): VenueMenuSlotId[] {
    if (!Array.isArray(raw) || raw.length !== 4) {
        return [...DEFAULT_MENU_SLOTS];
    }
    const allowed = new Set(VENUE_MENU_ITEMS.map((x) => x.id));
    return raw.map((cell) => {
        let id = String(cell ?? '');
        if (LEGACY_ID_MAP[id]) id = LEGACY_ID_MAP[id];
        return (allowed.has(id as VenueMenuSlotId) ? id : 'guests') as VenueMenuSlotId;
    }) as VenueMenuSlotId[];
}
