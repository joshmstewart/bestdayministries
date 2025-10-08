-- Add visible_to_roles array to help tables, replacing target_audience
ALTER TABLE help_tours 
ADD COLUMN visible_to_roles user_role[] DEFAULT ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[];

ALTER TABLE help_guides 
ADD COLUMN visible_to_roles user_role[] DEFAULT ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[];

ALTER TABLE help_faqs 
ADD COLUMN visible_to_roles user_role[] DEFAULT ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[];

-- Migrate existing target_audience data
UPDATE help_tours 
SET visible_to_roles = CASE 
  WHEN target_audience = 'all' THEN ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner', 'vendor']::user_role[]
  WHEN target_audience = 'caregiver' THEN ARRAY['caregiver']::user_role[]
  WHEN target_audience = 'bestie' THEN ARRAY['bestie']::user_role[]
  WHEN target_audience = 'supporter' THEN ARRAY['supporter']::user_role[]
  WHEN target_audience = 'vendor' THEN ARRAY['vendor']::user_role[]
  ELSE ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[]
END;

UPDATE help_guides 
SET visible_to_roles = CASE 
  WHEN target_audience = 'all' THEN ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner', 'vendor']::user_role[]
  WHEN target_audience = 'caregiver' THEN ARRAY['caregiver']::user_role[]
  WHEN target_audience = 'bestie' THEN ARRAY['bestie']::user_role[]
  WHEN target_audience = 'supporter' THEN ARRAY['supporter']::user_role[]
  WHEN target_audience = 'vendor' THEN ARRAY['vendor']::user_role[]
  ELSE ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[]
END;

UPDATE help_faqs 
SET visible_to_roles = CASE 
  WHEN target_audience = 'all' THEN ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner', 'vendor']::user_role[]
  WHEN target_audience = 'caregiver' THEN ARRAY['caregiver']::user_role[]
  WHEN target_audience = 'bestie' THEN ARRAY['bestie']::user_role[]
  WHEN target_audience = 'supporter' THEN ARRAY['supporter']::user_role[]
  WHEN target_audience = 'vendor' THEN ARRAY['vendor']::user_role[]
  ELSE ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[]
END;

-- Drop old target_audience columns
ALTER TABLE help_tours DROP COLUMN target_audience;
ALTER TABLE help_guides DROP COLUMN target_audience;
ALTER TABLE help_faqs DROP COLUMN target_audience;