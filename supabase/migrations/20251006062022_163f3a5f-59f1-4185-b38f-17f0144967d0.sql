-- Create year-end summary settings table
CREATE TABLE IF NOT EXISTS public.year_end_summary_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_subject TEXT NOT NULL DEFAULT 'Your {year} Tax Summary from Best Day Ministries',
  email_intro_text TEXT NOT NULL DEFAULT 'Thank you for your generous support throughout {year}! Below is your year-end tax summary for your records.',
  tax_notice_text TEXT NOT NULL DEFAULT 'Best Day Ministries is a 501(c)(3) nonprofit organization. Your donations may be tax-deductible to the extent allowed by law. Please consult your tax advisor for specific guidance.',
  auto_send_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_send_month INTEGER NOT NULL DEFAULT 1 CHECK (auto_send_month >= 1 AND auto_send_month <= 12),
  auto_send_day INTEGER NOT NULL DEFAULT 15 CHECK (auto_send_day >= 1 AND auto_send_day <= 31),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create year-end summary sent history table
CREATE TABLE IF NOT EXISTS public.year_end_summary_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  tax_year INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resend_email_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.year_end_summary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.year_end_summary_sent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
CREATE POLICY "Admins can manage year-end settings"
  ON public.year_end_summary_settings
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Anyone can view year-end settings"
  ON public.year_end_summary_settings
  FOR SELECT
  USING (true);

-- RLS Policies for sent history
CREATE POLICY "Admins can view all sent summaries"
  ON public.year_end_summary_sent
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Users can view their own sent summaries"
  ON public.year_end_summary_sent
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sent summaries"
  ON public.year_end_summary_sent
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_year_end_summary_sent_user_year 
  ON public.year_end_summary_sent(user_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_year_end_summary_sent_sent_at 
  ON public.year_end_summary_sent(sent_at DESC);

-- Insert default settings
INSERT INTO public.year_end_summary_settings (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;