export function activationEmail(fullName: string, activationUrl: string) {
  return {
    subject: "Activate your CLUB 90s account",
    text: `Hi ${fullName},

Welcome to CLUB 90s! Set your password to activate your account:

${activationUrl}

This link expires in 72 hours. If you didn't expect this email, you can ignore it.

— CLUB 90s`,
  };
}
