export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined

export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Do not throw during import to avoid Vercel build failures if envs aren't wired yet.
  // Showing a clear warning helps diagnose misconfiguration.
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase/env] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Ensure env vars are set (local .env.local or Vercel Project Settings)."
  )
}
