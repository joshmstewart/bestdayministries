-- Consolidate theme categories to 'themes'
UPDATE store_items 
SET category = 'themes' 
WHERE category = 'theme';