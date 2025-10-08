-- Reduce time estimates for tours to be more realistic
UPDATE help_tours 
SET duration_minutes = CASE 
  WHEN title = 'Community Page Tour' THEN 1
  WHEN title = 'Creating a Post' THEN 2
  WHEN title = 'Vendor Dashboard Tour' THEN 3
  ELSE duration_minutes
END
WHERE is_active = true;

-- Reduce reading time estimates for guides to be more realistic
UPDATE help_guides 
SET reading_time_minutes = CASE 
  WHEN title = 'Welcome to Best Day Ever' THEN 2
  WHEN title = 'Creating Your Profile' THEN 4
  WHEN title = 'Guardian Guide: Linking with Besties' THEN 6
  WHEN title = 'Approving Content' THEN 7
  WHEN title = 'How to Sponsor a Bestie' THEN 10
  ELSE reading_time_minutes
END
WHERE is_active = true;