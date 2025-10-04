# Database Setup Instructions

## Problem
The search functionality wasn't working because Row Level Security (RLS) policies were not properly configured on the Supabase database tables. Without these policies, authenticated users couldn't read other users' profiles, making search impossible.

## Solution
Run the SQL scripts in order to set up the complete database schema with proper RLS policies.

## How to Run the Scripts

### Option 1: Run in v0 (Recommended)
The scripts are in the `/scripts` folder and can be executed directly from v0:
1. Click the "Run" button next to each script file in order (01, 02, 03, 04)
2. Wait for each script to complete before running the next one

### Option 2: Run in Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each script in order:
   - `01-create-tables.sql` - Creates all necessary tables
   - `02-enable-rls.sql` - Enables Row Level Security
   - `03-create-rls-policies.sql` - Creates security policies
   - `04-create-functions.sql` - Creates helper functions and triggers
4. Run each script by clicking "Run"

## What These Scripts Do

### 01-create-tables.sql
- Creates `profiles`, `friend_requests`, `friendships`, `chats`, and `messages` tables
- Sets up proper foreign key relationships
- Creates indexes for better query performance

### 02-enable-rls.sql
- Enables Row Level Security on all tables
- This ensures that users can only access data they're authorized to see

### 03-create-rls-policies.sql
- **Profiles**: Allows all authenticated users to read any profile (needed for search!)
- **Friend Requests**: Users can only see requests they sent or received
- **Friendships**: Users can only see friendships they're part of
- **Chats**: Users can only access chats they're part of
- **Messages**: Users can only read/write messages in their chats

### 04-create-functions.sql
- Auto-creates profile when user signs up
- Auto-updates `updated_at` timestamps

## After Running Scripts

Your app will now work correctly:
1. ✅ Search will find users by username
2. ✅ Friend requests can be sent and received
3. ✅ Accepting requests creates friendships and chats
4. ✅ Messages are properly secured to chat participants only

## Verification

After running the scripts, test the search:
1. Log in as one user
2. Search for another user's username (e.g., "vasantjv2005")
3. You should see the user appear in search results
4. Send a friend request
5. Log in as the other user and accept the request
6. Start chatting!
