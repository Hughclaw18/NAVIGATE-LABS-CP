-- user_settings table setup for Supabase
-- Run this SQL in the Supabase SQL Editor to set up the database properly

-- First, drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Users can read and update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;

-- Modify the table structure to include the auth.uid column
-- Only run this if your table is missing the user_id column
ALTER TABLE IF EXISTS user_settings
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing rows to set user_id based on email if possible
UPDATE user_settings
SET user_id = auth.users.id
FROM auth.users
WHERE user_settings.user_email = auth.users.email AND user_settings.user_id IS NULL;

-- Create the correct RLS policies
-- Enable RLS if not already enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT operations: Users can read their own settings
CREATE POLICY "Users can read their own settings"
ON user_settings
FOR SELECT
USING (
    auth.uid() = user_id 
    OR 
    user_email = auth.email()
);

-- Policy for INSERT operations: Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
ON user_settings
FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    OR 
    user_email = auth.email()
);

-- Policy for UPDATE operations: Users can update their own settings
CREATE POLICY "Users can update their own settings"
ON user_settings
FOR UPDATE
USING (
    auth.uid() = user_id 
    OR 
    user_email = auth.email()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_email ON user_settings(user_email);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create a function to automatically update user_id when a row is inserted
-- if only email is provided
CREATE OR REPLACE FUNCTION public.set_user_id_from_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL AND NEW.user_email IS NOT NULL THEN
        NEW.user_id := (SELECT id FROM auth.users WHERE email = NEW.user_email LIMIT 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set user_id
DROP TRIGGER IF EXISTS set_user_id_trigger ON user_settings;
CREATE TRIGGER set_user_id_trigger
BEFORE INSERT OR UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id_from_email();

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'user_settings';

-- List policies
SELECT * FROM pg_policies WHERE tablename = 'user_settings'; 