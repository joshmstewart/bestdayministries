-- Add cc_emails column to contact_form_replies to track which emails were CC'd on each reply
ALTER TABLE public.contact_form_replies 
ADD COLUMN cc_emails text[] DEFAULT NULL;