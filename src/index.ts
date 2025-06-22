import {
  fetchWorkspaces,
  getThinkGISProjectId,
  fetchTimeEntries,
} from "./togglClient";
import { isNameInvalid } from "./checker";
import { sendReport, ReportEntry } from "./mailer";

(async () => {
  // 1) Get workspace
  const workspaces = await fetchWorkspaces();
  const wid = workspaces[0]?.id;
  if (!wid) {
    console.error("No workspace found.");
    return;
  }

  // 2) Get ThinkGIS project ID
  const pid = await getThinkGISProjectId(wid);
  if (!pid) {
    console.error("Project 'ThinkGIS' not found.");
    return;
  }

  // 3) Compute yesterday’s date range
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay   = new Date(now.setHours(23, 59, 59, 999)).toISOString();

  // 4) Fetch time entries
  const allEntries = await fetchTimeEntries(wid, startOfDay, endOfDay);

  // 5) Filter to ThinkGIS entries
  const workEntries = allEntries.filter(e => e.project_id === pid);

  // 6) Identify invalid entries by name
  const invalid: ReportEntry[] = workEntries
    .filter(e => isNameInvalid(e.description))
    .map(e => ({
      id: e.id,
      description: e.description,
      project: "ThinkGIS", // or get actual project name if needed
      reason: "Invalid name (should be 3-digit or contain keyword)"
    }));

  // 7) Send email if there are any invalids
  await sendReport(invalid);
})();

