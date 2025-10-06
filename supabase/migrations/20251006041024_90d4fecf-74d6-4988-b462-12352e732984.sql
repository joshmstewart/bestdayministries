-- Create receipt settings table for admin-managed receipt content
CREATE TABLE IF NOT EXISTS public.receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL DEFAULT 'Best Day Ministries',
  tax_id TEXT NOT NULL DEFAULT '508(c)(1)(a)',
  receipt_message TEXT NOT NULL DEFAULT 'Thank you for your generous sponsorship! Your contribution helps create meaningful employment opportunities for our special needs community.',
  tax_deductible_notice TEXT NOT NULL DEFAULT 'Best Day Ministries is a 508(c)(1)(a) faith-based organization. Your donation is tax-deductible to the fullest extent allowed by law. Please consult your tax advisor for specific guidance.',
  from_email TEXT NOT NULL DEFAULT 'Best Day Ministries <onboarding@resend.dev>',
  reply_to_email TEXT,
  organization_address TEXT,
  website_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage receipt settings
CREATE POLICY "Admins can manage receipt settings"
ON public.receipt_settings
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Public can view receipt settings (needed for edge function)
CREATE POLICY "Public can view receipt settings"
ON public.receipt_settings
FOR SELECT
USING (true);

-- Insert default receipt settings
INSERT INTO public.receipt_settings (
  organization_name,
  tax_id,
  receipt_message,
  tax_deductible_notice,
  from_email,
  website_url
) VALUES (
  'Best Day Ministries',
  '508(c)(1)(a)',
  'Thank you for your generous sponsorship! Your contribution helps create meaningful employment opportunities for our special needs community.',
  'Best Day Ministries is a 508(c)(1)(a) faith-based organization. Your donation is tax-deductible to the fullest extent allowed by law. Please consult your tax advisor for specific guidance.',
  'Best Day Ministries <onboarding@resend.dev>',
  'https://bestdayministries.org'
);