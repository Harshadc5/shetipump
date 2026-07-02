-- 1. First, create the user_id column
ALTER TABLE installations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Delete the old "everyone can read" policy
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON installations;

-- 3. Allow Admins to see EVERYTHING (Change the email below to your real admin email!)
CREATE POLICY "Admins can see everything" ON installations
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'your.admin@email.com');

-- 4. Allow Fitters to ONLY see their own records
CREATE POLICY "Fitters can see their own records" ON installations
FOR SELECT TO authenticated
USING (user_id = auth.uid());
