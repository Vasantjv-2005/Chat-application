import { NextResponse } from "next/server"
import { getServerClient } from "@/lib/supabase/server"
import { orderedPair } from "@/lib/utils/pair"

export async function POST(req: Request) {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { requestId } = await req.json()

  const { data: fr, error: fErr } = await supabase.from("friend_requests").select("*").eq("id", requestId).maybeSingle()
  if (fErr || !fr) return NextResponse.json({ error: fErr?.message || "Request not found" }, { status: 404 })
  if (fr.receiver_id !== user.id) return NextResponse.json({ error: "Not your request" }, { status: 403 })

  // mark accepted
  const { error: upErr } = await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

  const [u1, u2] = orderedPair(fr.sender_id, fr.receiver_id)
  await supabase.from("friendships").insert({ user_id_1: u1, user_id_2: u2 }).select().maybeSingle()

  // ensure chat exists
  let { data: chat, error: cErr } = await supabase
    .from("chats")
    .select("id")
    .eq("user_id_1", u1)
    .eq("user_id_2", u2)
    .maybeSingle()
  if (!chat && !cErr) {
    const { data: newChat } = await supabase
      .from("chats")
      .insert({ user_id_1: u1, user_id_2: u2 })
      .select("id")
      .single()
    chat = newChat
  }
  return NextResponse.json({ ok: true, chatId: chat?.id || null })
}
