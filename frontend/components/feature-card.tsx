import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <article className="group rounded-[1.75rem] border border-white/80 bg-white/80 p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      {icon}
      <h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
        {title}
      </h3>
      <p className="mt-3 text-base leading-7 text-ink/68">{description}</p>
      <div className="mt-5 h-px w-full bg-gradient-to-r from-primary/25 via-primary/5 to-transparent transition group-hover:from-primary/45" />
    </article>
  );
}
