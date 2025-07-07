import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const EMAIL_FROM       = process.env.EMAIL_FROM!;
const EMAIL_TO         = process.env.EMAIL_TO!;

sgMail.setApiKey(SENDGRID_API_KEY);

export interface ReportEntry {
  id: number;
  description: string;
  project: string;
  reason: string;
}

/**
 * Sends a Toggl validation report email.
 * - nameIssues: entries with invalid names
 * - conflictEntries: entries overlapping other entries
 * - overHourEntries: single summary entry if daily total > 7.5h
 * - unusualSlotEntries: entries logged in unusual times
 * - dateStr: human‑readable report date
 */
export async function sendReport(
  nameIssues: ReportEntry[],
  conflictEntries: ReportEntry[],
  overHourEntries: ReportEntry[],
  unusualSlotEntries: ReportEntry[],
  dateStr: string
): Promise<void> {
  const totalIssues =
    nameIssues.length +
    conflictEntries.length +
    overHourEntries.length +
    unusualSlotEntries.length;

  // All‑clear case
  if (totalIssues === 0) {
    const textBody =
      `Toggl Validation Report for ${dateStr}\n\n` +
      `✅ All clear! No issues found for ${dateStr}.`;
    const htmlBody = `
      <html>
        <body style="font-family:Arial,sans-serif;color:#333;padding:20px;">
          <h1 style="color:#2a9d8f;">Toggl Validation Report</h1>
          <h2 style="color:#264653;">Date: ${dateStr}</h2>
          <p style="font-size:16px;color:#2a9d8f;">
            ✅ <strong>All clear!</strong> No issues found for ${dateStr}.
          </p>
        </body>
      </html>`;

    await sgMail.send({
      to: EMAIL_TO,
      from: EMAIL_FROM,
      subject: `Toggl Report: All Clear for ${dateStr}`,
      text: textBody,
      html: htmlBody,
    });
    console.log(`All-clear email sent for ${dateStr}.`);
    return;
  }

  // Plain-text fallback
  const textLines: string[] = [];
  textLines.push(`Toggl Validation Report for ${dateStr}`);
  textLines.push("");

  if (nameIssues.length) {
    textLines.push(`📝 Name Issues (${nameIssues.length}):`);
    nameIssues.forEach(e =>
      textLines.push(`• [${e.id}] "${e.description}" — ${e.reason}`)
    );
    textLines.push("");
  }
  if (conflictEntries.length) {
    textLines.push(`⏰ Time Conflicts (${conflictEntries.length}):`);
    conflictEntries.forEach(e =>
      textLines.push(`• [${e.id}] "${e.description}" — ${e.reason}`)
    );
    textLines.push("");
  }
  if (overHourEntries.length) {
    textLines.push(`🕒 Over‑hours Alert: ${overHourEntries[0].reason}`);
    textLines.push("");
  }
  if (unusualSlotEntries.length) {
    textLines.push(`🌙 Unusual Time Slots (${unusualSlotEntries.length}):`);
    unusualSlotEntries.forEach(e =>
      textLines.push(`• [${e.id}] "${e.description}" — ${e.reason}`)
    );
    textLines.push("");
  }

  const textBody = textLines.join("\n");

  // HTML helper for tables
  const makeTable = (title: string, entries: ReportEntry[]) => `
    <h3 style="color:#264653;margin-top:20px;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#264653;color:#fff;">
          <th style="padding:8px;border:1px solid #ddd;">ID</th>
          <th style="padding:8px;border:1px solid #ddd;">Description</th>
          <th style="padding:8px;border:1px solid #ddd;">Project</th>
          <th style="padding:8px;border:1px solid #ddd;">Reason</th>
        </tr>
      </thead>
      <tbody>
        ${entries
          .map(e => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${e.id}</td>
          <td style="padding:8px;border:1px solid #ddd;">${e.description}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${e.project}</td>
          <td style="padding:8px;border:1px solid #ddd;">${e.reason}</td>
        </tr>`)
          .join("")}
      </tbody>
    </table>`;

  // Build HTML sections
  const htmlSections: string[] = [];
  htmlSections.push(`<h1 style="color:#2a9d8f;">Toggl Validation Report</h1>`);
  htmlSections.push(
    `<h2 style="color:#264653;">Date: ${dateStr}</h2>` +
    `<p style="font-size:16px;">Found <strong>${totalIssues}</strong> issue${totalIssues > 1 ? "s" : ""}.</p>`
  );

  if (nameIssues.length) {
    htmlSections.push(makeTable(`📝 Name Issues (${nameIssues.length})`, nameIssues));
  }
  if (conflictEntries.length) {
    htmlSections.push(makeTable(`⏰ Time Conflicts (${conflictEntries.length})`, conflictEntries));
  }
  if (overHourEntries.length) {
    htmlSections.push(`
      <h3 style="color:#e76f51;margin-top:20px;">🕒 Over‑hours Alert</h3>
      <p style="font-size:16px;padding:8px;border:1px solid #ddd;">${overHourEntries[0].reason}</p>
    `);
  }
  if (unusualSlotEntries.length) {
    htmlSections.push(makeTable(`🌙 Unusual Time Slots (${unusualSlotEntries.length})`, unusualSlotEntries));
  }

  const htmlBody = `
  <html>
    <body style="font-family:Arial,sans-serif;color:#333;padding:20px;">
      ${htmlSections.join("")}
      <p style="margin-top:20px;font-size:14px;color:#555;">
        Please review these entries and correct them as needed. Let me know if you have any questions!
      </p>
    </body>
  </html>`;

  // Send the email
  await sgMail.send({
    to: EMAIL_TO,
    from: EMAIL_FROM,
    subject: `Toggl Report: ${totalIssues} Issue${totalIssues > 1 ? "s" : ""} on ${dateStr}`,
    text: textBody,
    html: htmlBody,
  });

  console.log(`Email sent to ${EMAIL_TO} with ${totalIssues} issues.`);
}

