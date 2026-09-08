import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

/**
 * Gmail SMTP. Requires a Google account with 2-Step Verification enabled and an
 * App Password (a normal account password will not authenticate here).
 */
function getTransporter(): Transporter | null {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        // App Passwords are shown with spaces for readability; Google accepts
        // them without, and a stray space is an easy way to get a 535 auth error.
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ""),
      },
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const mailer = getTransporter();
  if (!mailer) {
    // No credentials configured — surface the message in the server log rather
    // than failing the request that triggered it (activation, receipts, etc.).
    console.log(`[email:unconfigured] to=${to} subject="${subject}"\n${text}`);
    return;
  }

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || `CLUB 90s <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    ...(html && { html }),
  });
}
