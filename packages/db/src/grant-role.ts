import { setUserRole, type UserRole } from './product'

const email = process.argv[2]
const role = process.argv[3] as UserRole | undefined

if (!email || (role !== 'user' && role !== 'moderator' && role !== 'admin')) {
  process.stderr.write('Usage: pnpm role:grant EMAIL user|moderator|admin\n')
  process.exitCode = 2
} else {
  setUserRole(email, role)
    .then(() => process.stdout.write(`Updated ${email} to ${role}.\n`))
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : 'Role update failed.'}\n`
      )
      process.exitCode = 1
    })
}
