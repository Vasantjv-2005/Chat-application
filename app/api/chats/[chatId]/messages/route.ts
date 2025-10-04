import { NextResponse } from "next/server"
import { getServerClient } from "@/lib/supabase/server"

export async function GET(
  _: Request,
  context: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await context.params
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ messages: data })
}

export async function POST(
  req: Request,
  context: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await context.params
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()

  const insert = {
    chat_id: chatId,
    sender_id: user.id,
    content: body.content ?? null,
    message_type: body.message_type ?? "text",
    file_url: body.file_url ?? null,
    file_name: body.file_name ?? null,
    file_size: body.file_size ?? null,
  }

  const { data, error } = await supabase.from("messages").insert(insert).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // bump chat updated_at
  await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId)
  return NextResponse.json({ message: data })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await context.params
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { messageId, content } = await req.json()
  const { error } = await supabase
    .from("messages")
    .update({ content, is_edited: true })
    .eq("id", messageId)
    .eq("sender_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await context.params
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { messageId } = await req.json()
  // soft delete: set is_deleted and content null
  const { error } = await supabase
    .from("messages")
    .update({ is_deleted: true, content: null, file_url: null, file_name: null })
    .eq("id", messageId)
    .eq("sender_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
