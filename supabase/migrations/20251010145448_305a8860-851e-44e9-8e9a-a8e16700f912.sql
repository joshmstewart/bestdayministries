-- Create issue_reports table for bug reporting
CREATE TABLE IF NOT EXISTS public.issue_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  current_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  browser_info JSONB,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create issue reports"
  ON public.issue_reports
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own reports"
  ON public.issue_reports
  FOR SELECT
  USING (auth.uid() = user_id OR user_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can view all reports"
  ON public.issue_reports
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update reports"
  ON public.issue_reports
  FOR UPDATE
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete reports"
  ON public.issue_reports
  FOR DELETE
  USING (has_admin_access(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_issue_reports_updated_at
  BEFORE UPDATE ON public.issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify admins of new reports
CREATE OR REPLACE FUNCTION public.notify_admins_of_issue_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notify all admins/owners about new issue reports
  FOR admin_record IN
    SELECT user_id
    FROM user_roles
    WHERE role IN ('admin', 'owner')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      admin_record.user_id,
      'issue_report',
      'New Issue Report',
      NEW.title,
      '/admin?tab=issues',
      jsonb_build_object(
        'report_id', NEW.id,
        'priority', NEW.priority
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to notify admins when new report is created
CREATE TRIGGER notify_admins_on_new_issue_report
  AFTER INSERT ON public.issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_of_issue_report();