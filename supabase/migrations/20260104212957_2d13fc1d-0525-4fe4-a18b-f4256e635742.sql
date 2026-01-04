-- Create picture_passwords table
CREATE TABLE public.picture_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  picture_sequence TEXT[] NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_picture_password UNIQUE(user_id),
  CONSTRAINT unique_picture_sequence UNIQUE(picture_sequence),
  CONSTRAINT valid_sequence_length CHECK (array_length(picture_sequence, 1) = 4)
);

-- Enable RLS
ALTER TABLE public.picture_passwords ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own picture password
CREATE POLICY "Users can view own picture password"
ON public.picture_passwords FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own picture password"
ON public.picture_passwords FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own picture password"
ON public.picture_passwords FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own picture password"
ON public.picture_passwords FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Guardians can manage linked besties' picture passwords
CREATE POLICY "Guardians can view linked besties picture passwords"
ON public.picture_passwords FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid() 
    AND bestie_id = picture_passwords.user_id
  )
);

CREATE POLICY "Guardians can insert linked besties picture passwords"
ON public.picture_passwords FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid() 
    AND bestie_id = picture_passwords.user_id
  )
);

CREATE POLICY "Guardians can update linked besties picture passwords"
ON public.picture_passwords FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid() 
    AND bestie_id = picture_passwords.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid() 
    AND bestie_id = picture_passwords.user_id
  )
);

CREATE POLICY "Guardians can delete linked besties picture passwords"
ON public.picture_passwords FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links
    WHERE caregiver_id = auth.uid() 
    AND bestie_id = picture_passwords.user_id
  )
);

-- Admins can view all picture passwords (for support)
CREATE POLICY "Admins can view all picture passwords"
ON public.picture_passwords FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Create index for fast lookups during login
CREATE INDEX idx_picture_passwords_sequence ON public.picture_passwords USING GIN (picture_sequence);

-- Create picture_password_attempts table for rate limiting
CREATE TABLE public.picture_password_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  was_successful BOOLEAN NOT NULL DEFAULT false
);

-- Index for rate limiting queries
CREATE INDEX idx_picture_attempts_ip_time ON public.picture_password_attempts(ip_address, attempted_at);

-- Enable RLS (but allow inserts from edge functions via service role)
ALTER TABLE public.picture_password_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage attempts (edge functions)
CREATE POLICY "Service role manages attempts"
ON public.picture_password_attempts FOR ALL
USING (false)
WITH CHECK (false);

-- Trigger to update updated_at
CREATE TRIGGER update_picture_passwords_updated_at
  BEFORE UPDATE ON public.picture_passwords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();