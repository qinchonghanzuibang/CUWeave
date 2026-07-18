import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendProductionMagicLink, validatedSender } from './magic-link-email'

describe('production magic-link email', () => {
  afterEach(() => {
    delete process.env.AUTH_SMTP_URL
    delete process.env.AUTH_EMAIL_FROM
  })

  it('uses a synthetic transport with CUWeave security language', async () => {
    process.env.AUTH_SMTP_URL = 'smtps://user:password@smtp.example.test:465'
    process.env.AUTH_EMAIL_FROM = 'CUWeave <noreply@example.test>'
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'synthetic' })
    await sendProductionMagicLink(
      'student@example.test',
      'https://cuweave.example/api/auth/magic-link/verify?token=synthetic',
      () => ({ sendMail })
    )
    expect(sendMail).toHaveBeenCalledOnce()
    expect(sendMail.mock.calls[0]?.[0]).toMatchObject({
      to: 'student@example.test',
      subject: 'Your CUWeave sign-in link',
    })
    const message = sendMail.mock.calls[0]?.[0] as { text: string }
    expect(message.text).toContain('expires in 10 minutes')
  })

  it('refuses missing SMTP and malformed senders', async () => {
    await expect(
      sendProductionMagicLink('student@example.test', 'https://example.test')
    ).rejects.toThrow('AUTH_SMTP_URL')
    expect(() => validatedSender('not-an-address')).toThrow('AUTH_EMAIL_FROM')
  })
})
