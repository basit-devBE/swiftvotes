import { ChartIcon, CursorIcon, ShieldIcon } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";
import { StepCard } from "@/components/step-card";

const steps = [
  {
    step: "01",
    title: "Create and submit",
    description:
      "Add the event flyer, categories, prices, nomination dates, and voting window before sending it for admin approval.",
    icon: <CursorIcon />,
  },
  {
    step: "02",
    title: "Approve contestants",
    description:
      "Review nominations, confirm contestant details, and send login access to contestants who need their profile.",
    icon: <ShieldIcon />,
  },
  {
    step: "03",
    title: "Collect verified votes",
    description:
      "Free votes count immediately; paid votes count only after Paystack confirms the matching amount, currency, and reference.",
    icon: <ChartIcon />,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-space">
      <div className="page-shell">
        <div className="glass-panel overflow-hidden px-6 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-end">
            <SectionHeading
              kicker="How it works"
              title="From draft event to counted vote."
              description="SwiftVote mirrors the way awards and pageants are run: prepare the campaign, approve the lineup, open voting, then reconcile results and payments."
            />

            <div
              id="admin"
              className="rounded-[1.8rem] border border-primary/10 bg-primary-soft/70 p-6"
            >
              <p className="section-kicker">For event teams</p>
              <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-primary-deep">
                Schedule nomination and voting windows, decide leaderboard visibility, and keep payment records ready for review.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {steps.map((step) => (
              <StepCard key={step.step} {...step} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
