-- Update any existing "Posts" navigation links to "Discussions"
UPDATE navigation_links 
SET label = 'Discussions' 
WHERE label = 'Posts' OR href = '/discussions';