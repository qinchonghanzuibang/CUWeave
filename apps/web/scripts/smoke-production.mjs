const baseUrl = process.env.SMOKE_BASE_URL
const courseCode = process.env.SMOKE_COURSE_CODE

if (!baseUrl || !/^https?:\/\//.test(baseUrl))
  throw new Error('SMOKE_BASE_URL must be an absolute HTTP(S) URL.')
if (!courseCode || !/^[A-Z]{4}[0-9A-Z]{4,5}$/.test(courseCode))
  throw new Error('SMOKE_COURSE_CODE must identify one imported course.')

const checks = [
  ['home', '/', 200],
  ['courses', '/courses', 200],
  ['course detail', `/courses/${courseCode}`, 200],
  ['planner', '/planner', 200],
  ['sign in', '/sign-in', 200],
  ['health', '/api/v1/health', 200],
  ['anonymous schedule boundary', '/api/v1/schedules', 401],
]

for (const [label, path, expected] of checks) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: 'manual',
    headers: { 'User-Agent': 'CUWeave production smoke test' },
  })
  if (response.status !== expected)
    throw new Error(
      `${label} returned ${response.status}; expected ${expected}.`
    )
  if (path === '/api/v1/health') {
    const body = await response.json()
    if (body.status !== 'ready' || body.checks?.database !== 'ready')
      throw new Error('Health endpoint is not ready.')
  }
  console.log(`PASS ${label}: ${response.status}`)
}
