"use client"

import type React from "react"

import { useState } from "react"
import { getBrowserClient } from "@/lib/supabase/client" // import browser client from new path
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export default function OnboardingForm() {
  const supabase = getBrowserClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.target as HTMLFormElement)
    const username = String(fd.get("username") || "").trim()
    const full_name = String(fd.get("full_name") || "").trim()
    const bio = String(fd.get("bio") || "").trim()
    const avatar_url = String(fd.get("avatar_url") || "").trim() || null

    const {
      data: { user },
      error: uerr,
    } = await supabase.auth.getUser()
    if (uerr || !user) {
      setLoading(false)
      return toast({ title: "Not signed in", description: "Please log in again.", variant: "destructive" })
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      full_name,
      bio,
      avatar_url,
      status: "online",
    })
    setLoading(false)
    if (error) return toast({ title: "Profile save failed", description: error.message, variant: "destructive" })
    router.push("/")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Set up your profile</h2>
      <Input name="username" placeholder="Username" required />
      <Input name="full_name" placeholder="Full name" />
      <Input name="avatar_url" placeholder="Avatar URL (or leave blank)" />
      <Textarea name="bio" placeholder="Bio" />
      <div className="flex justify-end">
        <Button disabled={loading} className="bg-primary text-primary-foreground">
          Save profile
        </Button>
      </div>
    </form>
  )
}
