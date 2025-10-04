import { getServerClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function HomePage() {
  const supabase = await getServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-xl border bg-card shadow-sm flex flex-col items-center gap-6 text-center">
          <img src="/placeholder-logo.svg" alt="Logo" className="h-12 w-12" />
          <h1 className="text-2xl font-semibold text-balance">Modern, real-time chat</h1>
          <p className="text-muted-foreground text-pretty">
            Chat with friends in real-time. Send media, edit/delete messages, and enjoy a stunning, minimal UI with
            dark/light modes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium"
          >
            Get Started
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh">
      {/* Authenticated chat shell */}
      {/* Using a server component shell to pass user info down */}
      {/* @ts-expect-error server component */}
      <ChatShell />
    </main>
  )
}

async function ChatShell() {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="grid md:grid-cols-[320px_1fr] min-h-dvh">
      {/* @ts-expect-error Server Component boundary passes through Client component */}
      <OnlinePresence userId={user?.id!} />
      <Sidebar userId={user?.id!} />
      <ChatWindow userId={user?.id!} />
    </div>
  )
}

// Lazy import client components
import Sidebar from "@/components/chat/sidebar"
import ChatWindow from "@/components/chat/chat-window"
import OnlinePresence from "@/components/presence/online-presence"
