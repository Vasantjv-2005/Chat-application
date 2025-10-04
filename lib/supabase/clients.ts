"use server"

import { cookies, headers } from "next/headers"
import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/env"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (!browserClient) {
    // This file is also imported in client components; guard against server-only apis.
    // @ts-expect-error runtime guard
    if (typeof window === "undefined") throw new Error("getBrowserClient called on server")
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return browserClient
}

export async function getServerClient() {
  const cookieStore = await cookies()
  const hdrs = await headers()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set(name, "", { ...options, maxAge: 0 })
      },
    },
    headers: {
      "x-forwarded-for": hdrs.get("x-forwarded-for") ?? undefined,
      "user-agent": hdrs.get("user-agent") ?? undefined,
    },
  })
}
