import { PlannerClient } from './planner-client'

export default function PlannerPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-73px)] w-full max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">
        Local planner
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">
        Weave a workable week.
      </h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        Your section choices stay in this browser. Confirmed overlaps and
        uncertain scheduling details are kept separate so missing data never
        looks safe.
      </p>
      <PlannerClient />
    </main>
  )
}
