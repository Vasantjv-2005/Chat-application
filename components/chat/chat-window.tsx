"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { useSearchParams } from "next/navigation"
import { getBrowserClient } from "@/lib/supabase/client"
import MessageBubble, { type Message } from "./message-bubble"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"

export default function ChatWindow({ userId }: { userId: string }) {
  const supabase = getBrowserClient()
  const params = useSearchParams()
  const peerId = params.get("chat")
  const [chatId, setChatId] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Ensure chat exists for pair(user, peer)
  useEffect(() => {
    let mounted = true
    async function ensureChat() {
      if (!peerId) return
      const res = await fetch("/api/chats/ensure", { method: "POST", body: JSON.stringify({ peerId }) }).then((r) =>
        r.json(),
      )
      if (!mounted) return
      if (res.error) toast({ title: "Chat error", description: res.error, variant: "destructive" })
      else setChatId(res.chatId)
    }
    ensureChat()
    return () => {
      mounted = false
    }
  }, [peerId])

  const { data: messages, mutate } = useSWR<Message[]>(chatId ? `messages:${chatId}` : null, async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, { method: "GET" })
      const json = await res.json()
      if (!res.ok) {
        console.error("[v0] Messages fetch error:", json?.error)
        throw new Error(json?.error || "Failed to load messages")
      }
      return (json?.messages || []) as Message[]
    } catch (e: any) {
      toast({ title: "Failed to load messages", description: e?.message || String(e), variant: "destructive" })
      throw e
    }
  })

  // realtime subscription
  useEffect(() => {
    if (!chatId) return

    console.log("[v0] Setting up real-time subscription for chat:", chatId)

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          console.log("[v0] Real-time message event:", payload.eventType, payload.new)
          mutate(async (curr) => {
            const row = payload.new as Message
            if (payload.eventType === "INSERT") return [...(curr || []), row]
            if (payload.eventType === "UPDATE") return (curr || []).map((m) => (m.id === row.id ? row : m))
            if (payload.eventType === "DELETE") return (curr || []).filter((m) => m.id !== (payload.old as any).id)
            return curr
          }, false)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, chatId, mutate])

  // typing indicator
  useEffect(() => {
    if (!chatId) return
    const channel = supabase
      .channel(`typing-${chatId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "typing_indicators", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as any
          if (row.user_id !== userId) setIsTyping(!!row.is_typing)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, chatId, userId])

  async function setTyping(typing: boolean) {
    if (!chatId) return
    await fetch(`/api/chats/${chatId}/typing`, { method: "POST", body: JSON.stringify({ isTyping: typing }) })
  }

  async function sendText() {
    if (!text.trim() || !chatId) return
    const content = text
    setText("")
    inputRef.current?.focus()

    console.log("[v0] Sending message:", content, "to chat:", chatId)

    await fetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, message_type: "text" }),
    })
      .then((r) => r.json())
      .then((res) => {
        console.log("[v0] Message sent response:", res)
        if (res.error) toast({ title: "Send failed", description: res.error, variant: "destructive" })
      })
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!chatId) return
    const f = e.target.files?.[0]
    if (!f) return
    const type: "image" | "video" | "file" = f.type.startsWith("image/")
      ? "image"
      : f.type.startsWith("video/")
        ? "video"
        : "file"
    const path = `uploads/${chatId}/${Date.now()}-${f.name}`
    const { error: upErr } = await getBrowserClient().storage.from("chat-uploads").upload(path, f, { upsert: false })
    if (upErr) return toast({ title: "Upload failed", description: upErr.message, variant: "destructive" })
    const { data: pub } = getBrowserClient().storage.from("chat-uploads").getPublicUrl(path)
    await fetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ file_url: pub?.publicUrl, file_name: f.name, file_size: f.size, message_type: type }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) toast({ title: "Send failed", description: res.error, variant: "destructive" })
      })
  }

  return (
    <section className="flex flex-col min-h-dvh">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="font-medium">Chat</div>
        <div className="text-xs text-muted-foreground">{isTyping ? "User is typing…" : ""}</div>
      </header>
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {(messages || []).map((m) => (
            <MessageBubble key={m.id} m={m} isSelf={m.sender_id === userId} />
          ))}
        </div>
      </ScrollArea>
      <footer className="border-t p-3">
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-secondary">
            Upload
            <input type="file" className="hidden" onChange={onFile} />
          </label>
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setTyping(true)
            }}
            onBlur={() => setTyping(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendText()
                setTyping(false)
              }
            }}
            placeholder="Message"
            className="flex-1"
          />
          <Button onClick={sendText}>Send</Button>
        </div>
      </footer>
    </section>
  )
}
