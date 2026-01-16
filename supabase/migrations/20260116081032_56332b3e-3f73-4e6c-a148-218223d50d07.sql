-- Fitness Avatars System

-- Table for fitness avatar characters
CREATE TABLE public.fitness_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  character_prompt TEXT NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT false,
  price_coins INTEGER NOT NULL DEFAULT 100,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for user's selected/purchased fitness avatars
CREATE TABLE public.user_fitness_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id UUID NOT NULL REFERENCES public.fitness_avatars(id) ON DELETE CASCADE,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, avatar_id)
);

-- Table for AI-generated workout images
CREATE TABLE public.workout_generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id UUID NOT NULL REFERENCES public.fitness_avatars(id) ON DELETE CASCADE,
  workout_log_id UUID REFERENCES public.user_workout_logs(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('activity', 'celebration')),
  activity_name TEXT,
  is_shared_to_community BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for likes on generated images
CREATE TABLE public.workout_image_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES public.workout_generated_images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(image_id, user_id)
);

-- Enable RLS
ALTER TABLE public.fitness_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fitness_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_image_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fitness_avatars (public read, admin write)
CREATE POLICY "Anyone can view active fitness avatars"
  ON public.fitness_avatars FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage fitness avatars"
  ON public.fitness_avatars FOR ALL
  USING (public.has_admin_access(auth.uid()));

-- RLS Policies for user_fitness_avatars
CREATE POLICY "Users can view their own avatars"
  ON public.user_fitness_avatars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own avatars"
  ON public.user_fitness_avatars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatars"
  ON public.user_fitness_avatars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatars"
  ON public.user_fitness_avatars FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for workout_generated_images
CREATE POLICY "Users can view their own generated images"
  ON public.workout_generated_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared community images"
  ON public.workout_generated_images FOR SELECT
  USING (is_shared_to_community = true);

CREATE POLICY "Users can insert their own images"
  ON public.workout_generated_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON public.workout_generated_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON public.workout_generated_images FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for workout_image_likes
CREATE POLICY "Anyone can view likes"
  ON public.workout_image_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own likes"
  ON public.workout_image_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.workout_image_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for generated workout images
INSERT INTO storage.buckets (id, name, public) VALUES ('workout-images', 'workout-images', true);

-- Storage policies
CREATE POLICY "Anyone can view workout images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workout-images');

CREATE POLICY "Authenticated users can upload workout images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'workout-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own workout images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'workout-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updating likes_count
CREATE OR REPLACE FUNCTION public.update_workout_image_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.workout_generated_images
    SET likes_count = likes_count + 1
    WHERE id = NEW.image_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.workout_generated_images
    SET likes_count = likes_count - 1
    WHERE id = OLD.image_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_workout_image_likes_count_trigger
AFTER INSERT OR DELETE ON public.workout_image_likes
FOR EACH ROW EXECUTE FUNCTION public.update_workout_image_likes_count();

-- Enable realtime for generated images
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_generated_images;

-- Insert default fitness avatars (3 free + 6 purchasable)
INSERT INTO public.fitness_avatars (name, description, character_prompt, is_free, price_coins, display_order) VALUES
('Sunny the Runner', 'A cheerful yellow character who loves to run', 'A cute cartoon yellow character with a round body, wearing running shoes and a red headband, with big expressive eyes and rosy cheeks, in a fun animated style similar to Adventure Time', true, 0, 1),
('Flex the Lifter', 'A strong purple character who lifts weights', 'A cute cartoon purple character with a round muscular body, wearing a tank top and wristbands, with big expressive eyes and a determined smile, in a fun animated style similar to Adventure Time', true, 0, 2),
('Zen the Yogi', 'A peaceful green character who practices yoga', 'A cute cartoon green character with a round body, wearing yoga pants, sitting in lotus pose with a serene expression, with big expressive eyes, in a fun animated style similar to Adventure Time', true, 0, 3),
('Splash the Swimmer', 'A cool blue character who loves swimming', 'A cute cartoon blue character with a round body, wearing swim goggles on head and a swimsuit, with big expressive eyes and fins for hands, in a fun animated style similar to Adventure Time', false, 150, 4),
('Bounce the Dancer', 'A lively pink character who dances everywhere', 'A cute cartoon pink character with a round body, wearing leg warmers and a sparkly outfit, striking a dance pose, with big expressive eyes and flowing hair, in a fun animated style similar to Adventure Time', false, 150, 5),
('Rocky the Climber', 'An adventurous orange character who climbs mountains', 'A cute cartoon orange character with a round body, wearing climbing gear and a helmet, with big expressive eyes and a brave expression, in a fun animated style similar to Adventure Time', false, 200, 6),
('Swift the Cyclist', 'A fast red character who loves biking', 'A cute cartoon red character with a round body, wearing a cycling helmet and jersey, with big expressive eyes and an excited expression, in a fun animated style similar to Adventure Time', false, 200, 7),
('Storm the Boxer', 'A fierce gray character who boxes', 'A cute cartoon gray character with a round body, wearing boxing gloves and shorts, with big expressive eyes and a focused expression, in a fun animated style similar to Adventure Time', false, 250, 8),
('Spark the Athlete', 'A golden character who excels at all sports', 'A cute cartoon golden/yellow character with a round body, wearing a medal and athletic outfit, with big expressive eyes and a champion pose, sparkles around them, in a fun animated style similar to Adventure Time', false, 300, 9);