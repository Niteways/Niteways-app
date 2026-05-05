// Shared mock events used by both EventsScreen and InteractiveMapScreen.
// Coordinates are set to the venue's real-world location so they appear
// on the map. Events that share a venue are given slight offsets so they
// don't stack exactly on top of each other.

export interface MapEvent {
    id: string;
    name: string;
    venue: string;
    city: string;
    date: string;
    time: string;
    category: string;
    price: number;
    featured?: boolean;
    image: string;
    latitude: number;
    longitude: number;
}

export const MOCK_MAP_EVENTS: MapEvent[] = [
    // ── Barcelona ─────────────────────────────────────────────────────────────
    {
        id: 'e1',
        name: 'Robin Kadin – The Comeback',
        venue: 'Spy Bar',
        city: 'Barcelona',
        date: '2026-03-26',
        time: '00:00 - 05:00',
        category: 'Hip Hop',
        price: 40,
        featured: true,
        image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        latitude: 41.3860,   // Near Pacha / Barceloneta area
        longitude: 2.1958,
    },
    {
        id: 'e2',
        name: 'Reggaeton Nights',
        venue: 'Opium Barcelona',
        city: 'Barcelona',
        date: '2026-04-15',
        time: '23:30 - 05:00',
        category: 'Reggaeton',
        price: 20,
        image: 'https://exoduslasvegas.com/wp-content/uploads/2021/06/4.-image-2.jpg',
        latitude: 41.3858,   // Opium — slight offset from Pacha
        longitude: 2.1975,
    },
    {
        id: 'e3',
        name: 'Electronic Fiesta',
        venue: 'Razzmatazz',
        city: 'Barcelona',
        date: '2026-04-20',
        time: '22:00 - 06:00',
        category: 'Techno',
        price: 25,
        image: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80',
        latitude: 41.3980,   // Razzmatazz (Poblenou)
        longitude: 2.1915,
    },

    // ── London ────────────────────────────────────────────────────────────────
    {
        id: 'e4',
        name: 'Fabric All-Nighter',
        venue: 'Fabric',
        city: 'London',
        date: '2026-04-14',
        time: '22:00 - 08:00',
        category: 'Techno',
        price: 20,
        image: 'https://i.pinimg.com/originals/a3/24/6f/a3246f2e863d7086077c3d969b5810b7.jpg',
        latitude: 51.5199,   // Fabric — Farringdon
        longitude: -0.1028,
    },
    {
        id: 'e5',
        name: 'House Nation',
        venue: 'Ministry of Sound',
        city: 'London',
        date: '2026-04-15',
        time: '22:00 - 06:00',
        category: 'House',
        price: 25,
        image: 'https://tse3.mm.bing.net/th/id/OIP.kWCpsVGRd3kzV2l77gFTEQHaEv?pid=ImgDet&w=194&h=123&c=7&dpr=1.7&o=7&rm=3',
        latitude: 51.4983,   // Ministry of Sound
        longitude: -0.0998,
    },
    {
        id: 'e6',
        name: 'Warehouse Rave',
        venue: 'Printworks',
        city: 'London',
        date: '2026-05-02',
        time: '14:00 - 22:00',
        category: 'Techno',
        price: 30,
        image: 'https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?w=800&q=80',
        latitude: 51.4978,   // Printworks — Canada Water
        longitude: -0.0440,
    },

    // ── Los Angeles ───────────────────────────────────────────────────────────
    {
        id: 'e7',
        name: 'Hollywood Takeover',
        venue: 'Academy LA',
        city: 'Los Angeles',
        date: '2026-04-14',
        time: '22:00 - 04:00',
        category: 'EDM',
        price: 35,
        featured: true,
        image: 'https://www.caesars.com/content/scaffold_pages/generic/caesars/clv/en/omnia-nightclub/_jcr_content/cards/card/image.stdimg.hd.xl.jpg/1662499996799.jpg',
        latitude: 34.1020,   // Academy LA — Hollywood
        longitude: -118.3286,
    },
    {
        id: 'e8',
        name: 'Downtown Vibes',
        venue: 'Exchange LA',
        city: 'Los Angeles',
        date: '2026-04-15',
        time: '21:00 - 03:00',
        category: 'House',
        price: 30,
        image: 'https://taogroup.com/wp-content/uploads/2022/07/Omnia_SteveAoki_SammyDean_07.01.22.Highres-75-970x647.jpg',
        latitude: 34.0457,   // Exchange LA — DTLA
        longitude: -118.2508,
    },
    {
        id: 'e9',
        name: 'Deep Sessions LA',
        venue: 'Sound Nightclub',
        city: 'Los Angeles',
        date: '2026-05-01',
        time: '22:00 - 04:00',
        category: 'House',
        price: 25,
        image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80',
        latitude: 34.1013,   // Sound Nightclub
        longitude: -118.3303,
    },

    // ── Miami ─────────────────────────────────────────────────────────────────
    {
        id: 'e10',
        name: 'Miami Vice Night',
        venue: 'LIV Miami',
        city: 'Miami',
        date: '2026-04-14',
        time: '23:00 - 06:00',
        category: 'Hip Hop',
        price: 50,
        featured: true,
        image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80',
        latitude: 25.8177,   // LIV — Fontainebleau
        longitude: -80.1227,
    },
    {
        id: 'e11',
        name: 'Ultra White Party',
        venue: 'E11EVEN Miami',
        city: 'Miami',
        date: '2026-04-15',
        time: '00:00 - 08:00',
        category: 'EDM',
        price: 45,
        featured: true,
        image: 'https://clubbookers.com/wp-content/uploads/2023/01/2-7.jpg',
        latitude: 25.7847,   // E11EVEN — Downtown Miami
        longitude: -80.1921,
    },
    {
        id: 'e12',
        name: 'Beach House Sessions',
        venue: 'Story Miami',
        city: 'Miami',
        date: '2026-05-03',
        time: '22:00 - 05:00',
        category: 'House',
        price: 35,
        image: 'https://images.unsplash.com/photo-1545128485-c400e77d2758?w=800&q=80',
        latitude: 25.7683,   // Story Miami — South Beach
        longitude: -80.1323,
    },
];
