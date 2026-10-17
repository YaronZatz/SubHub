// Helpers for showing a listing's availability as "1 Nov → 31 Jan" plus a
// small six-month timeline bar.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WINDOW_MONTHS = 6;

function parseIso(value?: string): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateRange(start: string | undefined, end: string | undefined, locale: string): string | null {
  const s = parseIso(start);
  const e = parseIso(end);
  if (!s && !e) return null;
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  // Arrows aren't mirrored by the bidi algorithm, so right-to-left text needs ← to read "from → to".
  const arrow = /^(he|ar|fa)(-|$)/.test(locale) ? '←' : '→';
  if (s && e) return `${fmt.format(s)} ${arrow} ${fmt.format(e)}`;
  return s ? `${fmt.format(s)} ${arrow}` : `${arrow} ${fmt.format(e!)}`;
}

export interface TimelineWindow {
  months: string[];
  /** Percent offsets within the window, clamped to [0, 100]. */
  left: number;
  width: number;
}

/** Position of [start, end] inside a six-month window starting this month. */
export function timelineWindow(start: string | undefined, end: string | undefined, locale: string, now = new Date()): TimelineWindow | null {
  const s = parseIso(start);
  if (!s) return null;
  const e = parseIso(end);
  const windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + WINDOW_MONTHS, 1);
  const span = windowEnd.getTime() - windowStart.getTime();
  const clamp = (t: number) => Math.min(100, Math.max(0, ((t - windowStart.getTime()) / span) * 100));
  const left = clamp(s.getTime());
  const right = e ? clamp(e.getTime()) : 100;
  if (right <= left) return null;

  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short' });
  const months = Array.from({ length: WINDOW_MONTHS }, (_, i) =>
    monthFmt.format(new Date(now.getFullYear(), now.getMonth() + i, 1)),
  );
  return { months, left, width: right - left };
}
