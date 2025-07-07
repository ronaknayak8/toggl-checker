import {
  fetchWorkspaces,
  getThinkGISProjectId,
  fetchTimeEntries,
} from "./togglClient";
import {
  isNameInvalid,
  findConflicts,
  isOverHours,
  findUnusualSlots,
} from "./checker";
import { sendReport, ReportEntry } from "./mailer";









import { subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";











(async () => {
  // 1) Fetch your first workspace
  const workspaces = await fetchWorkspaces();
  const wid = workspaces[0]?.id;
  if (!wid) {
    console.error("No workspace found.");
    return;
  }

  // 2) Fetch the ThinkGIS project ID
  const pid = await getThinkGISProjectId(wid);
  if (!pid) {
    console.error("Project 'ThinkGIS' not found.");
    return;
  }




  // ─── Time window for “yesterday” in PDT ──────────────────────
  const utcNow       = new Date();
  const utcYesterday = subDays(utcNow, 1);

  // ISO date for computing UTC bounds
  const isoDateStr = format(utcYesterday, "yyyy-MM-dd");  // e.g. "2025-07-06"

  const tz         = "America/Los_Angeles";
  const startOfDay = toZonedTime(`${isoDateStr}T00:00:00`, tz).toISOString();
  const endOfDay   = toZonedTime(`${isoDateStr}T23:59:59`, tz).toISOString();

  // Human‑readable date for emails and logs
  const dateStr = format(utcYesterday, "EEE MMM dd yyyy"); // e.g. "Sun Jul 06 2025"
  // 4) Fetch all time entries for that window
  const allEntries = await fetchTimeEntries(wid, startOfDay, endOfDay);

  // 5) Keep only entries from the ThinkGIS project
  const workEntries = allEntries.filter(e => e.project_id === pid);

  // ── Rule #4: Invalid‐name entries ──
  const nameIssues: ReportEntry[] = workEntries
    .filter(e => isNameInvalid(e.description))
    .map(e => ({
      id: e.id,
      description: e.description,
      project: "ThinkGIS",
      reason: "Invalid name (must be a 3‑digit code or contain keyword)",
    }));

  // ── Rule #1: Conflicting time entries ──
  const rawConflicts = findConflicts(workEntries);
  const conflictEntries: ReportEntry[] = [];
  rawConflicts.forEach(ci => {
    ci.conflictsWith.forEach(other => {
      // Only report each overlapping pair once
      if (ci.entry.id < other.id) {
        conflictEntries.push({
          id: ci.entry.id,
          description: ci.entry.description,
          project: "ThinkGIS",
          reason: `Time overlap with [${other.id}] ${other.description}`,
        });
      }
    });
  });

  // ── Rule #2: Over‑hours summary ──
  const overHourEntries: ReportEntry[] = [];
  if (isOverHours(workEntries)) {
    // Compute total in “X hrs Y mins”
    const totalSecs = workEntries.reduce((sum, e) => sum + e.duration, 0);
    const hrs  = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const totalStr = `${hrs} hr${hrs !== 1 ? "s" : ""}` +
      (mins ? ` ${mins} min${mins !== 1 ? "s" : ""}` : "");

    overHourEntries.push({
      id: 0,  // summary row
      description: "", 
      project: "ThinkGIS",
      reason: `You logged ${totalStr}, which exceeds 7.5 hrs today.`,
    });
  }

  // ── Rule #3: Unusual time slots ──
  const unusualSlotEntries: ReportEntry[] = findUnusualSlots(workEntries)
    .map(e => ({
      id: e.id,
      description: e.description,
      project: "ThinkGIS",
      reason: "Logged during unusual time slot",
    }));




  // 6) Send a single unified report (mailer will send an “all clear” if all arrays are empty)
  await sendReport(
    nameIssues,
    conflictEntries,
    overHourEntries,
    unusualSlotEntries,
    dateStr
  );

  console.log(
    `Report for ${dateStr} completed:` +
    ` ${nameIssues.length} name issue(s),` +
    ` ${conflictEntries.length} conflict(s),` +
    ` ${overHourEntries.length} over‑hours,` +
    ` ${unusualSlotEntries.length} unusual slot(s).`
  );
})();

