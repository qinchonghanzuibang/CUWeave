import { afterEach, describe, expect, it, vi } from 'vitest'

import { otpEmail, sendProductionOtp, validatedSender } from './otp-email'

describe('production OTP email', () => {
  afterEach(() => {
    delete process.env.AUTH_SMTP_URL
    delete process.env.AUTH_EMAIL_FROM
  })

  it('uses a synthetic transport with CUWeave security language', async () => {
    process.env.AUTH_SMTP_URL = 'smtps://user:password@smtp.example.test:465'
    process.env.AUTH_EMAIL_FROM = 'CUWeave <noreply@example.test>'
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'synthetic' })
    await sendProductionOtp('student@example.test', '123456', () => ({
      sendMail,
    }))
    expect(sendMail).toHaveBeenCalledOnce()
    const message = otpEmail(
      'student@example.test',
      '123456',
      'CUWeave <noreply@example.test>'
    )
    expect(message).toMatchObject({
      to: 'student@example.test',
      subject: '123456 is your CUWeave sign-in code',
    })
    expect(message.text).toContain('expires in 5 minutes')
  })

  it('refuses missing SMTP and malformed senders', async () => {
    await expect(
      sendProductionOtp('student@example.test', '123456')
    ).rejects.toThrow('AUTH_SMTP_URL')
    expect(() => validatedSender('not-an-address')).toThrow('AUTH_EMAIL_FROM')
  })
})
