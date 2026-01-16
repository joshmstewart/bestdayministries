-- Add column to disable free shipping entirely
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS disable_free_shipping boolean NOT NULL DEFAULT false;