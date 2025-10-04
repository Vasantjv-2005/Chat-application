"use client"

import type React from "react"

import { useState } from "react"
import { getBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export default function AuthForm() {
  const supabase = getBrowserClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.target as HTMLFormElement)
    const email = String(fd.get("email") || "")
    const password = String(fd.get("password") || "")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return toast({ title: "Sign in failed", description: error.message, variant: "destructive" })
    router.push("/")
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.target as HTMLFormElement)
    const email = String(fd.get("email") || "")
    const password = String(fd.get("password") || "")
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const redirectBase = siteUrl && siteUrl.length > 0 ? siteUrl : (typeof window !== "undefined" ? window.location.origin : "")
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectBase ? `${redirectBase}/onboarding` : undefined,
      },
    })
    setLoading(false)
    if (error) return toast({ title: "Sign up failed", description: error.message, variant: "destructive" })
    toast({ title: "Check your email", description: "Confirm your address to continue." })
  }

  async function signInGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
    if (error) toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <img src="/placeholder-logo.svg" alt="Logo" className="mx-auto h-10 w-10" />
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in or create an account</p>
      </div>

      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={signIn} className="space-y-3">
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <Button disabled={loading} className="w-full bg-primary text-primary-foreground">
              Sign in
            </Button>
          </form>
          <Button variant="outline" onClick={signInGoogle} className="w-full mt-3 bg-transparent">
            Continue with Google
          </Button>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={signUp} className="space-y-3">
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password (min 6 chars)" required />
            <Button disabled={loading} className="w-full bg-primary text-primary-foreground">
              Create account
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
