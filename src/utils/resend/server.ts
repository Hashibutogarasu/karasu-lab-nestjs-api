import { Resend } from 'resend';

export async function sendResendEmail(
  resend: Resend,
  to: string | string[],
  html: string,
  subject: string,
  from: string,
) {
  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });
  if (error) {
    return { error };
  }
  return { data };
}
