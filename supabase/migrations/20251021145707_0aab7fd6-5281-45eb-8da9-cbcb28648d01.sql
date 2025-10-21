-- Update the Newsletter footer link to point to the correct page
UPDATE footer_links 
SET href = '/newsletter' 
WHERE label = 'Newsletter' AND href = '#';