-- Create table to track terms and privacy policy acceptance
CREATE TABLE public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, terms_version, privacy_version)
);

-- Enable RLS
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptance records
CREATE POLICY "Users can view their own acceptance"
ON public.terms_acceptance
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own acceptance records
CREATE POLICY "Users can create their own acceptance"
ON public.terms_acceptance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all acceptance records
CREATE POLICY "Admins can view all acceptance"
ON public.terms_acceptance
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_terms_acceptance_user_id ON public.terms_acceptance(user_id);
CREATE INDEX idx_terms_acceptance_versions ON public.terms_acceptance(terms_version, privacy_version);

-- Store current terms versions in app_settings
INSERT INTO public.app_settings (setting_key, setting_value, updated_by)
VALUES 
  ('current_terms_version', '"1.0"'::jsonb, (SELECT id FROM auth.users WHERE email LIKE '%@lovable.app' LIMIT 1)),
  ('current_privacy_version', '"1.0"'::jsonb, (SELECT id FROM auth.users WHERE email LIKE '%@lovable.app' LIMIT 1))
ON CONFLICT (setting_key) DO NOTHING;