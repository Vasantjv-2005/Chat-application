import { NextResponse } from "next/server"
import { getServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { requestId } = await req.json()
  const { error } = await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
