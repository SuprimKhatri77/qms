import { AuthShell } from "@/modules/auth";
import { OnboardingForm } from "./onboarding-form";

export function OnboardingPage() {
  return (
    <AuthShell
      roomy
      title="Set up your shop"
      description="Tell us about your business so customers can find your queue and join it."
      footer="Your shop gets its own link that customers can open or scan to join your queue."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
