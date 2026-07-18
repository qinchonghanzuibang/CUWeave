import { describe, expect, it } from 'vitest'
import { OTP_POLICY } from './otp-policy'

describe('OTP security policy', () => {
  it('uses six digits, five minutes, three attempts, hashing, and resend rotation', () => {
    expect(OTP_POLICY).toEqual({
      length: 6,
      expiresInSeconds: 300,
      allowedAttempts: 3,
      storage: 'hashed',
      resendStrategy: 'rotate',
    })
  })
})
