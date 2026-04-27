import Image from "next/image";
import Link from "next/link";

type EventCardProps = {
  title: string;
  summary: string;
  category: string;
  status: string;
  imageSrc?: string;
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
  imageSrc,
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
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover object-center transition duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,21,0.08),rgba(5,11,21,0.28)_38%,rgba(5,11,21,0.86)_76%,rgba(5,11,21,0.96))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%)]" />
        </>
      ) : null}

      <div className="absolute inset-0 opacity-18 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="absolute -right-12 bottom-8 h-40 w-40 rounded-full bg-white/6 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-full border border-white/20 bg-black/12 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/92 backdrop-blur-sm">
            {category}
          </span>
          <span className="pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/74">
            {status}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-auto">
        <h3 className="max-w-[15rem] font-body text-[2.15rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[2.55rem]">
          {title}
        </h3>
        <p className="mt-4 max-w-[18rem] text-[0.98rem] leading-7 text-white/80">
          {summary}
        </p>

        {isActive ? (
          <div className="mt-7 flex items-center justify-between gap-4">
            <Link
              href="/signup"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-3 text-sm font-semibold text-[#07111f] transition duration-300 hover:bg-white"
            >
              {ctaLabel}
              <span className="ml-2">-&gt;</span>
            </Link>
            <span className="text-sm font-medium tracking-[0.18em] text-white/60">
              {indexLabel}
            </span>
          </div>
        ) : (
          <div className="mt-7 h-12" />
        )}
      </div>
    </article>
  );
}
