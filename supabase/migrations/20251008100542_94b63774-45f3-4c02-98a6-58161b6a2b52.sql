-- Add route column to help_tours for page navigation
ALTER TABLE public.help_tours 
ADD COLUMN required_route text;

-- Update existing tours with their required routes
UPDATE public.help_tours 
SET required_route = '/community' 
WHERE title = 'Community Page Tour';

UPDATE public.help_tours 
SET required_route = '/discussions' 
WHERE title = 'Creating a Post';

UPDATE public.help_tours 
SET required_route = '/vendor-dashboard' 
WHERE title = 'Vendor Dashboard Tour';