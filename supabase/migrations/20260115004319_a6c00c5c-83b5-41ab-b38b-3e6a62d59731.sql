-- Add user_id column to allow custom activities
ALTER TABLE workout_activities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_workout_activities_user_id ON workout_activities(user_id);

-- Update RLS to allow users to manage their own custom activities
DROP POLICY IF EXISTS "Anyone can read active workout activities" ON workout_activities;

CREATE POLICY "Users can read active activities or their own"
ON workout_activities FOR SELECT
USING (
  (is_active = true AND user_id IS NULL) 
  OR user_id = auth.uid()
);

CREATE POLICY "Users can create custom activities"
ON workout_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their custom activities"
ON workout_activities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their custom activities"
ON workout_activities FOR DELETE
USING (auth.uid() = user_id);

-- Add more activities (admin-managed, user_id = NULL)
INSERT INTO workout_activities (name, description, icon, category, display_order, is_active) VALUES
-- Walking & Running
('Trail Hiking', 'Hiking on nature trails', '🥾', 'walking', 6, true),
('Treadmill Walk', 'Walking on a treadmill', '🏃', 'walking', 7, true),
('Dog Walking', 'Walking with your dog', '🐕', 'walking', 8, true),
('Speed Walking', 'Fast-paced power walking', '🚶‍♂️', 'walking', 9, true),

-- Sports & Play
('Tennis', 'Playing tennis or racquetball', '🎾', 'play', 10, true),
('Volleyball', 'Beach or indoor volleyball', '🏐', 'play', 11, true),
('Golf', 'Playing golf (walking course)', '⛳', 'play', 12, true),
('Bowling', 'Bowling at the alley', '🎳', 'play', 13, true),
('Frisbee', 'Playing frisbee or disc golf', '🥏', 'play', 14, true),
('Skateboarding', 'Skateboarding or rollerblading', '🛹', 'play', 15, true),
('Ice Skating', 'Ice or roller skating', '⛸️', 'play', 16, true),
('Horseback Riding', 'Riding horses', '🐴', 'play', 17, true),
('Kayaking', 'Kayaking or canoeing', '🛶', 'play', 18, true),
('Rock Climbing', 'Indoor or outdoor climbing', '🧗', 'play', 19, true),

-- Home Exercise
('Pilates', 'Pilates exercises', '🧘‍♀️', 'home', 20, true),
('Resistance Bands', 'Working out with bands', '💪', 'home', 21, true),
('Jumping Rope', 'Jump rope cardio', '🪢', 'home', 22, true),
('Push-ups', 'Push-up exercises', '🫸', 'home', 23, true),
('Sit-ups', 'Core and ab exercises', '🏋️', 'home', 24, true),
('Squats', 'Squat exercises', '🦵', 'home', 25, true),
('Lunges', 'Lunge exercises', '🚶', 'home', 26, true),
('Planks', 'Plank holds', '🧱', 'home', 27, true),
('Burpees', 'Full body burpees', '💥', 'home', 28, true),
('Stair Climbing', 'Climbing stairs', '🪜', 'home', 29, true),
('Elliptical', 'Elliptical machine workout', '🔄', 'home', 30, true),
('Rowing Machine', 'Indoor rowing', '🚣', 'home', 31, true),
('Stationary Bike', 'Indoor cycling', '🚴', 'home', 32, true),
('Aerobics', 'Aerobic exercises', '🕺', 'home', 33, true),
('Kickboxing', 'Kickboxing workout', '🥊', 'home', 34, true),

-- General/Other
('Gardening', 'Yard work and gardening', '🌱', 'general', 35, true),
('Cleaning', 'House cleaning activities', '🧹', 'general', 36, true),
('Shoveling', 'Shoveling snow or dirt', '⛏️', 'general', 37, true),
('Moving/Lifting', 'Moving furniture or boxes', '📦', 'general', 38, true),
('Martial Arts', 'Karate, judo, etc.', '🥋', 'general', 39, true),
('Tai Chi', 'Tai chi practice', '☯️', 'general', 40, true),
('Water Aerobics', 'Pool exercises', '🏊', 'general', 41, true)
ON CONFLICT DO NOTHING;