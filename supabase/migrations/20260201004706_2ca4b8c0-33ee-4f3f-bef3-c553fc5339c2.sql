-- Update Tired to be neutral category (it was likely set to negative)
UPDATE emotion_types 
SET category = 'neutral'
WHERE name = 'Tired';