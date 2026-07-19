export const PUBLIC_STUDENT_EMAIL_DOMAIN = 'link.cuhk.edu.hk'

function normalizeEmailAddress(value: string): string | null {
  const email = value.trim()
  if (email.length > 254 || email.includes(' ')) return null
  const parts = email.split('@')
  if (parts.length !== 2 || !parts[0]) return null
  const domain = parts[1]?.toLowerCase()
  if (!domain || !/^[^@\s]+$/.test(parts[0])) return null
  if (
    !/^[a-z0-9.-]+$/.test(domain) ||
    domain.startsWith('.') ||
    domain.endsWith('.')
  )
    return null
  return `${parts[0]}@${domain}`
}

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
  const email = normalizeEmailAddress(value)
  if (!email) return null
  const domain = email.split('@')[1]
  if (domain !== PUBLIC_STUDENT_EMAIL_DOMAIN && domain !== testEmailDomain())
    return null
  return email
}

function operatorEmailKeys(): Set<string> {
  const keys = new Set<string>()
  for (const entry of (process.env.AUTH_OPERATOR_EMAILS ?? '').split(',')) {
    if (entry.includes('*')) continue
    const normalized = normalizeEmailAddress(entry)
    if (normalized) keys.add(normalized.toLowerCase())
  }
  return keys
}

export function normalizeSignInEmail(value: string): string | null {
  const email = normalizeEmailAddress(value)
  if (!email) return null
  if (normalizeStudentEmail(email)) return email
  return operatorEmailKeys().has(email.toLowerCase()) ? email : null
}
