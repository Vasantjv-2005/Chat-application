import { NextResponse } from "next/server"
import { getServerClient } from "@/lib/supabase/server"

export async function POST(req: Request, { params }: { params: { chatId: string } }) {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { isTyping } = await req.json()
  const { error } = await supabase
    .from("typing_indicators")
    .upsert({ chat_id: params.chatId, user_id: user.id, is_typing: !!isTyping })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
