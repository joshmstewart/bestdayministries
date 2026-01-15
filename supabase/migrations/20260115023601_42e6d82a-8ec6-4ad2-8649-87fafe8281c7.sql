-- Create a function to increment plays_count
CREATE OR REPLACE FUNCTION increment_beat_plays(beat_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE beat_pad_creations 
  SET plays_count = COALESCE(plays_count, 0) + 1
  WHERE id = beat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;