/**
 * Dashboard Quick Actions — user-customizable 6-slot grid.
 * Wired to VenueSettingsScreen > Quick Actions tab and VenueDashboardTab.
 */

export const VENUE_QUICK_ACTIONS_STORAGE_KEY = '@venue_owner_quick_actions_v1';

export type VenueQuickActionId =
    | 'new_booking'
    | 'add_guest'
    | 'scan_qr'
    | 'requests'
    | 'tickets'
    | 'team'
    | 'settings'
    | 'analytics'
    | 'security'
    | 'dashboard';

export type VenueQuickActionItem = {
    id: VenueQuickActionId;
    label: string;
    icon: string;
    /** Dashboard navigation target consumed by VenueMainScreen */
    nav:
        | 'bookings'
        | 'guests'
        | 'bookings_pending'
        | 'tickets'
        | 'team'
        | 'scan_qr'
        | 'settings'
        | 'analytics'
        | 'security'
        | 'dashboard';
};

/** Full 10-item option set for each Action slot picker. */
export const VENUE_QUICK_ACTION_ITEMS: VenueQuickActionItem[] = [
    { id: 'new_booking', label: 'New Booking', icon: 'calendar-outline', nav: 'bookings' },
    { id: 'add_guest', label: 'Add Guest', icon: 'person-add-outline', nav: 'guests' },
    { id: 'scan_qr', label: 'Scan QR', icon: 'qr-code-outline', nav: 'scan_qr' },
    { id: 'requests', label: 'Requests', icon: 'clipboard-outline', nav: 'bookings_pending' },
    { id: 'tickets', label: 'Tickets', icon: 'sparkles-outline', nav: 'tickets' },
    { id: 'team', label: 'Team', icon: 'people-outline', nav: 'team' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline', nav: 'settings' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', nav: 'analytics' },
    { id: 'security', label: 'Security', icon: 'shield-outline', nav: 'security' },
    { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', nav: 'dashboard' },
];

/** First two actions match the existing yellow / teal accent from the dashboard mock. */
export const DEFAULT_QUICK_ACTION_SLOTS: VenueQuickActionId[] = [
    'new_booking',
    'add_guest',
    'scan_qr',
    'requests',
    'tickets',
    'team',
];

export function getVenueQuickActionItem(id: string): VenueQuickActionItem | undefined {
    return VENUE_QUICK_ACTION_ITEMS.find((x) => x.id === id);
}

/** Ensure stored slots are length-6, known IDs, and de-duplicated (falling back to defaults). */
export function normalizeQuickActionSlots(raw: unknown): VenueQuickActionId[] {
    if (!Array.isArray(raw)) return [...DEFAULT_QUICK_ACTION_SLOTS];
    const allowed = new Set<VenueQuickActionId>(
        VENUE_QUICK_ACTION_ITEMS.map((x) => x.id)
    );
    const seen = new Set<VenueQuickActionId>();
    const out: VenueQuickActionId[] = [];
    for (const cell of raw) {
        const id = String(cell ?? '') as VenueQuickActionId;
        if (allowed.has(id) && !seen.has(id)) {
            out.push(id);
            seen.add(id);
        }
        if (out.length >= 6) break;
    }
    if (out.length < 6) {
        for (const d of DEFAULT_QUICK_ACTION_SLOTS) {
            if (!seen.has(d)) {
                out.push(d);
                seen.add(d);
                if (out.length >= 6) break;
            }
        }
    }
    return out.slice(0, 6);
}
