-- Enable realtime for profiles table so coin updates are reflected in the UI
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;