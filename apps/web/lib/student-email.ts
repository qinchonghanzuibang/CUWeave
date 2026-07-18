export const PUBLIC_STUDENT_EMAIL_DOMAIN = 'link.cuhk.edu.hk'

export function testEmailDomain(): string | null {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.AUTH_DEV_MODE !== 'true'
  )
    return null
  const value = process.env.AUTH_TEST_EMAIL_DOMAIN?.trim().toLowerCase()
  return value && /^[a-z0-9.-]+$/.test(value) ? value : null
}

export function normalizeStudentEmail(value: string): string | null {
  const email = value.trim()
  if (email.length > 254 || email.includes(' ')) return null
  const parts = email.split('@')
  if (parts.length !== 2 || !parts[0]) return null
  const domain = parts[1]?.toLowerCase()
  if (!domain) return null
  if (domain !== PUBLIC_STUDENT_EMAIL_DOMAIN && domain !== testEmailDomain())
    return null
  if (!/^[^@\s]+$/.test(parts[0])) return null
  return `${parts[0]}@${domain}`
}
