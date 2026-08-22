// Mirrors OfficeController::DEFAULT_SHIFT_CONFIG / resolveShiftConfig() on
// the backend - keep both in sync. A hospital with no shift config set
// (day_shift_start etc. all null) uses these app-wide defaults, which match
// what used to be hardcoded everywhere shift windows/late/early logic lives.
export const DEFAULT_SHIFT_CONFIG = {
  day_shift_start: '07:00',
  day_shift_end: '19:00',
  day_late_grace_minutes: 30,
  day_early_grace_minutes: 120,
  night_shift_start: '19:00',
  night_shift_end: '07:00',
  night_late_grace_minutes: 30,
  night_early_grace_minutes: 120,
};

export type ShiftConfig = typeof DEFAULT_SHIFT_CONFIG;

/** The subset of a Hospital record relevant to shift config - all nullable overrides. */
export type HospitalShiftFields = {
  day_shift_start?: string | null;
  day_shift_end?: string | null;
  day_late_grace_minutes?: number | null;
  day_early_grace_minutes?: number | null;
  night_shift_start?: string | null;
  night_shift_end?: string | null;
  night_late_grace_minutes?: number | null;
  night_early_grace_minutes?: number | null;
};

/** Merge a hospital's own overrides over the defaults - null/undefined fields keep the default. */
export function resolveShiftConfig(hospital?: HospitalShiftFields | null): ShiftConfig {
  const config: ShiftConfig = { ...DEFAULT_SHIFT_CONFIG };
  if (!hospital) return config;
  (Object.keys(DEFAULT_SHIFT_CONFIG) as (keyof ShiftConfig)[]).forEach((key) => {
    const v = hospital[key];
    if (v !== null && v !== undefined) {
      (config as any)[key] = v;
    }
  });
  return config;
}

/** "HH:mm" -> minutes since midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export type DerivedShiftWindow = {
  shift: 'Morning' | 'Evening';
  state: 'IN' | 'OUT';
  isLate: boolean;
  isEarlyOut: boolean;
  /** True in a dawn/dusk changeover window, where the other shift+state combo is equally valid. */
  canToggle: boolean;
};

/**
 * Splits the day into the same 6 back-to-back windows mark-attendance.tsx
 * has always used (two ambiguous changeover windows at dawn/dusk, plus a
 * late-arrival and early-departure window for each shift), but derives every
 * boundary from the given shift config instead of the hardcoded
 * 5/7/12/17/19 hours this used to be pinned to - so a hospital with its own
 * configured times gets its own windows.
 *
 * The two "changeover" windows are exactly the tail end of the OTHER shift's
 * on-time-departure grace (e.g. dawn changeover = the last
 * night_early_grace_minutes before day_shift_start) - on-time arrival for
 * one shift and on-time-but-early departure for the other look the same
 * from a single photo, hence the toggle. The late/early split within a
 * shift's own working hours is the midpoint between its start and its own
 * early-departure window - not a precise grace-minute boundary (the backend
 * is the source of truth for the real present/late status; this is only a
 * best-guess default for which action a supervisor most likely wants).
 */
export function deriveShiftWindow(now: Date, config: ShiftConfig): DerivedShiftWindow {
  const rawNow = now.getHours() * 60 + now.getMinutes();

  const dayStart = timeToMinutes(config.day_shift_start);
  const dayEnd = timeToMinutes(config.day_shift_end);
  const dayOutWindowStart = dayEnd - config.day_early_grace_minutes;
  const dayMidpoint = (dayStart + dayOutWindowStart) / 2;

  const nightStart = timeToMinutes(config.night_shift_start);
  const nightEndRaw = timeToMinutes(config.night_shift_end);
  // Night shift normally wraps past midnight (e.g. 19:00 -> 07:00) - push
  // its end (and everything compared against it) into an extended
  // "minutes since night_start" space so the math stays monotonic.
  const nightEnd = nightEndRaw <= nightStart ? nightEndRaw + 1440 : nightEndRaw;
  const nightOutWindowStart = nightEnd - config.night_early_grace_minutes;
  const nightMidpoint = (nightStart + nightOutWindowStart) / 2;
  const nightNow = rawNow < nightStart ? rawNow + 1440 : rawNow;

  // Dawn changeover: the tail of the night shift's on-time-departure
  // window, wrapped back to a normal 0-1439 clock value, up to day start.
  const dawnChangeoverStart = ((nightOutWindowStart % 1440) + 1440) % 1440;

  if (dawnChangeoverStart <= rawNow && rawNow < dayStart) {
    return { shift: 'Morning', state: 'IN', isLate: false, isEarlyOut: false, canToggle: true };
  }
  if (dayStart <= rawNow && rawNow < dayMidpoint) {
    return { shift: 'Morning', state: 'IN', isLate: true, isEarlyOut: false, canToggle: false };
  }
  if (dayMidpoint <= rawNow && rawNow < dayOutWindowStart) {
    return { shift: 'Morning', state: 'OUT', isLate: false, isEarlyOut: true, canToggle: false };
  }
  if (dayOutWindowStart <= rawNow && rawNow < nightStart) {
    return { shift: 'Evening', state: 'IN', isLate: false, isEarlyOut: false, canToggle: true };
  }
  if (nightStart <= nightNow && nightNow < nightMidpoint) {
    return { shift: 'Evening', state: 'IN', isLate: true, isEarlyOut: false, canToggle: false };
  }
  // Everything else falls in the night shift's early-departure window,
  // including the wrap back around past midnight to dawnChangeoverStart.
  return { shift: 'Evening', state: 'OUT', isLate: false, isEarlyOut: true, canToggle: false };
}

