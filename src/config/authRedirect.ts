/**
 * Base URL Supabase uses in password-recovery emails (`redirectTo`).
 * Defaults to `window.location.origin` so local dev matches the port you actually use.
 * On Railway, set `VITE_AUTH_REDIRECT_BASE=https://your-app.up.railway.app` at build time
 * if it must differ from where the browser loads the app.
 */
export function getAuthRedirectOrigin(): string {
  const fromEnv = import.meta.env.VITE_AUTH_REDIRECT_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Must be allowlisted in Supabase → Authentication → URL configuration. */
export function getPasswordRecoveryRedirectUrl(): string {
  return `${getAuthRedirectOrigin()}/auth/callback`;
}
