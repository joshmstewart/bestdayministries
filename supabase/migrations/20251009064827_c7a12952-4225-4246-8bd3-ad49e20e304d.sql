-- Add reply_from_email field to contact_form_settings
ALTER TABLE public.contact_form_settings
ADD COLUMN reply_from_email TEXT NOT NULL DEFAULT 'noreply@yourdomain.com';

-- Add reply_from_name field to contact_form_settings
ALTER TABLE public.contact_form_settings
ADD COLUMN reply_from_name TEXT NOT NULL DEFAULT 'Joy House';