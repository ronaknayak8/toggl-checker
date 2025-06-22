import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const EMAIL_FROM        = process.env.EMAIL_FROM!;
const EMAIL_TO          = process.env.EMAIL_TO!;

sgMail.setApiKey(SENDGRID_API_KEY);

export interface ReportEntry {
  id: number;
  description: string;
  project: string;
  reason: string;
}

export async function sendReport(entries: ReportEntry[]): Promise<void> {
  if (entries.length === 0) return;

  // 1. Build the plain‑text body
  const lines = entries.map(e =>
    `• [${e.id}] "${e.description}" (${e.project}) — ${e.reason}`
  );
  const textBody = [
    `Inaccurate Time Entries for ${new Date().toDateString()}:`,
    "",
    ...lines
  ].join("\n");

  // 2. (Optional) Build an HTML body
  const htmlLines = lines.map(l => `<li>${l}</li>`).join("\n");
  const htmlBody = `
    <p>Inaccurate Time Entries for ${new Date().toDateString()}:</p>
    <ul>
      ${htmlLines}
    </ul>
  `;

  // 3. Assemble the message
  const msg = {
    to: EMAIL_TO,
    from: EMAIL_FROM,
    subject: `Toggl Report: ${entries.length} Inaccurate Entries Found`,
    text: textBody,
    html: htmlBody
  };

  // 4. Send it
  await sgMail.send(msg);
  console.log(`Email sent to ${EMAIL_TO} with ${entries.length} entries.`);
}

