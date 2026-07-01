-- 1. First, we drop the old policies that allowed anyone on the internet to read/write
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON installations;
DROP POLICY IF EXISTS "Enable select for anonymous users" ON installations;
DROP POLICY IF EXISTS "Enable delete for anonymous users" ON installations;

-- 2. Make sure RLS is strictly enabled
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- 3. Create the new SECURE policies that ONLY allow logged-in users to access the data
-- Authenticated users (Fitters and Admins) can insert data
CREATE POLICY "Enable insert for authenticated users only" 
ON installations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Authenticated users (Admins) can read data
CREATE POLICY "Enable select for authenticated users only" 
ON installations 
FOR SELECT 
TO authenticated 
USING (true);

-- Authenticated users (Admins) can delete data (Optional, if you want admins to delete from the UI)
CREATE POLICY "Enable delete for authenticated users only" 
ON installations 
FOR DELETE 
TO authenticated 
USING (true);