/** Minutes since midnight (may be negative or >=1440 mid-calculation) -> "6:00AM" style clock string. */
function fmtClock(totalMinutes: number): string {
  const m = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')}${ampm}`;
}

/** A single row's plain-English window + which shift/state tapping the toggle button in it picks. */
export type ShiftWindowRow = { range: string; toggle: string };

export type ShiftWindowSummary = {
  shiftWindow: string;
  shiftBegins: string;
  onTimeIn: ShiftWindowRow;
  lateIn: ShiftWindowRow;
  shiftEnds: string;
  onTimeOut: ShiftWindowRow;
  earlyOut: ShiftWindowRow;
};

/**
 * Same 6-window boundaries as deriveShiftWindow(), but as plain-English
 * clock ranges for both Morning(Day) and Evening(Night) - lets an admin see
 * exactly what a set of Start/End/Late-grace/Early-grace numbers actually
 * mean in real clock time, instead of having to do the arithmetic in their
 * head. "Shift begins"/"Shift ends" are the midpoint of the on-time-IN
 * window and the last minute before on-time-OUT begins, respectively - the
 * same descriptive anchors this shift model has always implied, not
 * separate configurable values.
 */
export function computeShiftWindowSummaries(config: ShiftConfig): { day: ShiftWindowSummary; night: ShiftWindowSummary } {
  const dayStart = timeToMinutes(config.day_shift_start);
  const dayEnd = timeToMinutes(config.day_shift_end);
  const dayOutStart = dayEnd - config.day_early_grace_minutes;
  const dayMid = (dayStart + dayOutStart) / 2;

  const nightStart = timeToMinutes(config.night_shift_start);
  const nightEndRaw = timeToMinutes(config.night_shift_end);
  const nightEnd = nightEndRaw <= nightStart ? nightEndRaw + 1440 : nightEndRaw;
  const nightOutStart = nightEnd - config.night_early_grace_minutes;
  const nightMid = (nightStart + nightOutStart) / 2;
  const dawnChangeoverStart = ((nightOutStart % 1440) + 1440) % 1440;

  const dayBegins = (dawnChangeoverStart + dayStart) / 2;
  const nightBegins = (dayOutStart + nightStart) / 2;

  const day: ShiftWindowSummary = {
    shiftWindow: `${fmtClock(dayBegins)} - ${fmtClock(dayOutStart - 1)}`,
    shiftBegins: fmtClock(dayBegins),
    onTimeIn: { range: `${fmtClock(dawnChangeoverStart)} - ${fmtClock(dayStart - 1)}`, toggle: 'Day IN/Night OUT' },
    lateIn: { range: `${fmtClock(dayStart)} - ${fmtClock(dayMid - 1)}`, toggle: 'Day IN' },
    shiftEnds: fmtClock(dayOutStart - 1),
    onTimeOut: { range: `${fmtClock(dayOutStart)} - ${fmtClock(nightStart - 1)}`, toggle: 'Night IN/Day OUT' },
    earlyOut: { range: `${fmtClock(dayMid)} - ${fmtClock(dayOutStart - 1)}`, toggle: 'Day OUT' },
  };

  const night: ShiftWindowSummary = {
    shiftWindow: `${fmtClock(nightBegins)} - ${fmtClock(nightOutStart - 1)}`,
    shiftBegins: fmtClock(nightBegins),
    // Night's on-time IN is the exact same dusk-changeover window as Day's
    // on-time OUT (Day OUT and Night IN look identical in one photo, hence
    // the toggle); Night's on-time OUT mirrors Day's on-time IN the same way
    // at dawn.
    onTimeIn: { range: `${fmtClock(dayOutStart)} - ${fmtClock(nightStart - 1)}`, toggle: 'Day IN/Night OUT' },
    lateIn: { range: `${fmtClock(nightStart)} - ${fmtClock(nightMid - 1)}`, toggle: 'Night IN' },
    shiftEnds: fmtClock(nightOutStart - 1),
    onTimeOut: { range: `${fmtClock(dawnChangeoverStart)} - ${fmtClock(dayStart - 1)}`, toggle: 'Night IN/Day OUT' },
    earlyOut: { range: `${fmtClock(nightMid)} - ${fmtClock(nightOutStart - 1)}`, toggle: 'Night OUT' },
  };

  return { day, night };
}
