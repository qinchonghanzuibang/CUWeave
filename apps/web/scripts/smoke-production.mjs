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
  ['privacy', '/privacy', 200],
  ['terms', '/terms', 200],
  ['community guidelines', '/community-guidelines', 200],
  ['moderation policy', '/moderation-policy', 200],
  ['requirements disabled', '/requirements', 404],
  ['requirement admin disabled', '/admin/requirements', 404],
  ['requirement API disabled', '/api/v1/requirements', 404],
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
  if (path === '/') {
    const body = await response.text()
    for (const requiredLink of ['/courses', '/planner', '/sign-in'])
      if (!body.includes(`href="${requiredLink}"`))
        throw new Error(`Home page is missing ${requiredLink}.`)
    for (const forbidden of [
      'href="/requirements"',
      'href="/schedules"',
      '>Home</a>',
      '>Beta<',
    ])
      if (body.includes(forbidden))
        throw new Error(`Home page includes disabled navigation: ${forbidden}.`)
  }
  console.log(`PASS ${label}: ${response.status}`)
}
