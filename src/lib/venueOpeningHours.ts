/**
 * Per-day opening hours shape — kept in sync with
 * `mobile-app/src/services/venueInfo.ts` and `venues.opening_hours_json`.
 */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Short labels for portal / admin UI */
export const DAY_KEY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type DaySchedule = {
  closed: boolean;
  open: string;
  close: string;
};

export type OpeningHoursJson = Record<DayKey, DaySchedule>;

export const DEFAULT_OPENING_HOURS: OpeningHoursJson = {
  mon: { closed: true, open: "21:00", close: "03:00" },
  tue: { closed: true, open: "21:00", close: "03:00" },
  wed: { closed: true, open: "21:00", close: "03:00" },
  thu: { closed: false, open: "21:00", close: "03:00" },
  fri: { closed: false, open: "21:00", close: "04:00" },
  sat: { closed: false, open: "21:00", close: "04:00" },
  sun: { closed: true, open: "21:00", close: "03:00" },
};

function coerceOpeningHoursJsonObject(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function coerceDayClosed(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "false" || s === "0" || s === "no") return false;
    if (s === "true" || s === "1" || s === "yes") return true;
  }
  return fallback;
}

/**
 * Always emits all seven keys for JSONB REPLACE. Partial objects have caused weekday toggles
 * (e.g. Wednesday) to stick as defaults after save when a day key was missing from the payload.
 */
export function materializeOpeningHoursJsonForPersist(h: OpeningHoursJson): OpeningHoursJson {
  const out = {} as OpeningHoursJson;
  for (const k of DAY_KEYS) {
    const cell = h[k];
    const d = DEFAULT_OPENING_HOURS[k];
    const src = cell && typeof cell === "object" ? cell : d;
    out[k] = {
      closed: coerceDayClosed(src.closed, d.closed),
      open: typeof src.open === "string" ? src.open : d.open,
      close: typeof src.close === "string" ? src.close : d.close,
    };
  }
  return out;
}

/** Keys match `VenueInformation` state (`day.toLowerCase()` on English weekday names). */
export const UI_DAY_TO_DAY_KEY: Record<string, DayKey> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

const UI_DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DaySpecificHoursForUi = { open: string; close: string };

export function jsonToUiOpeningHours(json: OpeningHoursJson): Record<string, DaySpecificHoursForUi> {
  const out: Record<string, DaySpecificHoursForUi> = {};
  for (const ui of UI_DAY_ORDER) {
    const dk = UI_DAY_TO_DAY_KEY[ui];
    out[ui] = { open: json[dk].open, close: json[dk].close };
  }
  return out;
}

const FULL_DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function deriveOpeningDayLabelsFromJson(json: OpeningHoursJson): string[] {
  return FULL_DAY_LABELS.filter((label) => {
    const k = UI_DAY_TO_DAY_KEY[label.toLowerCase()];
    return k ? !json[k].closed : false;
  }) as string[];
}

/** One token from `venues.opening_days` — full English name or common abbreviation (e.g. Wed). */
export function openingDayTokenToDayKey(token: string): DayKey | null {
  const raw = token.trim().toLowerCase();
  if (!raw) return null;
  const full = UI_DAY_TO_DAY_KEY[raw];
  if (full) return full;

  const abbrevs: Record<string, DayKey> = {
    mon: "mon",
    tue: "tue",
    tues: "tue",
    wed: "wed",
    weds: "wed",
    thu: "thu",
    thur: "thu",
    thurs: "thu",
    fri: "fri",
    sat: "sat",
    sun: "sun",
  };
  return abbrevs[raw] ?? null;
}

function resolveJsonCellDayKey(rawKey: string): DayKey | null {
  const k = rawKey.trim().toLowerCase();
  if ((DAY_KEYS as readonly string[]).includes(k)) return k as DayKey;
  return openingDayTokenToDayKey(k);
}

export function normalizeOpeningHours(raw: unknown): OpeningHoursJson {
  const base: OpeningHoursJson = JSON.parse(JSON.stringify(DEFAULT_OPENING_HOURS));
  const obj = coerceOpeningHoursJsonObject(raw);
  if (!obj) return base;

  for (const [rawKey, val] of Object.entries(obj)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const dk = resolveJsonCellDayKey(rawKey);
    if (!dk) continue;
    const c = val as Partial<DaySchedule>;
    base[dk] = {
      closed: coerceDayClosed(c.closed, base[dk].closed),
      open: typeof c.open === "string" ? c.open : base[dk].open,
      close: typeof c.close === "string" ? c.close : base[dk].close,
    };
  }
  return base;
}

/**
 * @deprecated Do not use on read paths — stale `opening_days` can contradict `opening_hours_json`
 * and falsely flip days open. Prefer `normalizeOpeningHours(row.opening_hours_json)` only.
 * Kept for rare one-off data migrations / scripts.
 */
export function mergeOpeningDaysCsvIntoJson(
  json: OpeningHoursJson,
  openingDaysCsv: unknown,
): OpeningHoursJson {
  if (typeof openingDaysCsv !== "string") return json;
  const parts = openingDaysCsv
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return json;
  const next: OpeningHoursJson = JSON.parse(JSON.stringify(json));
  for (const label of parts) {
    const dk = openingDayTokenToDayKey(label);
    if (dk) next[dk] = { ...next[dk], closed: false };
  }
  return next;
}

export function openingHoursJsonToOpeningDaysCsv(json: OpeningHoursJson): string {
  return deriveOpeningDayLabelsFromJson(json).join(", ");
}

/** Build `opening_hours_json` from portal UI state (English labels + `openingHours` map). */
export function uiOpeningStateToJson(
  openingDayLabels: string[],
  openingHours: Record<string, DaySpecificHoursForUi>,
): OpeningHoursJson {
  const out = normalizeOpeningHours(null);
  for (const dk of DAY_KEYS) {
    out[dk] = { ...out[dk], closed: true };
  }
  for (const label of openingDayLabels) {
    const dk = UI_DAY_TO_DAY_KEY[label.toLowerCase()] ?? openingDayTokenToDayKey(label);
    if (!dk) continue;
    const h = openingHours[label.toLowerCase()];
    out[dk] = {
      closed: false,
      open: typeof h?.open === "string" ? h.open : out[dk].open,
      close: typeof h?.close === "string" ? h.close : out[dk].close,
    };
  }
  return out;
}
