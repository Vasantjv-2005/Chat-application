export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string

export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL. Create a .env.local with your Supabase project URL."
  )
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Create a .env.local with your Supabase anon key."
  )
}
