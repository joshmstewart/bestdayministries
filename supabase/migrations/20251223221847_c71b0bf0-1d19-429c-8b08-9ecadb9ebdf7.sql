-- Add is_house_vendor flag to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_house_vendor boolean NOT NULL DEFAULT false;