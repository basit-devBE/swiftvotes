import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function IconFrame({
  children,
  className = "",
}: IconProps & { children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary-soft text-primary ${className}`}
    >
      {children}
    </span>
  );
}

export function BallotIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
        <path
          d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z"
          strokeWidth="1.5"
        />
        <path d="m8.5 12 2.25 2.25L15.5 9.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconFrame>
  );
}

export function ShieldIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
        <path
          d="M12 3.75 5.75 6v5.44c0 4.33 2.69 8.2 6.25 8.81 3.56-.61 6.25-4.48 6.25-8.81V6L12 3.75Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="m9.75 12 1.5 1.5 3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconFrame>
  );
}

export function PulseIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
        <path
          d="M3.75 12h3.5l2.25-4.5 4.25 9 2.25-4.5h4"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconFrame>
  );
}

export function LayersIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
        <path
          d="m12 4.75 7.25 4.25L12 13.25 4.75 9 12 4.75Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="m4.75 12 7.25 4.25L19.25 12" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m4.75 15 7.25 4.25L19.25 15" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </IconFrame>
  );
}

export function CursorIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
        <path
          d="M6.75 4.75v13.5l3.75-4 2.75 5 2-1-2.75-5 5.25-.75-8-7.75Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </IconFrame>
  );
}

export function LockIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
        <rect x="5.25" y="10.25" width="13.5" height="8.5" rx="2.25" strokeWidth="1.5" />
        <path
          d="M8.75 10.25V8.5a3.25 3.25 0 1 1 6.5 0v1.75"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </IconFrame>
  );
}

export function ChartIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
        <path d="M5.75 18.25h12.5" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8.5 15.5V9.75" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 15.5V6.75" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15.5 15.5v-3.75" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}
