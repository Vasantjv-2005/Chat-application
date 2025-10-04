import OnboardingForm from "@/components/profile/onboarding-form"

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border rounded-xl shadow-sm p-6">
        <OnboardingForm />
      </div>
    </main>
  )
}
