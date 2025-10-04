"use client"

import type React from "react"

import useSWR, { mutate } from "swr"
import { useEffect, useMemo, useRef, useState } from "react"
import { getBrowserClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { UserPlus, X } from "lucide-react"

type Friend = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  status?: string | null
  last_seen?: string | null
}
type Request = {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  created_at: string
  sender?: Friend
}

export default function Sidebar({ userId }: { userId: string }) {
  const supabase = getBrowserClient()
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends")
  const searchRef = useRef<HTMLInputElement>(null)
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [accepting, setAccepting] = useState<Record<string, boolean>>({})
  const [rejecting, setRejecting] = useState<Record<string, boolean>>({})

  // Separate fetchers to satisfy SWR typings
  const fetchFriends = async (): Promise<Friend[]> => {
      console.log("[v0] Fetching friends for user:", userId)
      const { data: pairs, error: pairErr } = await supabase
        .from("friendships")
        .select("user_id_1,user_id_2")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)

      console.log("[v0] Friendships query result:", { pairs, error: pairErr })
      if (pairErr) throw pairErr

      const friendIds = Array.from(
        new Set((pairs || []).map((r: any) => (r.user_id_1 === userId ? r.user_id_2 : r.user_id_1))),
      ).filter(Boolean)

      if (friendIds.length === 0) return [] as Friend[]

      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,status,last_seen")
        .in("id", friendIds)
        .order("username", { ascending: true })
      if (profErr) throw profErr
      return profs as Friend[]
  }

  const fetchRequests = async (): Promise<Request[]> => {
      console.log("[v0] Fetching friend requests for receiver_id:", userId)
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*, sender:profiles!friend_requests_sender_id_fkey(id,username,full_name,avatar_url,status,last_seen)")
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      console.log("[v0] Friend requests query result:", {
        requestCount: data?.length || 0,
        requests: data,
        error: error,
      })

      if (error) {
        console.error("[v0] Error fetching requests:", error)
        throw error
      }
      return data as Request[]
  }

  const { data: friends, mutate: refetchFriends } = useSWR<Friend[]>("friends", fetchFriends)
  const { data: requests, mutate: refetchRequests } = useSWR<Request[]>("requests", fetchRequests)

  useEffect(() => {
    console.log("[v0] Requests data updated:", {
      count: requests?.length || 0,
      requests: requests,
    })
  }, [requests])

  useEffect(() => {
    const ch = supabase
      .channel("friend-reqs-in")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${userId}` },
        (payload: any) => {
          console.log("[v0] Real-time update received for incoming friend request:", payload)
          refetchRequests()
          refetchFriends()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, userId, refetchRequests, refetchFriends])

  useEffect(() => {
    const ch = supabase
      .channel("friend-reqs-out")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `sender_id=eq.${userId}` },
        () => {
          refetchFriends()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, userId, refetchFriends])

  useEffect(() => {
    const ch = supabase
      .channel("friendships-me")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `user_id_1=eq.${userId}`,
        },
        () => refetchFriends(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `user_id_2=eq.${userId}`,
        },
        () => refetchFriends(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, userId, refetchFriends])

  useEffect(() => {
    const ch = supabase
      .channel("profiles-presence")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        refetchFriends()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, refetchFriends])

  async function accept(req: Request) {
    console.log("[v0] Accepting friend request from:", req.sender?.username)
    setAccepting((s: Record<string, boolean>) => ({ ...s, [req.id]: true }))
    try {
      const r = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: req.id }),
      })
      const res = await r.json().catch(() => ({}))
      console.log("[v0] Accept response:", res)
      if (!r.ok || res?.error) {
        const msg = res?.error || `Failed to accept (status ${r.status})`
        toast({ title: "Failed to accept", description: msg, variant: "destructive" })
      } else {
        toast({ title: "Request accepted", description: "You're now friends" })
      }
      refetchFriends()
      refetchRequests()
    } catch (e: any) {
      toast({ title: "Network error", description: e?.message || String(e), variant: "destructive" })
    } finally {
      setAccepting((s: Record<string, boolean>) => ({ ...s, [req.id]: false }))
    }
  }

  async function reject(req: Request) {
    setRejecting((s: Record<string, boolean>) => ({ ...s, [req.id]: true }))
    try {
      const r = await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: req.id }),
      })
      const res = await r.json().catch(() => ({}))
      if (!r.ok || res?.error) {
        const msg = res?.error || `Failed to reject (status ${r.status})`
        toast({ title: "Failed to reject", description: msg, variant: "destructive" })
      } else {
        toast({ title: "Request rejected" })
      }
      refetchRequests()
    } catch (e: any) {
      toast({ title: "Network error", description: e?.message || String(e), variant: "destructive" })
    } finally {
      setRejecting((s: Record<string, boolean>) => ({ ...s, [req.id]: false }))
    }
  }

  async function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    let q = (e.currentTarget.value || "").trim()
    if (!q) {
      setSearchResults([])
      return
    }
    if (q.startsWith("@")) q = q.slice(1)

    setIsSearching(true)
    console.log("[v0] Searching for username:", q)

    const { data: matches, error: searchErr } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url,status,last_seen")
      .ilike("username", `%${q}%`)
      .limit(10)

    setIsSearching(false)
    console.log("[v0] Search results:", matches, "Error:", searchErr)

    if (searchErr) {
      toast({ title: "Search failed", description: searchErr.message, variant: "destructive" })
      return
    }

    if (!matches || matches.length === 0) {
      setSearchResults([])
      toast({ title: "No users found", description: `No users matching "${q}"` })
      return
    }

    const filteredResults = matches.filter((m: Friend) => m.id !== userId)
    setSearchResults(filteredResults)
    console.log("[v0] Displaying", filteredResults.length, "search results")
  }

  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({})

  async function sendFriendRequest(target: Friend) {
    if (sendingIds[target.id]) return
    setSendingIds((s) => ({ ...s, [target.id]: true }))
    console.log("[v0] Sending friend request to:", target.username)

    try {
      const { data: already, error: frErr } = await supabase
        .from("friendships")
        .select("id,user_id_1,user_id_2")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)

      console.log("[v0] Existing friendships:", already)

      if (frErr) {
        toast({ title: "Check failed", description: frErr.message, variant: "destructive" })
        return
      }

      const isFriend = (already || []).some((r: any) => r.user_id_1 === target.id || r.user_id_2 === target.id)
      if (isFriend) {
        toast({ title: "Already friends", description: `@${target.username} is already your friend` })
        return
      }

      const r = await fetch("/api/friends/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: target.id }),
      })
      const res = await r.json().catch(() => ({}))

      console.log("[v0] Friend request response:", res)

      if (!r.ok || res?.error) {
        const msg = res?.error || `Failed to send request (status ${r.status})`
        toast({ title: "Request failed", description: msg, variant: "destructive" })
        return
      }

      toast({ title: "Request sent", description: `Friend request sent to @${target.username}` })
      setSearchResults((prev) => prev.filter((u) => u.id !== target.id))
      if (searchRef.current) searchRef.current.value = ""
    } catch (e: any) {
      toast({ title: "Network error", description: e?.message || String(e), variant: "destructive" })
    } finally {
      setSendingIds((s) => ({ ...s, [target.id]: false }))
    }
  }

  return (
    <aside className="border-r bg-card">
      <div className="p-4 flex items-center gap-3">
        <UserMini userId={userId} />
      </div>
      <Separator />
      <div className="p-3 flex gap-2">
        <Button
          size="sm"
          variant={activeTab === "friends" ? "default" : "outline"}
          onClick={() => setActiveTab("friends")}
          aria-pressed={activeTab === "friends"}
        >
          Friends
        </Button>
        <Button
          size="sm"
          variant={activeTab === "requests" ? "default" : "outline"}
          onClick={() => {
            setActiveTab("requests")
            refetchRequests()
          }}
          aria-pressed={activeTab === "requests"}
          className="relative"
        >
          Requests
          {Boolean(requests?.length) && (
            <Badge variant="secondary" className="ml-2">
              {requests!.length}
            </Badge>
          )}
        </Button>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Input
            ref={searchRef}
            placeholder="Search users by username..."
            onKeyDown={handleSearch}
            onChange={(e) => {
              if (!e.target.value.trim()) setSearchResults([])
            }}
            aria-label="Search users to send friend request"
            disabled={isSearching}
          />
          {searchResults.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => {
                setSearchResults([])
                if (searchRef.current) searchRef.current.value = ""
              }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 border rounded-md bg-background shadow-lg max-h-64 overflow-y-auto">
            <div className="p-2 space-y-1">
              <div className="text-xs text-muted-foreground px-2 py-1">
                Found {searchResults.length} user{searchResults.length !== 1 ? "s" : ""}
              </div>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-secondary transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>{user.username[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm min-w-0 flex-1">
                      <div className="font-medium truncate">@{user.username}</div>
                      {user.full_name && <div className="text-muted-foreground text-xs truncate">{user.full_name}</div>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-shrink-0 ml-2"
                    onClick={() => sendFriendRequest(user)}
                    aria-label={`Send friend request to @${user.username}`}
                    disabled={!!sendingIds[user.id]}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    {sendingIds[user.id] ? "Adding..." : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ScrollArea className="h-[calc(100dvh-220px)]">
        {activeTab === "friends" && (
          <div className="p-2 space-y-1">
            {(friends || []).map((f) => (
              <FriendRow key={f.id} friend={f} />
            ))}
            {friends?.length === 0 && (
              <div className="text-sm text-muted-foreground px-2 py-6">
                No friends yet. Search for users above to send friend requests.
              </div>
            )}
          </div>
        )}
        {activeTab === "requests" && (
          <div className="p-2 space-y-2">
            <div className="flex justify-between items-center px-2 pb-2">
              <div className="text-xs text-muted-foreground">
                {requests?.length || 0} pending request{requests?.length !== 1 ? "s" : ""}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  console.log("[v0] Manual refresh triggered")
                  refetchRequests()
                }}
                className="h-7 text-xs"
              >
                Refresh
              </Button>
            </div>
            {(requests || []).map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.sender?.avatar_url || ""} />
                    <AvatarFallback>{r.sender?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">@{r.sender?.username}</div>
                    <div className="text-muted-foreground text-xs">Friend request</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => accept(r)}
                    aria-label="Accept friend request"
                    disabled={!!accepting[r.id]}
                  >
                    {accepting[r.id] ? "Accepting..." : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reject(r)}
                    aria-label="Reject friend request"
                    disabled={!!rejecting[r.id]}
                  >
                    {rejecting[r.id] ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </div>
            ))}
            {requests?.length === 0 && (
              <div className="text-sm text-muted-foreground px-2 py-6">
                No pending requests.
                <div className="text-xs mt-2">
                  If you're expecting a request, click Refresh above or check the browser console for debug info.
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}

function FriendRow({ friend }: { friend: Friend }) {
  const status = (friend.status || "offline") as "online" | "away" | "offline"
  const dot = status === "online" ? "bg-emerald-500" : status === "away" ? "bg-amber-500" : "bg-muted-foreground/50"
  return (
    <a
      href={`/?chat=${friend.id}`}
      className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition"
      aria-label={`Open chat with @${friend.username}`}
    >
      <div className="relative">
        <Avatar className="h-9 w-9">
          <AvatarImage src={friend.avatar_url || ""} />
          <AvatarFallback>{friend.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${dot}`}
        />
      </div>
      <div className="text-sm">
        <div className="font-medium">@{friend.username}</div>
        <div className="text-muted-foreground">{friend.full_name || "—"}</div>
      </div>
    </a>
  )
}

function UserMini({ userId }: { userId: string }) {
  const supabase = getBrowserClient()
  const { data } = useSWR(["me", userId], async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
    if (error) throw error
    return data
  })
  const initials = useMemo(() => data?.username?.slice(0, 2)?.toUpperCase() || "ME", [data])

  useEffect(() => {
    const ch = supabase
      .channel("me-presence")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => {
          // Revalidate this user's profile SWR key
          mutate(["me", userId])
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, userId])

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={data?.avatar_url || ""} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <div className="text-sm font-medium">{data?.full_name || data?.username || "You"}</div>
        <div className="text-xs text-muted-foreground">Status: {data?.status || "offline"}</div>
      </div>
    </div>
  )
}
