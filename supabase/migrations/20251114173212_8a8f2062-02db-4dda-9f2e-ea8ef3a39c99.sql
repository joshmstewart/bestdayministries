-- Delete duplicate donations matching sponsorships
-- Remove the stripe_customer_id comparison since sponsorships may not have it populated
DELETE FROM donations d
WHERE d.id IN (
  SELECT d.id
  FROM donations d
  JOIN sponsorships s ON (
    (s.sponsor_email = d.donor_email AND d.donor_email IS NOT NULL) 
    OR (s.sponsor_id = d.donor_id AND d.donor_id IS NOT NULL)
  )
  WHERE d.created_at > '2025-01-01'
    AND s.amount = d.amount
    AND s.stripe_mode = d.stripe_mode
    AND ABS(EXTRACT(EPOCH FROM (d.created_at - s.started_at))) < 60
);