/**
 * Club-branded email shell: gold on black, matching the app. Inline styles
 * only — email clients strip <style> blocks and have no CSS variable support.
 */
function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#161616;border:1px solid rgba(201,168,76,0.2);border-radius:12px;overflow:hidden;">
            <tr>
              <td style="height:3px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);"></td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 24px 8px;">
                <div style="font-size:22px;font-weight:bold;letter-spacing:2px;color:#c9a84c;">CLUB 90s</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px;color:#f5f0e8;font-size:15px;line-height:1.6;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#e8c96d;font-weight:600;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid rgba(201,168,76,0.12);color:#a89070;font-size:12px;text-align:center;">
                CLUB 90s — members only
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background:#c9a84c;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:bold;color:#0a0a0a;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function activationEmail(fullName: string, activationUrl: string) {
  return {
    subject: "Activate your CLUB 90s account",
    text: `Hi ${fullName},

Welcome to CLUB 90s! Set your password to activate your account:

${activationUrl}

This link expires in 72 hours. If you didn't expect this email, you can ignore it.

— CLUB 90s`,
    html: layout(
      `Welcome, ${escapeHtml(fullName)}`,
      `<p style="margin:0 0 8px;">Your CLUB 90s account is ready. Set a password to activate it and you're in.</p>
       ${button("Activate my account", activationUrl)}
       <p style="margin:0;color:#a89070;font-size:13px;">This link expires in 72 hours. If you weren't expecting this, you can ignore this email.</p>`,
    ),
  };
}

export function passwordResetEmail(fullName: string, resetUrl: string) {
  return {
    subject: "Reset your CLUB 90s password",
    text: `Hi ${fullName},

A CLUB 90s admin has sent you a password reset link. Set a new password here:

${resetUrl}

This link expires in 72 hours and can only be used once. If you didn't expect this, you can ignore it — your current password stays active until you use the link.

— CLUB 90s`,
    html: layout(
      "Reset your password",
      `<p style="margin:0 0 8px;">Hi ${escapeHtml(fullName)}, a club admin has sent you a link to set a new password.</p>
       ${button("Set a new password", resetUrl)}
       <p style="margin:0;color:#a89070;font-size:13px;">This link expires in 72 hours and works once. If you weren't expecting it, ignore this email — your current password stays active.</p>`,
    ),
  };
}

export function paymentReceiptEmail(fullName: string, amount: string, category: string, feeMonth?: string | null) {
  const period = feeMonth ? ` for ${feeMonth}` : "";
  return {
    subject: `CLUB 90s — payment recorded (${category})`,
    text: `Hi ${fullName},

We've recorded your ${category} payment${period}: ${amount}.

If this looks wrong, reply to this email or contact the Finance President.

— CLUB 90s`,
    html: layout(
      "Payment recorded",
      `<p style="margin:0 0 16px;">Hi ${escapeHtml(fullName)}, we've recorded your payment.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.18);border-radius:8px;">
         <tr><td style="padding:16px;">
           <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#a89070;">${escapeHtml(category)}${escapeHtml(period)}</div>
           <div style="font-size:24px;font-weight:bold;color:#e8c96d;margin-top:4px;">${escapeHtml(amount)}</div>
         </td></tr>
       </table>
       <p style="margin:16px 0 0;color:#a89070;font-size:13px;">If this looks wrong, contact the Finance President.</p>`,
    ),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
