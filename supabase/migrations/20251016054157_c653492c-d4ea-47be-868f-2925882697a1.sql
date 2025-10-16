-- Delete test sponsorships
DELETE FROM sponsorships 
WHERE id IN (
  SELECT s.id 
  FROM sponsorships s 
  LEFT JOIN profiles p ON s.sponsor_id = p.id 
  LEFT JOIN profiles pb ON s.bestie_id = pb.id 
  WHERE p.display_name LIKE '%Test%' OR pb.display_name LIKE '%Test%'
);

-- Delete test featured besties
DELETE FROM featured_besties 
WHERE bestie_name LIKE '%Test%' OR bestie_name LIKE '%test%';