-- Create ambassador profiles table
CREATE TABLE public.ambassador_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ambassador_email TEXT NOT NULL UNIQUE, -- e.g., ambassador@bestdayministries.org
  personal_email TEXT NOT NULL, -- Their actual inbox where replies go
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ambassador email threads table
CREATE TABLE public.ambassador_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID NOT NULL REFERENCES public.ambassador_profiles(id) ON DELETE CASCADE,
  thread_key TEXT NOT NULL UNIQUE, -- Unique identifier for reply-to address
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ambassador email messages table
CREATE TABLE public.ambassador_email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ambassador_email_threads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  message_content TEXT NOT NULL,
  resend_email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ambassador_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_email_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ambassador_profiles
CREATE POLICY "Ambassadors can view own profile"
  ON public.ambassador_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ambassador profiles"
  ON public.ambassador_profiles FOR SELECT
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage ambassador profiles"
  ON public.ambassador_profiles FOR ALL
  USING (public.has_admin_access(auth.uid()));

-- RLS Policies for ambassador_email_threads
CREATE POLICY "Ambassadors can view own threads"
  ON public.ambassador_email_threads FOR SELECT
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassador_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins cannot view ambassador threads"
  ON public.ambassador_email_threads FOR SELECT
  USING (false);

-- RLS Policies for ambassador_email_messages
CREATE POLICY "Ambassadors can view own messages"
  ON public.ambassador_email_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT t.id FROM public.ambassador_email_threads t
      JOIN public.ambassador_profiles ap ON ap.id = t.ambassador_id
      WHERE ap.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins cannot view ambassador messages"
  ON public.ambassador_email_messages FOR SELECT
  USING (false);

-- Create indexes for performance
CREATE INDEX idx_ambassador_threads_ambassador ON public.ambassador_email_threads(ambassador_id);
CREATE INDEX idx_ambassador_threads_key ON public.ambassador_email_threads(thread_key);
CREATE INDEX idx_ambassador_messages_thread ON public.ambassador_email_messages(thread_id);
CREATE INDEX idx_ambassador_messages_created ON public.ambassador_email_messages(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_ambassador_profiles_updated_at
  BEFORE UPDATE ON public.ambassador_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();