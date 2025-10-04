import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabase/env"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 })
      },
    },
  })

  // get the session to decide routing
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname, origin } = request.nextUrl
  const isApi = pathname.startsWith("/api")
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images")
  const isAuthRoute = pathname === "/login" || pathname === "/onboarding"

  // Redirect unauthenticated users to /login for protected pages
  if (!session && !isApi && !isStatic && !isAuthRoute) {
    const url = new URL("/login", origin)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from /login to /
  if (session && pathname === "/login") {
    const url = new URL("/", origin)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
