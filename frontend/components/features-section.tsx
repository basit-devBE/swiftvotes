import {
  BallotIcon,
  LayersIcon,
  LockIcon,
  PulseIcon,
} from "@/components/icons";
import { FeatureCard } from "@/components/feature-card";
import { SectionHeading } from "@/components/section-heading";

const features = [
  {
    icon: <BallotIcon />,
    title: "Easy voting",
    description:
      "Give supporters a direct path from discovery to checkout with a fast voting flow that removes friction.",
  },
  {
    icon: <LockIcon />,
    title: "Secure payments",
    description:
      "Support trusted payment experiences with confirmation-ready records built for confidence and accountability.",
  },
  {
    icon: <PulseIcon />,
    title: "Real-time results",
    description:
      "Keep event teams informed with live activity, fast visibility, and clean result tracking across every category.",
  },
  {
    icon: <LayersIcon />,
    title: "Multi-event support",
    description:
      "Run pageants, awards, and campaigns from one platform without sacrificing clarity or control.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-space">
      <div className="page-shell">
        <SectionHeading
          kicker="Features"
          title="Everything needed to run a polished voting experience."
          description="SwiftVote is designed for elegant public interactions on the front end and dependable control behind the scenes."
          align="center"
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
