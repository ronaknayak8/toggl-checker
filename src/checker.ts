import { TimeEntry } from "./togglClient";
import { toZonedTime } from "date-fns-tz";



/**
 * Returns true if the description is invalid—
 * i.e., it’s neither a 3‑digit code nor contains an allowed keyword.
 */


 export function isNameInvalid(description: string): boolean {
  const name = description.trim();
  const threeDigitRegex = /^\d{3}$/;
  if (threeDigitRegex.test(name)) return false;

  const lower = name.toLowerCase();

  // Rule: any entry containing the word "reply" is OK
  if (lower.includes("reply")) return false;

  // Rule: any entry containing both "review" and "notification" (in any order) is OK
  if (/\breview\b/.test(name) && /\bnotifications?\b/.test(name)) {
    return false;
  }

  // Otherwise it’s invalid
  return true;
}







// — Rule #2: Too Much Logged Time — 
// Returns true if total duration > 7.5 hours (27 000 seconds)
export function isOverHours(entries: TimeEntry[], maxSeconds = 7.5 * 3600): boolean {
  const total = entries.reduce((sum, e) => sum + e.duration, 0);
  return total > maxSeconds;
}

// — Rule #3: Unusual Time Slots — 
// Returns entries whose start time in PDT falls in forbidden windows
export function findUnusualSlots(entries: TimeEntry[]): TimeEntry[] {
  const tz = "America/Los_Angeles";
  return entries.filter(e => {
    const local = toZonedTime(e.start, tz);
    const h = local.getHours();
    const m = local.getMinutes();
    const mins = h * 60 + m;
    // 11:15–11:45 → (11*60+15)=675 to (11*60+45)=705
    // 16:15–16:45 → 975 to 1005
    // after 19:30    → 19*60+30 = 1170
    return (
      (mins >= 675 && mins <= 705) ||
      (mins >= 975 && mins <= 1005) ||
      mins >= 1170
    );
  });
}













export interface Conflict {
  entry: TimeEntry;
  conflictsWith: TimeEntry[];
}

/**
 * Given a list of entries (all from the same project/day),
 * returns a list of Conflict objects for any that overlap.
 */
export function findConflicts(entries: TimeEntry[]): Conflict[] {
  // 1. Map to include computed start/end times
  const withBounds = entries
    .map(e => {
      const startMs = new Date(e.start).getTime();
      const endMs   = startMs + e.duration * 1000;
      return { e, startMs, endMs };
    })
    .sort((a, b) => a.startMs - b.startMs);

  const conflicts: Conflict[] = [];

  // 2. Sweep through and detect overlaps
  for (let i = 1; i < withBounds.length; i++) {
    const prev = withBounds[i - 1];
    const curr = withBounds[i];

    // If current starts before previous ends → conflict
    if (curr.startMs < prev.endMs) {
      // Record conflict for both entries
      const prevConflict = conflicts.find(c => c.entry.id === prev.e.id)
        || { entry: prev.e, conflictsWith: [] };
      prevConflict.conflictsWith.push(curr.e);
      if (!conflicts.includes(prevConflict)) conflicts.push(prevConflict);

      const currConflict = conflicts.find(c => c.entry.id === curr.e.id)
        || { entry: curr.e, conflictsWith: [] };
      currConflict.conflictsWith.push(prev.e);
      if (!conflicts.includes(currConflict)) conflicts.push(currConflict);
    }
  }

  return conflicts;
}

