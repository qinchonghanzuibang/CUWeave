import { readFile } from 'node:fs/promises'

const config = JSON.parse(
  await readFile(new URL('../vercel.json', import.meta.url), 'utf8')
)
const expected = {
  framework: 'nextjs',
  installCommand: 'cd ../.. && pnpm install --frozen-lockfile',
  buildCommand: 'cd ../.. && pnpm --filter @cuweave/web build',
}
for (const [key, value] of Object.entries(expected))
  if (config[key] !== value)
    throw new Error(`vercel.json ${key} must be ${JSON.stringify(value)}.`)
console.log('Vercel monorepo configuration is valid.')
