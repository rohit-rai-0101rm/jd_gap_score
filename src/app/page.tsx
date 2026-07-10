import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Score your resume against any job description
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Upload your resume, paste the job description, and get a match
          score, a gap list, and rewritten bullets that close the gaps — in
          under a minute.
        </p>
        <Link
          href="/analyze"
          className="rounded-full bg-foreground px-6 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Score my resume — free
        </Link>
      </section>

      {/* Product screenshot / mock */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-emerald-500 text-2xl font-semibold">
            82
          </div>
          <p className="text-sm text-zinc-500">
            Results card preview — coming soon
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
          Pricing
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 p-8 dark:border-white/10">
            <h3 className="text-lg font-medium">Free</h3>
            <p className="mt-2 text-3xl font-semibold">$0</p>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              1 analysis, no card required.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-foreground p-8">
            <h3 className="text-lg font-medium">Pro</h3>
            <p className="mt-2 text-3xl font-semibold">
              $19<span className="text-base font-normal">/mo</span>
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              or $9/wk
            </p>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Unlimited analyses and all rewritten bullets, unlocked.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
