import Link from "next/link";

type EventCardProps = {
  title: string;
  summary: string;
  category: string;
  status: string;
  visualTone: "blue" | "indigo" | "amber" | "slate" | "crimson";
  ctaLabel?: string;
  indexLabel?: string;
  isActive?: boolean;
  onSelect?: () => void;
};

const visualStyles = {
  amber:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(7,17,31,0.58)),radial-gradient(circle_at_top,rgba(255,190,110,0.20),transparent_32%),linear-gradient(135deg,#6a3e16,#15100e)]",
  blue:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(7,17,31,0.6)),radial-gradient(circle_at_top,rgba(122,198,255,0.24),transparent_34%),linear-gradient(135deg,#1b5e8d,#08111f)]",
  crimson:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(7,17,31,0.62)),radial-gradient(circle_at_top,rgba(255,112,142,0.20),transparent_32%),linear-gradient(135deg,#6a1825,#110b0d)]",
  slate:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(7,17,31,0.58)),radial-gradient(circle_at_top,rgba(210,226,244,0.18),transparent_34%),linear-gradient(135deg,#394657,#0a111b)]",
  indigo:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(7,17,31,0.62)),radial-gradient(circle_at_top,rgba(156,165,255,0.22),transparent_34%),linear-gradient(135deg,#31379c,#0a0d22)]",
};

export function EventCard({
  title,
  summary,
  category,
  status,
  visualTone,
  ctaLabel,
  indexLabel,
  isActive = false,
  onSelect,
}: EventCardProps) {
  return (
    <article
      onClick={onSelect}
      className={`group relative flex min-h-[33rem] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-[2.4rem] p-6 text-white shadow-[0_28px_70px_rgba(7,17,31,0.18)] transition duration-700 sm:min-h-[34rem] sm:p-7 ${visualStyles[visualTone]} ${
        isActive ? "shadow-[0_36px_90px_rgba(7,17,31,0.2)]" : ""
      }`}
      aria-label={`Featured event ${title}`}
    >
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(7,17,31,0),rgba(7,17,31,0.58))]" />
      <div className="absolute -right-12 bottom-8 h-40 w-40 rounded-full bg-white/6 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/88">
            {category}
          </span>
          <span className="pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/52">
            {status}
          </span>
        </div>

        <h3 className="mt-8 max-w-[15rem] font-body text-[3rem] font-semibold leading-[0.88] tracking-[-0.05em] text-white sm:text-[3.35rem]">
          {title}
        </h3>
      </div>

      <div className="relative z-10 mt-auto">
        <p className="max-w-[18rem] text-[1.05rem] leading-8 text-white/74">
          {summary}
        </p>

        {isActive ? (
          <div className="mt-8 flex items-center justify-between gap-4">
            <Link
              href="#get-started"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-3 text-sm font-semibold text-[#07111f] transition duration-300 hover:bg-white"
            >
              {ctaLabel}
              <span className="ml-2">-&gt;</span>
            </Link>
            <span className="text-sm font-medium tracking-[0.18em] text-white/55">
              {indexLabel}
            </span>
          </div>
        ) : (
          <div className="mt-8 h-12" />
        )}
      </div>
    </article>
  );
}
