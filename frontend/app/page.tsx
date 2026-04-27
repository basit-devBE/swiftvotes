import { CallToAction } from "@/components/call-to-action";
import { EventsPreview } from "@/components/events-preview";
import { FeaturesSection } from "@/components/features-section";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Navbar } from "@/components/navbar";

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,76,219,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(15,76,219,0.12),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.98),_#f7f9fc)]" />
      <Navbar />
      <main>
        <Hero />
        <FeaturesSection />
        <HowItWorks />
        <EventsPreview />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
