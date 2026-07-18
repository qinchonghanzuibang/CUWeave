import nodemailer from 'nodemailer'

type Transport = Pick<ReturnType<typeof nodemailer.createTransport>, 'sendMail'>

export interface OtpEmail {
  from: string
  to: string
  subject: string
  text: string
}

export function validatedSender(value: string | undefined): string {
  const sender = value?.trim() ?? ''
  const address = /<([^<>]+)>$/.exec(sender)?.[1] ?? sender
  if (sender.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))
    throw new Error('AUTH_EMAIL_FROM must contain a valid email address.')
  return sender
}

export function otpEmail(email: string, otp: string, from: string): OtpEmail {
  return {
    from,
    to: email,
    subject: `${otp} is your CUWeave sign-in code`,
    text: [
      'Enter this one-time code to sign in to CUWeave:',
      '',
      otp,
      '',
      'This code expires in 5 minutes and can be used only once.',
      'CUWeave staff will never ask you to share it.',
      'If you did not request this message, you can safely ignore it.',
      '',
      'CUWeave is an unofficial, student-led CUHK planning project.',
    ].join('\n'),
  }
}

export async function sendProductionOtp(
  email: string,
  otp: string,
  transportFactory: (smtpUrl: string) => Transport = (smtpUrl) =>
    nodemailer.createTransport(smtpUrl)
): Promise<void> {
  const smtpUrl = process.env.AUTH_SMTP_URL
  if (!smtpUrl) throw new Error('AUTH_SMTP_URL is required.')
  let parsed: URL
  try {
    parsed = new URL(smtpUrl)
  } catch {
    throw new Error('AUTH_SMTP_URL must be a valid SMTP URL.')
  }
  if (!['smtp:', 'smtps:'].includes(parsed.protocol))
    throw new Error('AUTH_SMTP_URL must use smtp:// or smtps://.')
  const from = validatedSender(process.env.AUTH_EMAIL_FROM)
  await transportFactory(smtpUrl).sendMail(otpEmail(email, otp, from))
}
