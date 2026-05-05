/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VENUE_PORTAL_ONLY?: string;
  readonly VITE_DEPLOY_MODE?: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
