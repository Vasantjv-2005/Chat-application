import AuthForm from "@/components/auth/auth-form"

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-xl shadow-sm p-6">
        <AuthForm />
      </div>
    </main>
  )
}
