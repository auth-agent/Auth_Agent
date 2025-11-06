-- Allow agent profiles by removing foreign key constraint on user_id
-- This allows profiles for agents that don't exist in auth.users

-- Drop the existing foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Drop any check constraints that might block NULL user_id
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_or_agent_check;

-- Add a new foreign key constraint that allows NULL or checks if user exists
-- We'll make it less restrictive by removing the NOT NULL requirement for agents
-- But keep the foreign key for regular users

-- First, make user_id nullable (optional for agents)
ALTER TABLE public.profiles 
ALTER COLUMN user_id DROP NOT NULL;

-- Re-add foreign key but only when user_id is not null (deferrable allows inserts)
-- This way regular users still get referential integrity
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Update RLS policies to allow inserts when user_id is NULL (for agents)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);

-- Also allow updates when user_id is NULL
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (
  auth.uid() = user_id OR user_id IS NULL
);

