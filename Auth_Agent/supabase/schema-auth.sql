-- Auth Agent - User Authentication Schema Extension
-- This extends the main schema to link agents and clients with Supabase Auth users

-- Add user_id column to agents table to link with auth.users
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to clients table to link with auth.users
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add role column to track user types (admin, agent_owner, website_developer)
CREATE TYPE user_role AS ENUM ('admin', 'agent_owner', 'website_developer');

-- User profiles table to store additional user information
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'agent_owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ====================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Users can view their own agents
CREATE POLICY "Users can view own agents"
ON agents FOR SELECT
USING (auth.uid() = user_id);

-- Users can create agents (will be linked to their user_id)
CREATE POLICY "Users can create own agents"
ON agents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own agents
CREATE POLICY "Users can update own agents"
ON agents FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own agents
CREATE POLICY "Users can delete own agents"
ON agents FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all agents
CREATE POLICY "Admins can view all agents"
ON agents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- Service role can access all agents (for authentication endpoint)
-- This is critical - the workers use service role to authenticate agents
CREATE POLICY "Service role can do everything on agents" ON agents
    FOR ALL USING (true);

-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Users can view their own clients
CREATE POLICY "Users can view own clients"
ON clients FOR SELECT
USING (auth.uid() = user_id);

-- Users can create clients (will be linked to their user_id)
CREATE POLICY "Users can create own clients"
ON clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own clients
CREATE POLICY "Users can update own clients"
ON clients FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own clients
CREATE POLICY "Users can delete own clients"
ON clients FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all clients
CREATE POLICY "Admins can view all clients"
ON clients FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- Service role can access all clients (for OAuth endpoints)
CREATE POLICY "Service role can do everything on clients" ON clients
    FOR ALL USING (true);

-- ====================================
-- FUNCTIONS
-- ====================================

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'agent_owner' -- Default role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- SEED ADMIN USER (Optional)
-- ====================================
-- Note: You'll need to manually set a user's role to 'admin' in the database
-- after they sign up for the first time
-- Example:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';
