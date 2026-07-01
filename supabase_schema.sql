-- Create the installations table
CREATE TABLE installations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  beneficiaryName text,
  beneficiaryAddress text,
  installerName text,
  installerMobile text,
  commissioningDate date,
  
  controllerId text,
  pumpId text,
  controllerVendorName text,
  perPanelKw text,
  pumpCapacity text,
  panelCount integer,
  motorHead text,
  motorCapacity text,
  motorSerialNumber text,
  motorManufactureName text,
  
  panels_almm jsonb,
  files_info jsonb,
  signature text,
  
  vendorRepresentativeName text
);

-- Note: You might want to enable Row Level Security (RLS) 
-- and set up policies depending on your authentication setup.
-- For simple anonymous submissions, you can allow insert for anon:
-- ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable insert for anonymous users" ON installations FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable select for anonymous users" ON installations FOR SELECT USING (true);
-- CREATE POLICY "Enable delete for anonymous users" ON installations FOR DELETE USING (true);
