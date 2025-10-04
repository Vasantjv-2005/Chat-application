# Chat Application (Next.js + Supabase)

A modern real-time chat app built with Next.js, TypeScript, Tailwind CSS, and Supabase. It supports friend search and requests, 1:1 chats with real-time messages, typing indicators, and media/file uploads.

## Tech Stack

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS
- UI: Shadcn UI components (Radix primitives)
- Auth + DB + Realtime + Storage: Supabase (@supabase/ssr)
- Data fetching: SWR

## Features

- Friends
  - Search by username, send friend requests
  - Accept/Reject incoming requests
  - Friends list with presence hints
- Chat
  - 1:1 chat created automatically when opening a friend or after accepting a request
  - Real-time messages via Supabase Realtime
  - Typing indicators (per chat)
  - Media/file uploads via Supabase Storage
  - Edit/Delete message hooks on API (soft delete implemented)

## Project Structure

- `app/`
  - `page.tsx` – server shell that renders `Sidebar`, `ChatWindow`, `OnlinePresence`
  - `api/`
    - `chats/ensure/route.ts` – ensure or create chat for a pair of users
    - `chats/[chatId]/messages/route.ts` – get/insert/update/delete messages
    - `chats/[chatId]/typing/route.ts` – upsert typing indicators
    - `friends/send|accept|reject/route.ts` – friend request flows
    - `presence/offline/route.ts` – helper to mark offline (optional)
- `components/chat/`
  - `sidebar.tsx` – search users, list friends and requests, send/accept/reject
  - `chat-window.tsx` – ensure chat, load messages via API, realtime subscribe, send text/upload files
  - `message-bubble.tsx` – render text/media/file bubbles
- `components/presence/online-presence.tsx` – presence wiring
- `lib/supabase/` – browser/server clients and env
- `lib/utils/pair.ts` – stable ordered pair helper for chat pairing
- `scripts/*.sql` – complete Supabase schema, RLS, functions, diagnostics
- `DATABASE_SETUP.md` – setup guide for DB + RLS

## Environment Variables

Create `.env.local` with your Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

These are read by `lib/supabase/env.ts` and used by `lib/supabase/client.ts` and `lib/supabase/server.ts`.

## Database Setup (Supabase)

Run the SQL scripts (either in Supabase SQL Editor or via v0):

1. `scripts/01-create-tables.sql` – creates `profiles`, `friend_requests`, `friendships`, `chats`, `messages`, `typing_indicators`
2. `scripts/02-enable-rls.sql` – enables RLS for all tables
3. `scripts/03-create-rls-policies.sql` – policies so users can access only their own data; profiles are readable for search
4. `scripts/04-create-functions.sql` – triggers and helper functions (auto profile, timestamps)
5. `scripts/05-diagnostic-check.sql` – optional verification checks

Realtime publication (if not covered in scripts):

```
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.typing_indicators;
```

Storage: create a public bucket named `chat-uploads` for file sharing (or use signed URLs and adjust code).

## Install & Run

```
pnpm install   # or npm install / yarn
pnpm dev       # or npm run dev / yarn dev
# Local: http://localhost:3000
```

## How it Works (Flow)

- Search for a user in `Sidebar` and click Add → `POST /api/friends/send` → receiver sees request in Requests tab.
- Accept a request → `POST /api/friends/accept` → friendship row + chat ensured.
- Click a friend → navigate to `/?chat=<friendId>` → `ChatWindow` calls `POST /api/chats/ensure` → retrieves `chatId`.
- `ChatWindow` loads initial messages via `GET /api/chats/[chatId]/messages` and subscribes to Realtime for `messages`.
- Sending a message → `POST /api/chats/[chatId]/messages` → appears instantly via Realtime.
- Typing state → `POST /api/chats/[chatId]/typing` and subscription on `typing_indicators`.

## API Endpoints (App Router)

- `POST /api/chats/ensure` → body `{ peerId }` → `{ chatId }`
- `GET /api/chats/[chatId]/messages` → `{ messages }`
- `POST /api/chats/[chatId]/messages` → body `{ content | file_url, message_type }` → `{ message }`
- `PATCH /api/chats/[chatId]/messages` → body `{ messageId, content }` → `{ ok: true }`
- `DELETE /api/chats/[chatId]/messages` → body `{ messageId }` → `{ ok: true }`
- `POST /api/chats/[chatId]/typing` → body `{ isTyping }` → `{ ok: true }`
- `POST /api/friends/send` → body `{ receiverId }` → `{ ok, requestId }`
- `POST /api/friends/accept` → body `{ requestId }` → `{ ok, chatId }`
- `POST /api/friends/reject` → body `{ requestId }` → `{ ok }`

All routes require an authenticated session (via Supabase). The middleware touches the session to keep auth cookies fresh.

## Troubleshooting

- Magic link login shows `otp_expired` → generate a new link and retry.
- Messages don’t appear in realtime → ensure `messages` and `typing_indicators` are added to `supabase_realtime` publication; verify RLS policies; confirm both users belong to the chat.
- Cannot search users → confirm Profiles RLS allows `select` for authenticated users.
- Uploads failing → check bucket `chat-uploads` exists and is public (or adapt to signed URLs).

## Development Notes

- `components/chat/sidebar.tsx`
  - Debounced search can be added later; current search triggers on Enter.
  - Add / Accept / Reject buttons use in-flight states and toasts.
- `components/chat/chat-window.tsx`
  - Initial messages via API to avoid client-side RLS edge cases.
  - Realtime channel per-chat: `messages-<chatId>` and `typing-<chatId>`.

## License

MIT
