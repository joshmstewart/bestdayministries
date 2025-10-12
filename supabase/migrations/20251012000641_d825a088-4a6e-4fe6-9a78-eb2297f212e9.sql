
-- Fix any remaining SECURITY DEFINER views by ensuring all public views use security_invoker
-- This addresses the Supabase linter warning about SECURITY DEFINER views

-- First, let's check if any views exist and fix them
DO $$
DECLARE
  view_record RECORD;
BEGIN
  -- Loop through all views in the public schema
  FOR view_record IN 
    SELECT schemaname, viewname
    FROM pg_views 
    WHERE schemaname = 'public'
  LOOP
    -- Set security_invoker = true for each view to ensure it runs with the invoker's permissions
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', 
                   view_record.schemaname, 
                   view_record.viewname);
    
    RAISE NOTICE 'Fixed view: %.%', view_record.schemaname, view_record.viewname;
  END LOOP;
  
  -- If no views were found, log that
  IF NOT FOUND THEN
    RAISE NOTICE 'No views found in public schema';
  END IF;
END $$;

-- Also ensure that any future views created will default to security_invoker behavior
-- by documenting this requirement in comments
COMMENT ON SCHEMA public IS 'All views in this schema should be created with security_invoker = true to prevent RLS bypass';
