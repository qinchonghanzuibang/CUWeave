export const OTP_POLICY = {
  length: 6,
  expiresInSeconds: 5 * 60,
  allowedAttempts: 3,
  storage: 'hashed',
  resendStrategy: 'rotate',
} as const
