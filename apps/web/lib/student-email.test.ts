import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeStudentEmail } from './student-email'

afterEach(() => {
  delete process.env.AUTH_DEV_MODE
  delete process.env.AUTH_TEST_EMAIL_DOMAIN
  vi.unstubAllEnvs()
})

describe('CUHK student email policy', () => {
  it('accepts the exact domain and normalizes domain case and whitespace', () => {
    expect(normalizeStudentEmail(' Student@LINK.CUHK.EDU.HK ')).toBe(
      'Student@link.cuhk.edu.hk'
    )
  })
  it.each([
    'x@gmail.com',
    'x@cuhk.edu.hk',
    'x@link.cuhk.edu.hk.example.com',
    'x@sub.link.cuhk.edu.hk',
  ])('rejects %s', (email) => {
    expect(normalizeStudentEmail(email)).toBeNull()
  })
  it('isolates the test-domain override from production', () => {
    process.env.AUTH_DEV_MODE = 'true'
    process.env.AUTH_TEST_EMAIL_DOMAIN = 'cuweave.local'
    expect(normalizeStudentEmail('student@cuweave.local')).toBe(
      'student@cuweave.local'
    )
    vi.stubEnv('NODE_ENV', 'production')
    expect(normalizeStudentEmail('student@cuweave.local')).toBeNull()
  })
})
