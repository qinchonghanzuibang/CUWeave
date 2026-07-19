import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms for using the unofficial CUWeave planning service.',
}

export default function TermsPage() {
  return (
    <main className="page-shell py-12 sm:py-16">
      <span className="eyebrow">
        Policy draft · maintainer and legal review required
      </span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        Terms of Use
      </h1>
      <div className="panel mt-8 space-y-6 p-6 leading-7 text-slate-700 sm:p-8">
        <p>
          CUWeave is an unofficial planning aid and is not operated by CUHK. It
          does not enroll students, certify graduation eligibility, or replace
          advice from a programme, Division, Faculty, or CUSIS.
        </p>
        <p>
          You remain responsible for verifying course availability, deadlines,
          prerequisites and timetable details in official systems. Requirement
          checking is currently unavailable; if reactivated, its results remain
          planning guidance and never certify programme completion.
        </p>
        <p>
          Do not upload credentials, SID numbers, transcripts, private
          correspondence, or personal information about others. Do not abuse
          authentication, reviews, reports, votes, schedule sharing, or
          automated endpoints. Access may be suspended to protect students and
          the service.
        </p>
        <p>
          The service and its data are provided without a guarantee of accuracy
          or availability. Open-source code is licensed separately under
          AGPL-3.0-only. This policy remains subject to maintainer and legal
          review as the service evolves.
        </p>
      </div>
    </main>
  )
}
