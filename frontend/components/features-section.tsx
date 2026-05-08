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
    title: "Category-based voting",
    description:
      "Let supporters vote from the public event page with contestant codes, quantities, and per-category pricing clearly shown.",
  },
  {
    icon: <LockIcon />,
    title: "Paystack-backed payments",
    description:
      "Paid votes stay pending until Paystack verification succeeds, with payment rows, fees, references, and webhook history recorded.",
  },
  {
    icon: <PulseIcon />,
    title: "Controlled leaderboards",
    description:
      "Show public rankings when the organiser allows it, while contestants can separately be granted access to their own counts.",
  },
  {
    icon: <LayersIcon />,
    title: "Event approval workflow",
    description:
      "Creators draft events, submit them for review, and move through nominations and voting on scheduled dates.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-space">
      <div className="page-shell">
        <SectionHeading
          kicker="Features"
          title="The pieces an organiser actually needs before voting day."
          description="SwiftVote connects the public campaign page to the operational work behind it: approvals, contestants, vote pricing, payments, and reporting."
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
