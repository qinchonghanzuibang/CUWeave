# Accounts, schedules, and privacy

Public Beta uses email magic links. CUWeave does not collect a CUHK password, OnePass credential,
student ID, transcript, or legal name. Development sign-in previews a single-use link locally;
production sends the link through configured SMTP.

Production accepts only an exact authentication origin and configured trusted origins. Preview
authentication is disabled unless the deployment has an isolated database and explicit opt-in.
PostgreSQL-backed abuse limits store keyed request-identifier hashes, not raw IP addresses.
Better Auth raw IP tracking is disabled, and the database rejects non-null session IP values.

Anonymous planner data remains in versioned browser storage. After sign-in, a user may copy it to
one or more private cloud schedules, then rename, update, duplicate, or delete them. Updates use an
integer version so a stale tab receives a conflict instead of silently overwriting newer work.

A share action generates 32 random bytes and stores only its SHA-256 hash. The URL token is the
credential for a read-only schedule view. It reveals the schedule name, section selection, and
update time, but no account identity. Revocation invalidates the link immediately; generating a
new link replaces the previous token.

Account deactivation revokes sessions and authentication accounts and replaces the active email
and display name. Community records remain for moderation and aggregate integrity. Publishable
policy drafts and the operations runbook describe current behavior and identify the maintainer and
legal decisions still required before launch.
