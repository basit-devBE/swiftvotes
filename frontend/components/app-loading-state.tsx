import { SiteLogo } from "@/components/site-logo";

type AppLoadingStateProps = {
  label?: string;
  detail?: string;
  fullScreen?: boolean;
  compact?: boolean;
};

export function AppLoadingState({
  label = "Loading SwiftVote",
  detail = "Preparing your workspace.",
  fullScreen = false,
  compact = false,
}: AppLoadingStateProps) {
  if (compact) {
    return (
      <div
        className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-line bg-white/84 px-4 py-8 text-center shadow-[0_18px_45px_-36px_rgba(7,17,31,0.32)]"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          <span className="h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-sm font-semibold text-ink/64">{label}</span>
        {detail ? (
          <span className="max-w-sm text-xs leading-5 text-ink/42">{detail}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={[
        "flex items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.12),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f5f8fc_100%)] px-4 text-ink",
        fullScreen ? "min-h-screen" : "min-h-[24rem] rounded-[2rem]",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto inline-flex rounded-[1.75rem] bg-white px-5 py-3 shadow-[0_24px_60px_-36px_rgba(7,17,31,0.45)] ring-1 ring-ink/5">
          <SiteLogo imageClassName="h-12 sm:h-14" />
        </div>

        <div className="relative mx-auto mt-8 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          <div className="h-3 w-3 rounded-full bg-accent shadow-[0_0_0_8px_rgba(180,15,23,0.08)]" />
        </div>

        <p className="mt-6 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
          {label}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink/56">{detail}</p>
      </div>
    </div>
  );
}
