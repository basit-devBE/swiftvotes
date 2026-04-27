import type { ReactNode } from "react";

type StepCardProps = {
  step: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export function StepCard({ step, title, description, icon }: StepCardProps) {
  return (
    <article className="relative rounded-[1.8rem] border border-primary/10 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex rounded-full border border-primary/15 bg-primary-soft px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          {step}
        </span>
        {icon}
      </div>
      <h3 className="mt-8 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
        {title}
      </h3>
      <p className="mt-3 max-w-sm text-base leading-7 text-ink/68">{description}</p>
    </article>
  );
}
