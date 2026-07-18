# Security policy

CUWeave is in public-beta development. Deployment configuration and runbooks exist, but production
launch still requires maintainer approval, external service configuration, and policy review.

Please report suspected vulnerabilities privately to the maintainers through the repository's
private security-advisory feature. Do not open a public issue containing exploit details, secrets,
personal data, credentials, or sensitive logs.

CUWeave will never ask for CUHK passwords, OnePass credentials, student IDs, or transcripts. If a
surface appears to request them, stop using it and report it immediately.

Authentication collects an email address only. A CUHK email-domain flag must not be interpreted as
proof of current enrollment. Database URLs, authentication secrets, SMTP credentials, magic links,
session cookies, schedule share tokens, and moderation notes are sensitive. They must never be
logged, exposed through `NEXT_PUBLIC_*`, committed, or returned from public APIs. Anonymous review
responses must not contain the author's account identifier or email address.

Reports should include the affected component, reproduction steps, impact, and any proposed
mitigation. Maintainers will acknowledge a valid channel report, investigate it, and coordinate
disclosure after a fix is available.
