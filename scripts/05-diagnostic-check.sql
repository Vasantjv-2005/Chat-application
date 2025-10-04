-- ============================================
-- DIAGNOSTIC SCRIPT
-- Run this to check your database setup
-- ============================================

-- Check if tables exist
SELECT 'Tables Check' as check_type, 
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as profiles_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friend_requests') as friend_requests_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friendships') as friendships_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chats') as chats_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') as messages_exists;

-- Check RLS status
SELECT 'RLS Status' as check_type,
       schemaname,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'friend_requests', 'friendships', 'chats', 'messages')
ORDER BY tablename;

-- Check RLS policies
SELECT 'RLS Policies' as check_type,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check friend requests data
SELECT 'Friend Requests Data' as check_type,
       fr.id,
       fr.sender_id,
       ps.username as sender_username,
       fr.receiver_id,
       pr.username as receiver_username,
       fr.status,
       fr.created_at
FROM public.friend_requests fr
LEFT JOIN public.profiles ps ON ps.id = fr.sender_id
LEFT JOIN public.profiles pr ON pr.id = fr.receiver_id
ORDER BY fr.created_at DESC;

-- Check friendships data
SELECT 'Friendships Data' as check_type,
       f.id,
       f.user_id_1,
       p1.username as user1_username,
       f.user_id_2,
       p2.username as user2_username,
       f.created_at
FROM public.friendships f
LEFT JOIN public.profiles p1 ON p1.id = f.user_id_1
LEFT JOIN public.profiles p2 ON p2.id = f.user_id_2
ORDER BY f.created_at DESC;

-- Check profiles data
SELECT 'Profiles Data' as check_type,
       id,
       username,
       full_name,
       status,
       created_at
FROM public.profiles
ORDER BY created_at DESC;
