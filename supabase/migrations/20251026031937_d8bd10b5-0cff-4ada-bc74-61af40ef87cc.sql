-- Fix search_path security warning for activation functions
DROP FUNCTION IF EXISTS activate_collections_on_start_date();
CREATE OR REPLACE FUNCTION activate_collections_on_start_date()
RETURNS void AS $$
BEGIN
  UPDATE sticker_collections
  SET is_active = true
  WHERE start_date <= CURRENT_DATE 
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS deactivate_collections_after_end_date();
CREATE OR REPLACE FUNCTION deactivate_collections_after_end_date()
RETURNS void AS $$
BEGIN
  UPDATE sticker_collections
  SET is_active = false
  WHERE end_date IS NOT NULL 
    AND end_date < CURRENT_DATE
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;