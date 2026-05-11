/**
 * Per-day opening hours shape — kept in sync with
 * `mobile-app/src/services/venueInfo.ts` and `venues.opening_hours_json`.
 */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

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

export function normalizeOpeningHours(raw: unknown): OpeningHoursJson {
  const base: OpeningHoursJson = JSON.parse(JSON.stringify(DEFAULT_OPENING_HOURS));
  if (!raw || typeof raw !== "object") return base;
  for (const key of DAY_KEYS) {
    const cell = (raw as Record<string, unknown>)[key];
    if (cell && typeof cell === "object") {
      const c = cell as Partial<DaySchedule>;
      base[key] = {
        closed: typeof c.closed === "boolean" ? c.closed : base[key].closed,
        open: typeof c.open === "string" ? c.open : base[key].open,
        close: typeof c.close === "string" ? c.close : base[key].close,
      };
    }
  }
  return base;
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
    const dk = UI_DAY_TO_DAY_KEY[label.toLowerCase()];
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
