/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VENUE_PORTAL_ONLY?: string;
  readonly VITE_DEPLOY_MODE?: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
  /** Same `venues.id` as the native venue app (e.g. profiles.venue_id for staff). */
  readonly VITE_DEFAULT_VENUE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
