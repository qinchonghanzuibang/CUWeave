export default function PrivacyPage() {
  return (
    <main className="page-shell py-12 sm:py-16">
      <span className="eyebrow">
        Policy draft · maintainer and legal review required
      </span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        Privacy Policy
      </h1>
      <div className="panel mt-8 space-y-6 p-6 leading-7 text-slate-700 sm:p-8">
        <p>
          CUWeave is an unofficial, student-led CUHK planning service. It
          collects the email address used for magic-link authentication, account
          and session records, favorites, saved schedules, requirement-plan
          choices, reviews, votes, reports, and moderation records needed to
          operate current features.
        </p>
        <p>
          Magic-link email is processed by the configured SMTP provider.
          Sessions may record IP address and user-agent through the
          authentication library. Abuse controls store only keyed hashes of
          request identifiers, never raw IP addresses. Server logs must redact
          secrets, email addresses, tokens, and raw network identifiers.
        </p>
        <p>
          Reviews displayed as anonymous are anonymous to other students, not to
          the service: an internal authenticated author relationship is retained
          for edits, abuse handling, and moderation. Shared schedules are
          visible to anyone with an active link until the owner revokes it.
        </p>
        <p>
          Account deactivation revokes authentication records and pseudonymizes
          the account. Reviews may remain as “Deleted user” to preserve
          discussions and moderation history. Operational retention and backup
          windows follow the published operations runbook; maintainers should
          handle deletion requests through the security contact.
        </p>
        <p>
          Course data retains source provenance and may be incomplete or stale.
          CUSIS remains authoritative. This draft requires maintainer and legal
          review before production launch.
        </p>
      </div>
    </main>
  )
}
