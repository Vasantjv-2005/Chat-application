# Troubleshooting Guide

## Issue: Friend requests not showing up

If you're experiencing issues where friend requests aren't appearing in the Requests tab, follow these steps:

### Step 1: Run the Diagnostic Script

Run `scripts/05-diagnostic-check.sql` in your Supabase SQL Editor. This will show you:
- Whether all tables exist
- Whether RLS is enabled on all tables
- What RLS policies are active
- What data is actually in your database

### Step 2: Verify RLS Policies

The diagnostic script will show you all active RLS policies. You should see these policies:

**For friend_requests table:**
- `friend_requests_select` - Allows users to read requests where they are sender OR receiver
- `friend_requests_insert` - Allows users to insert requests where they are the sender
- `friend_requests_update` - Allows users to update requests where they are the receiver

**For friendships table:**
- `friendships_select` - Allows users to read friendships where they are either user
- `friendships_insert` - Allows users to insert friendships

**For profiles table:**
- `profiles_select_all` - Allows all authenticated users to read all profiles (needed for search)
- `profiles_insert_own` - Allows users to insert their own profile
- `profiles_update_own` - Allows users to update their own profile

### Step 3: Check the Data

The diagnostic script will show you:
- All friend requests with sender/receiver usernames and status
- All friendships with both users' usernames
- All profiles

Look for:
1. Is the friend request in the database?
2. What is its status? (should be "pending" if not yet accepted)
3. Are the sender_id and receiver_id correct?

### Step 4: Re-run the RLS Scripts if Needed

If the policies are missing or incorrect, re-run these scripts in order:
1. `scripts/02-enable-rls.sql` - Enables RLS on all tables
2. `scripts/03-create-rls-policies.sql` - Creates the correct policies

**IMPORTANT:** The scripts use `DROP POLICY IF EXISTS` so they're safe to run multiple times.

### Step 5: Test the Flow

After verifying the policies are correct:

1. **User A (sender)** logs in and searches for User B
2. **User A** clicks "Add" to send a friend request
3. **User B (receiver)** logs in and clicks the "Requests" tab
4. **User B** should see the request and can click "Accept"
5. After accepting, both users should see each other in the "Friends" tab
6. Click on a friend to start chatting

### Common Issues

**Issue:** Search returns no results
- **Cause:** RLS policy `profiles_select_all` is missing
- **Fix:** Run `scripts/03-create-rls-policies.sql`

**Issue:** Friend request sent but receiver doesn't see it
- **Cause:** RLS policy `friend_requests_select` is missing or incorrect
- **Fix:** Run `scripts/03-create-rls-policies.sql`

**Issue:** Can't accept friend request
- **Cause:** RLS policy `friend_requests_update` is missing
- **Fix:** Run `scripts/03-create-rls-policies.sql`

**Issue:** After accepting, users don't see each other as friends
- **Cause:** RLS policy `friendships_select` or `friendships_insert` is missing
- **Fix:** Run `scripts/03-create-rls-policies.sql`

**Issue:** Can't send messages
- **Cause:** RLS policies for `chats` or `messages` tables are missing
- **Fix:** Run `scripts/03-create-rls-policies.sql`

### Debug Logs

Open your browser console (F12) to see detailed debug logs showing:
- User ID of logged-in user
- Search results
- Friend request API responses
- Friendship queries
- Real-time subscription events

Look for errors or unexpected values in the console.
