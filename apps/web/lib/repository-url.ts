export function getRepositoryUrl(): string | null {
  const value = process.env.GITHUB_REPOSITORY_URL
  if (!value) return null

  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
