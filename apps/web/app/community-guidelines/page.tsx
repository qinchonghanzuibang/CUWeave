export default function CommunityGuidelinesPage() {
  return (
    <main className="page-shell py-12 sm:py-16">
      <span className="eyebrow">
        Publishable draft · maintainer review required
      </span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        Community Guidelines
      </h1>
      <div className="panel mt-8 space-y-6 p-6 leading-7 text-slate-700 sm:p-8">
        <p>
          Share first-hand, course-specific experiences that help students plan.
          Distinguish opinion from fact, use the correct offering and instructor
          context, and correct material errors promptly.
        </p>
        <p>
          Do not post harassment, discriminatory abuse, spam, fabricated claims,
          assessment answers, private messages, personal contact details, SID
          numbers, or sensitive information. An “anonymous” review hides the
          public author label but remains internally linked to the authenticated
          author.
        </p>
        <p>
          Use reports in good faith. Votes and reports are not tools for
          retaliation. Moderators may hide material during review, preserve
          revision history, request clarification, or remove content under the
          moderation policy.
        </p>
        <p>
          Requirement results and course information must not be presented as
          official advice. CUSIS and official programme sources remain
          authoritative.
        </p>
      </div>
    </main>
  )
}
