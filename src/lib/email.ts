import { Resend } from "resend";
import nodemailer from "nodemailer";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let _transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT ?? "587"),
      secure: Number(process.env.SMTP_PORT ?? "587") === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });
  }
  return _transport;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ data?: unknown; error?: unknown }> {
  const from = process.env.EMAIL_FROM ?? "MetaCoach <onboarding@resend.dev>";

  if (smtpConfigured()) {
    try {
      const info = await getTransport().sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      return { data: { id: info.messageId } };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return getResend().emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
