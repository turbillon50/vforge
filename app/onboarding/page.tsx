import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { VWatermark } from "@/components/brand/VWatermark";

export default function OnboardingPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <VWatermark />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-violet-aura" />
      <OnboardingFlow />
    </div>
  );
}
