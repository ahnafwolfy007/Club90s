import { Resend } from "resend";

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const resend = getClient();
  if (!resend) {
    // Dev fallback: no provider configured, so surface the email in the server log instead of failing silently.
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "CLUB 90s <no-reply@club90s.app>",
    to,
    subject,
    text,
  });
}
