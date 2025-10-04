"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export type Message = {
  id: string
  sender_id: string
  content: string | null
  message_type: "text" | "image" | "video" | "file"
  file_url: string | null
  file_name: string | null
  created_at: string
  is_edited: boolean | null
  is_deleted: boolean | null
}

export default function MessageBubble({ m, isSelf }: { m: Message; isSelf: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "max-w-[80%] rounded-xl p-3 text-sm shadow-sm",
        isSelf ? "bg-primary text-primary-foreground ml-auto" : "bg-secondary text-foreground",
      )}
    >
      {m.message_type === "text" && (
        <p className="whitespace-pre-wrap text-pretty">{m.is_deleted ? "Message deleted" : m.content || ""}</p>
      )}

      {m.message_type === "image" && m.file_url && (
        <img
          src={m.file_url || "/placeholder.svg"}
          alt={m.file_name || "image"}
          className="rounded-md max-h-[320px] object-cover"
        />
      )}

      {m.message_type === "video" && m.file_url && (
        <video controls className="rounded-md max-h-[360px]">
          <source src={m.file_url} />
        </video>
      )}

      {m.message_type === "file" && m.file_url && (
        <a className="underline" href={m.file_url} target="_blank" rel="noreferrer">
          {m.file_name || "Download file"}
        </a>
      )}

      <div
        className={cn("mt-1 text-[11px] opacity-80", isSelf ? "text-primary-foreground/80" : "text-muted-foreground")}
      >
        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {m.is_edited ? " • edited" : ""}
      </div>
    </motion.div>
  )
}
