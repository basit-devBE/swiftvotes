import { ChartIcon, CursorIcon, ShieldIcon } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";
import { StepCard } from "@/components/step-card";

const steps = [
  {
    step: "01",
    title: "Nominate or join",
    description:
      "Start with a featured event, category, or contestant and move into the process without confusion.",
    icon: <CursorIcon />,
  },
  {
    step: "02",
    title: "Vote securely",
    description:
      "Complete your vote through a simple, trusted flow built to protect payments and keep records accurate.",
    icon: <ShieldIcon />,
  },
  {
    step: "03",
    title: "Track results",
    description:
      "Follow momentum as activity updates in real time and event teams stay informed throughout the campaign.",
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
              title="A clear flow for supporters and organizers alike."
              description="The experience stays minimal on the surface while handling the important details underneath."
            />

            <div
              id="admin"
              className="rounded-[1.8rem] border border-primary/10 bg-primary-soft/70 p-6"
            >
              <p className="section-kicker">Admin-ready</p>
              <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-primary-deep">
                Schedule windows, moderate visibility, and monitor activity without clutter.
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
