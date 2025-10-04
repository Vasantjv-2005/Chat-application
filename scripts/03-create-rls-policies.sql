-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Allow authenticated users to read ALL profiles (needed for search)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- FRIEND_REQUESTS TABLE POLICIES
-- ============================================

-- Allow users to read friend requests where they are sender or receiver
DROP POLICY IF EXISTS "friend_requests_select" ON public.friend_requests;
CREATE POLICY "friend_requests_select"
ON public.friend_requests FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);

-- Allow users to insert friend requests where they are the sender
DROP POLICY IF EXISTS "friend_requests_insert" ON public.friend_requests;
CREATE POLICY "friend_requests_insert"
ON public.friend_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Allow users to update friend requests where they are the receiver (accept/reject)
DROP POLICY IF EXISTS "friend_requests_update" ON public.friend_requests;
CREATE POLICY "friend_requests_update"
ON public.friend_requests FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- ============================================
-- FRIENDSHIPS TABLE POLICIES
-- ============================================

-- Allow users to read friendships where they are either user
DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
CREATE POLICY "friendships_select"
ON public.friendships FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id_1 OR 
  auth.uid() = user_id_2
);

-- Allow users to insert friendships (typically done by accept endpoint)
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
CREATE POLICY "friendships_insert"
ON public.friendships FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id_1 OR 
  auth.uid() = user_id_2
);

-- ============================================
-- CHATS TABLE POLICIES
-- ============================================

-- Allow users to read chats where they are either user
DROP POLICY IF EXISTS "chats_select" ON public.chats;
CREATE POLICY "chats_select"
ON public.chats FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id_1 OR 
  auth.uid() = user_id_2
);

-- Allow users to insert chats where they are either user
DROP POLICY IF EXISTS "chats_insert" ON public.chats;
CREATE POLICY "chats_insert"
ON public.chats FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id_1 OR 
  auth.uid() = user_id_2
);

-- Allow users to update chats where they are either user
DROP POLICY IF EXISTS "chats_update" ON public.chats;
CREATE POLICY "chats_update"
ON public.chats FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id_1 OR 
  auth.uid() = user_id_2
)
WITH CHECK (
  auth.uid() = user_id_1 OR 
  auth.uid() = user_id_2
);

-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================

-- Allow users to read messages in chats they're part of
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = messages.chat_id
    AND (chats.user_id_1 = auth.uid() OR chats.user_id_2 = auth.uid())
  )
);

-- Allow users to insert messages in chats they're part of
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = messages.chat_id
    AND (chats.user_id_1 = auth.uid() OR chats.user_id_2 = auth.uid())
  )
);

-- Allow users to update their own messages
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow users to delete their own messages
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete"
ON public.messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);
