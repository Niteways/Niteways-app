/** Human-readable message for Supabase/PostgREST errors (includes details/hint when present). */
export function formatSupabaseError(err: unknown): string {
    if (err == null) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) {
        const e = err as Error & { details?: string; hint?: string; code?: string };
        let s = e.message || 'Request failed';
        if (e.details) s += `\n\n${e.details}`;
        if (e.hint) s += `\n\nHint: ${e.hint}`;
        if (e.code) s += ` (${e.code})`;
        return s;
    }
    if (typeof err === 'object') {
        const o = err as { message?: string; details?: string; hint?: string; code?: string };
        const parts = [o.message, o.details, o.hint].filter(Boolean);
        if (parts.length) return parts.join('\n\n');
    }
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

/**
 * PostgREST PGRST205 / schema-cache message: table not exposed — avoid `console.warn` (RN LogBox).
 */
export function isMissingSchemaTableError(err: unknown): boolean {
    if (err == null || typeof err !== 'object') return false;
    const o = err as { code?: string; message?: string };
    if (o.code === 'PGRST205') return true;
    const m = String(o.message || '');
    return /Could not find the table .+ in the schema cache/i.test(m);
}
