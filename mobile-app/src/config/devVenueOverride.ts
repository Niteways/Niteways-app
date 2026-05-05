/**
 * Local testing: when set and __DEV__, the venue portal uses this `venues.id` UUID if normal
 * resolution (profiles.venue_id / owner_id) returns nothing.
 *
 * Remove or set to null before shipping; do not rely on this for production.
 */
export const DEV_OVERRIDE_VENUE_ID: string | null = __DEV__
    ? '3ba0b889-ea51-4375-abc9-d23223bddecb'
    : null;
