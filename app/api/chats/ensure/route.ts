import { NextResponse } from "next/server"
import { getServerClient } from "@/lib/supabase/server"
import { orderedPair } from "@/lib/utils/pair"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { peerId } = await req.json()
  const [u1, u2] = orderedPair(user.id, String(peerId))
  const { data: existing, error: e1 } = await supabase
    .from("chats")
    .select("id")
    .eq("user_id_1", u1)
    .eq("user_id_2", u2)
    .maybeSingle()
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 })
  if (existing) return NextResponse.json({ chatId: existing.id })
  const { data, error } = await supabase.from("chats").insert({ user_id_1: u1, user_id_2: u2 }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ chatId: data.id })
}
