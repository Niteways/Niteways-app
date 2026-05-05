/** Static floor layout matching venue Table Booking reference (positions in % of map box). */

export type FloorTableVisual =
    | 'available'
    | 'reserved'
    | 'pending'
    | 'blocked'
    | 'vip'
    | 'yellow'
    | 'pink'
    | 'teal'
    | 'purple'
    | 'green'
    | 'red'
    | 'blue';

export type VenueFloorTable = {
    id: string;
    label: string;
    pax: number;
    price: number;
    x: number;
    y: number;
    w: number;
    h: number;
    visual: FloorTableVisual;
};

export type VenueFloorLandmark = {
    id: string;
    label: string;
    icon: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

/** Empty until venue_tables / floor plan is wired from Supabase */
export const VENUE_FLOOR_MAP_TABLES: VenueFloorTable[] = [];

export const VENUE_FLOOR_MAP_LANDMARKS: VenueFloorLandmark[] = [
    { id: 'dj', label: 'DJ', icon: 'musical-notes', x: 50, y: 38, w: 22, h: 10 },
    { id: 'bar', label: 'Bar', icon: 'mic-outline', x: 50, y: 72, w: 52, h: 10 },
    { id: 'entry', label: 'Entry', icon: 'log-in-outline', x: 88, y: 88, w: 18, h: 9 },
];
