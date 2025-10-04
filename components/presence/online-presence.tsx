"use client"

import { useEffect, useRef } from "react"
import { getBrowserClient } from "@/lib/supabase/client"

type Props = { userId: string }

export default function OnlinePresence({ userId }: Props) {
  const supabase = getBrowserClient()
  const timerRef = useRef<number | null>(null)

  async function setStatus(status: "online" | "away" | "offline") {
    try {
      await supabase.from("profiles").update({ status, last_seen: new Date().toISOString() }).eq("id", userId)
    } catch (e) {
      // swallow - presence is best-effort
      // console.log("[v0] presence error", e)
    }
  }

  useEffect(() => {
    if (!userId) return

    // Mark online on mount
    setStatus("online")

    // Heartbeat every 25s to keep "online"
    timerRef.current = window.setInterval(() => {
      setStatus(document.hidden ? "away" : "online")
    }, 25_000)

    const onVis = () => {
      setStatus(document.hidden ? "away" : "online")
    }
    document.addEventListener("visibilitychange", onVis)

    const onBeforeUnload = () => {
      // Best-effort mark offline
      navigator.sendBeacon?.(
        "/api/presence/offline",
        new Blob([JSON.stringify({ userId })], { type: "application/json" }),
      )
    }
    window.addEventListener("beforeunload", onBeforeUnload)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("beforeunload", onBeforeUnload)
      // Mark away/offline when component unmounts (navigation)
      setStatus("away")
    }
  }, [userId])

  return null
}
