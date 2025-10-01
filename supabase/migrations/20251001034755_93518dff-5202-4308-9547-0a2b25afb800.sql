-- Create storage bucket for discussion images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('discussion-images', 'discussion-images', true)
ON CONFLICT (id) DO NOTHING;