import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env.EMAIL_FROM ?? "MetaCoach <onboarding@resend.dev>";
  return getResend().emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
