-- Newsletter Automations System
-- Event-triggered and drip campaign tables

-- Main automation rules table
CREATE TABLE public.newsletter_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'event' or 'drip'
  trigger_event TEXT, -- For event-triggered: 'user_signup', 'purchase', etc.
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused'
  campaign_id UUID REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  drip_sequence_id UUID, -- Will reference newsletter_drip_sequences
  conditions JSONB DEFAULT '{}', -- Additional trigger conditions
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_enrolled INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0
);

-- Drip sequences (multi-step email campaigns)
CREATE TABLE public.newsletter_drip_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  enrollment_trigger TEXT NOT NULL, -- What triggers enrollment
  status TEXT NOT NULL DEFAULT 'draft',
  exit_conditions JSONB DEFAULT '{}', -- When to unenroll users
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0
);

-- Individual steps in drip sequences
CREATE TABLE public.newsletter_drip_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.newsletter_drip_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  campaign_id UUID REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  delay_value INTEGER NOT NULL DEFAULT 0, -- Delay amount
  delay_unit TEXT NOT NULL DEFAULT 'days', -- 'hours', 'days', 'weeks'
  conditions JSONB DEFAULT '{}', -- Step-specific conditions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_number)
);

-- Track user enrollments in automations
CREATE TABLE public.newsletter_automation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  automation_id UUID REFERENCES public.newsletter_automations(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.newsletter_drip_sequences(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'exited'
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_send_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT enrollment_type_check CHECK (
    (automation_id IS NOT NULL AND sequence_id IS NULL) OR
    (automation_id IS NULL AND sequence_id IS NOT NULL)
  )
);

-- Automation execution logs
CREATE TABLE public.newsletter_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.newsletter_automation_enrollments(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.newsletter_automations(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.newsletter_drip_sequences(id) ON DELETE CASCADE,
  step_number INTEGER,
  action TEXT NOT NULL, -- 'enrolled', 'sent', 'skipped', 'exited'
  campaign_id UUID REFERENCES public.newsletter_campaigns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint for drip_sequence_id in automations
ALTER TABLE public.newsletter_automations 
  ADD CONSTRAINT fk_automation_drip_sequence 
  FOREIGN KEY (drip_sequence_id) 
  REFERENCES public.newsletter_drip_sequences(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX idx_automations_status ON public.newsletter_automations(status);
CREATE INDEX idx_automations_trigger ON public.newsletter_automations(trigger_type, trigger_event);
CREATE INDEX idx_drip_sequences_status ON public.newsletter_drip_sequences(status);
CREATE INDEX idx_drip_steps_sequence ON public.newsletter_drip_steps(sequence_id, step_number);
CREATE INDEX idx_enrollments_user ON public.newsletter_automation_enrollments(user_id);
CREATE INDEX idx_enrollments_status ON public.newsletter_automation_enrollments(status);
CREATE INDEX idx_enrollments_next_send ON public.newsletter_automation_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_automation_logs_enrollment ON public.newsletter_automation_logs(enrollment_id);
CREATE INDEX idx_automation_logs_created ON public.newsletter_automation_logs(created_at);

-- Enable RLS
ALTER TABLE public.newsletter_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_drip_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_automation_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage automations"
  ON public.newsletter_automations
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage drip sequences"
  ON public.newsletter_drip_sequences
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage drip steps"
  ON public.newsletter_drip_steps
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can view enrollments"
  ON public.newsletter_automation_enrollments
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "System can manage enrollments"
  ON public.newsletter_automation_enrollments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view automation logs"
  ON public.newsletter_automation_logs
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert logs"
  ON public.newsletter_automation_logs
  FOR INSERT
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_newsletter_automations_updated_at
  BEFORE UPDATE ON public.newsletter_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_drip_sequences_updated_at
  BEFORE UPDATE ON public.newsletter_drip_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.newsletter_automations IS 'Event-triggered and drip campaign automation rules';
COMMENT ON TABLE public.newsletter_drip_sequences IS 'Multi-step drip email sequences';
COMMENT ON TABLE public.newsletter_drip_steps IS 'Individual steps in drip sequences with delays';
COMMENT ON TABLE public.newsletter_automation_enrollments IS 'Track users enrolled in automations/sequences';
COMMENT ON TABLE public.newsletter_automation_logs IS 'Audit log of automation executions';