import Image from "next/image";
import Link from "next/link";

const trustPoints = [
  "Secure voting flow",
  "Live event visibility",
  "Multi-event ready",
];

const heroMetrics = [
  { value: "24/7", label: "Always-on access" },
  { value: "Live", label: "Result tracking" },
  { value: "Swift", label: "Checkout experience" },
];

const stageNotes = [
  "Live vote tracking",
  "Direct nomination flow",
  "Fast confirmations",
];

export function Hero() {
  return (
    <section className="page-shell pb-16 pt-10 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(24rem,0.98fr)] lg:gap-16">
        <div className="max-w-3xl">
          <span className="eyebrow">Fast, secured and trusted</span>
          <h1 className="mt-7 max-w-4xl font-display text-6xl font-semibold leading-[0.9] tracking-[-0.05em] text-ink text-balance sm:text-7xl lg:text-[6.35rem]">
            Vote smarter. Decide faster.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/72 sm:text-xl">
            SwiftVote gives events and pageantry teams a premium platform for
            nominations, secure voting, live tracking, and audience trust from
            the first click.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/signup" className="button-primary">
              Get Started
            </Link>
            <Link href="/#events" className="button-secondary">
              Explore Events
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {trustPoints.map((point) => (
              <span
                key={point}
                className="inline-flex items-center rounded-full border border-ink/8 bg-white/78 px-4 py-2 text-sm font-medium text-ink/70 shadow-soft backdrop-blur"
              >
                {point}
              </span>
            ))}
          </div>

          <div className="mt-12 grid max-w-2xl gap-4 border-t border-ink/8 pt-6 sm:grid-cols-3">
            {heroMetrics.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="font-display text-3xl font-semibold tracking-[-0.03em] text-primary">
                  {item.value}
                </div>
                <p className="text-sm leading-6 text-ink/60">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-10 top-16 hidden h-44 w-44 rounded-full bg-primary/10 blur-3xl lg:block" />
          <div className="absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-[2.35rem] bg-[#07111f] p-3 shadow-[0_32px_90px_rgba(4,7,14,0.18)] sm:p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,76,219,0.28),_transparent_32%),linear-gradient(180deg,_rgba(7,17,31,0.98),_rgba(7,17,31,1))]" />
            <div className="relative min-h-[31rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(241,245,253,0.96))] sm:min-h-[35rem]">
              <div className="absolute inset-0 hero-grid opacity-45" />
              <div className="absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(180deg,_rgba(255,255,255,0),_rgba(255,255,255,0.92)_28%,_rgba(255,255,255,1))]" />

              <div className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-8 sm:pt-8">
                <div className="rounded-full border border-primary/12 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary shadow-soft">
                  Crowd powered
                </div>
                <div className="rounded-full border border-primary/12 bg-primary-soft/84 px-4 py-2 text-sm font-semibold text-primary-deep shadow-soft">
                  Secure
                </div>
              </div>

              <div className="relative z-10 max-w-[27rem] px-6 pb-52 pt-8 sm:px-8 sm:pb-56">
                <p className="text-sm font-medium text-primary/72">
                  Built for modern voting moments
                </p>
                <h2 className="mt-4 max-w-md font-display text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-ink sm:text-5xl">
                  Energy from the crowd. Control for the team.
                </h2>
                <p className="mt-4 max-w-sm text-base leading-7 text-ink/66">
                  High-attention events need a front page that feels alive
                  without sacrificing clarity or trust.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {stageNotes.map((note) => (
                    <span key={note} className="hero-pill">
                      {note}
                    </span>
                  ))}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-0 h-[52%]">
                <Image
                  src="/hero.png"
                  alt="Audience silhouette celebrating at an event"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 48vw"
                  className="object-cover object-bottom"
                />
              </div>

              <div className="absolute right-6 top-20 z-20 sm:right-8">
                <div className="rounded-full bg-[#07111f] px-4 py-2 text-sm font-medium text-white shadow-[0_18px_40px_rgba(7,17,31,0.22)]">
                  Live voting
                </div>
              </div>

              <div className="absolute inset-x-4 bottom-4 z-20 sm:inset-x-6 sm:bottom-6">
                <div className="flex flex-col gap-4 rounded-[1.6rem] border border-white/90 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,247,252,0.96))] px-5 py-4 shadow-[0_20px_50px_rgba(7,17,31,0.18)] sm:flex-row sm:items-end sm:justify-between sm:px-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">
                      Audience confidence
                    </p>
                    <p className="mt-2 font-display text-[1.9rem] font-semibold leading-none tracking-[-0.03em] text-[#12306f] sm:text-[2.15rem]">
                      Clear flow. Real momentum.
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/56">
                      Voting window
                    </p>
                    <p className="mt-2 font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-[#07111f] sm:text-[2.6rem]">
                      Live
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
