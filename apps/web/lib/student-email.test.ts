import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeSignInEmail, normalizeStudentEmail } from './student-email'

afterEach(() => {
  delete process.env.AUTH_DEV_MODE
  delete process.env.AUTH_OPERATOR_EMAILS
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

describe('operator email policy', () => {
  it('accepts only exact normalized comma-separated entries', () => {
    process.env.AUTH_OPERATOR_EMAILS =
      ' Maintainer@Example.COM, second.operator@example.net '

    expect(normalizeSignInEmail(' maintainer@example.com ')).toBe(
      'maintainer@example.com'
    )
    expect(normalizeSignInEmail('SECOND.OPERATOR@EXAMPLE.NET')).toBe(
      'SECOND.OPERATOR@example.net'
    )
  })

  it.each([
    'maintainer@example.com.evil.test',
    'other@example.com',
    'example.com',
    '@example.com',
  ])('rejects non-exact operator candidate %s', (email) => {
    process.env.AUTH_OPERATOR_EMAILS = 'maintainer@example.com'
    expect(normalizeSignInEmail(email)).toBeNull()
  })

  it('does not treat wildcard or domain entries as bypasses', () => {
    process.env.AUTH_OPERATOR_EMAILS =
      '*@example.com,@example.net,example.org,.example.edu'
    expect(normalizeSignInEmail('*@example.com')).toBeNull()
    expect(normalizeSignInEmail('person@example.com')).toBeNull()
    expect(normalizeSignInEmail('person@example.net')).toBeNull()
    expect(normalizeSignInEmail('person@example.org')).toBeNull()
    expect(normalizeSignInEmail('person@example.edu')).toBeNull()
  })

  it('does not mark an operator address as a CUHK student address', () => {
    process.env.AUTH_OPERATOR_EMAILS = 'maintainer@example.com'
    expect(normalizeSignInEmail('maintainer@example.com')).toBe(
      'maintainer@example.com'
    )
    expect(normalizeStudentEmail('maintainer@example.com')).toBeNull()
  })
})
