import Link from "next/link";

export function CallToAction() {
  return (
    <section id="get-started" className="section-space pt-10">
      <div className="page-shell">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-ink px-6 py-12 text-white shadow-card sm:px-8 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.34),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(180,15,23,0.18),_transparent_24%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker text-white/60">Start now</p>
              <h2 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-0.04em] text-balance sm:text-6xl">
                Start voting or nominate today.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                Bring a premium, trusted experience to your next event with a
                platform designed for speed, clarity, and confidence.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/" className="button-primary">
                Launch SwiftVote
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/5"
              >
                Review features
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
