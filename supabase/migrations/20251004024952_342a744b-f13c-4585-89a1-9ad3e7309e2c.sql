-- Create contact form settings table
CREATE TABLE IF NOT EXISTS public.contact_form_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL DEFAULT 'Contact Us',
  description TEXT NOT NULL DEFAULT 'Have questions? We''d love to hear from you.',
  recipient_email TEXT NOT NULL,
  success_message TEXT NOT NULL DEFAULT 'Thank you for contacting us! We''ll get back to you soon.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact form submissions table
CREATE TABLE IF NOT EXISTS public.contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_form_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_form_settings
CREATE POLICY "Contact form settings viewable by everyone"
  ON public.contact_form_settings
  FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Admins can manage contact form settings"
  ON public.contact_form_settings
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for contact_form_submissions
CREATE POLICY "Anyone can create submissions"
  ON public.contact_form_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all submissions"
  ON public.contact_form_submissions
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update submissions"
  ON public.contact_form_submissions
  FOR UPDATE
  USING (has_admin_access(auth.uid()));

-- Insert default settings
INSERT INTO public.contact_form_settings (recipient_email)
VALUES ('contact@bestdayministries.org')
ON CONFLICT DO NOTHING;