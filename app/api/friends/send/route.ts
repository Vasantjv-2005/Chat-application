import { NextResponse } from "next/server"
import { getServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { receiverId } = await req.json()

  console.log("[v0] API: Sending friend request from", user.id, "to", receiverId)

  // prevent duplicates
  const { data: existing, error: exErr } = await supabase
    .from("friend_requests")
    .select("id,status")
    .eq("sender_id", user.id)
    .eq("receiver_id", receiverId)
    .maybeSingle()

  console.log("[v0] API: Existing request check:", { existing, error: exErr })

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 })
  if (existing) {
    console.log("[v0] API: Request already exists, returning existing ID")
    return NextResponse.json({ ok: true, requestId: existing.id })
  }

  const { data, error } = await supabase
    .from("friend_requests")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: "pending",
    })
    .select("id")
    .single()

  console.log("[v0] API: Insert result:", { data, error })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  console.log("[v0] API: Friend request created successfully with ID:", data.id)
  return NextResponse.json({ ok: true, requestId: data.id })
}
