# Bug Fix: Agents Being Deleted When Users Are Deleted

## Problem

Agent credentials were becoming invalid after a few days. Investigation revealed that agents were being automatically deleted when their associated user account was deleted from `auth.users`.

## Root Cause

The database schema had a foreign key constraint with `ON DELETE CASCADE`:

```sql
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
```

This meant:
- When a user account is deleted (manually or automatically by Supabase for unverified accounts)
- All their agents are automatically deleted via CASCADE
- Agent credentials stop working even though they should be independent

## Why This Is Wrong

**Agents are credentials, not user data.** They should:
- Work independently of user account lifecycle
- Persist even if the user account is deleted
- Only be deleted when **explicitly deleted by the user via the console** (not when user account is deleted)

**Important distinction:**
- ✅ **User deletes agent via console** → Agent should be deleted (this works via RLS policy)
- ❌ **User account gets deleted** → Agents should NOT be deleted (this was the bug - CASCADE was deleting them)

## Solution

Changed the foreign key constraint from `ON DELETE CASCADE` to `ON DELETE SET NULL`:

```sql
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

Now:
- When a **user account is deleted**, `user_id` is set to `NULL` (agent is "orphaned")
- Agent credentials remain valid and functional
- Agent can still authenticate successfully
- Only the console management link is lost (user can't see it in console anymore)
- When a **user manually deletes an agent via console**, the agent is still deleted (RLS policy handles this correctly)

## Migration

Run the migration file:
```bash
# In Supabase SQL Editor or via migration tool
psql -f supabase/migration-fix-agent-cascade.sql
```

Or manually:
```sql
-- Drop existing constraint
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_user_id_fkey;

-- Re-add with SET NULL
ALTER TABLE agents
ADD CONSTRAINT agents_user_id_fkey
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;
```

## Impact

- ✅ **Existing agents**: Will continue working even if user is deleted
- ✅ **New agents**: Will persist independently of user account
- ✅ **Authentication**: No changes needed - `getAgent()` already works with NULL user_id
- ⚠️ **Console**: Orphaned agents (user_id = NULL) won't show in user's console, but credentials still work

## Testing

1. Create an agent via console
2. Delete the user account from Supabase Auth
3. Verify agent credentials still work for authentication
4. Verify agent record exists in database with `user_id = NULL`

## Related Files

- `supabase/schema-auth.sql` - Updated schema
- `supabase/migration-fix-agent-cascade.sql` - Migration script
- `workers/src/lib/db.ts` - `getAgent()` already handles NULL user_id correctly

