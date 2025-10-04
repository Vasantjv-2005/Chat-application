import { NextResponse } from "next/server"
import { getServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as any)
    const supabase = await getServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const targetId = user?.id || body.userId // fallback to body when session isn't available on unload
    if (!targetId) return NextResponse.json({ ok: false }, { status: 200 })

    await supabase
      .from("profiles")
      .update({ status: "offline", last_seen: new Date().toISOString() })
      .eq("id", targetId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
