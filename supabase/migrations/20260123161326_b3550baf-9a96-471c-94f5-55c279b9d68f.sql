-- Add category column to app_configurations table
ALTER TABLE public.app_configurations 
ADD COLUMN category text DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.app_configurations.category IS 'The category this app belongs to: games, resources, content, or user';