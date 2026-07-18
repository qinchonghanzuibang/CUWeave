export default function ModerationPolicyPage() {
  return (
    <main className="page-shell py-12 sm:py-16">
      <span className="eyebrow">
        Publishable draft · maintainer review required
      </span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        Review and Moderation Policy
      </h1>
      <div className="panel mt-8 space-y-6 p-6 leading-7 text-slate-700 sm:p-8">
        <p>
          Authenticated students can report reviews for spam, harassment,
          privacy, incorrect information, or another stated reason. Reports
          enter a restricted moderator queue; the public never receives the
          author’s internal identity.
        </p>
        <p>
          Moderators assess context, revision history, duplicate reports,
          privacy risk, and these guidelines. They may publish, place under
          review, or hide a review. Resolution notes, moderator identity, and
          time are retained for accountability. Emergency privacy or safety
          reports may be hidden first and reviewed immediately afterward.
        </p>
        <p>
          Authors may request reconsideration through the project
          security/contact channel. A different maintainer should handle appeals
          where practical. The operations runbook defines report ownership,
          moderator bootstrap, takedown, suspension, emergency response, and
          escalation.
        </p>
        <p>
          Anonymous display is not anonymity from maintainers or infrastructure
          providers. This draft requires maintainer review and a public
          appeals/contact address before production launch.
        </p>
      </div>
    </main>
  )
}
