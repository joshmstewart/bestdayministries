-- Create table for avatar idea templates with archive support
CREATE TABLE public.fitness_avatar_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  character_type TEXT NOT NULL CHECK (character_type IN ('animal', 'human', 'superhero')),
  prompt TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fitness_avatar_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage avatar templates"
  ON public.fitness_avatar_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_fitness_avatar_templates_updated_at
  BEFORE UPDATE ON public.fitness_avatar_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the existing templates as active
INSERT INTO public.fitness_avatar_templates (name, character_type, prompt) VALUES
-- Animals
('Sporty Cat', 'animal', 'A friendly orange tabby cat with an athletic build, wearing a colorful headband and wristbands'),
('Power Panda', 'animal', 'A strong black and white panda bear with a muscular build, wearing athletic shorts and a tank top'),
('Flash Fox', 'animal', 'An energetic red fox with sleek fur, wearing running shoes and a tracksuit'),
('Mighty Mouse', 'animal', 'A small but determined gray mouse with big ears, wearing tiny workout gloves and sneakers'),
('Bounce Bunny', 'animal', 'A fluffy white rabbit with pink ears, athletic build, wearing a sports jersey'),
('Strong Bear', 'animal', 'A friendly brown bear with powerful arms, wearing gym clothes and lifting gloves'),
('Swift Deer', 'animal', 'A graceful spotted deer with long legs, wearing a runner''s outfit'),
('Flex Frog', 'animal', 'A bright green frog with strong legs, wearing athletic shorts and wristbands'),
('Dash Dog', 'animal', 'A golden retriever with a friendly face, wearing a sports bandana and running shoes'),
('Owl Coach', 'animal', 'A wise brown owl with big eyes, wearing a coach''s whistle and cap'),
('Tiger Trainer', 'animal', 'An orange tiger with black stripes, athletic build, wearing training gear'),
('Penguin Pal', 'animal', 'A cheerful black and white penguin, wearing a tiny workout headband'),
-- Humans
('Coach Casey', 'human', 'A friendly adult coach with short hair, warm smile, wearing athletic polo and whistle around neck'),
('Zara Zoom', 'human', 'A young Black girl with curly hair in puffs, athletic build, wearing bright colored activewear'),
('Marcus Move', 'human', 'A young Latino boy with wavy hair, enthusiastic expression, wearing basketball jersey'),
('Kim Kick', 'human', 'A young Asian girl with straight black hair in ponytail, wearing martial arts outfit'),
('Super Sam', 'human', 'A young boy with Down syndrome, big smile, wearing a superhero cape over workout clothes'),
('Wheels Wendy', 'human', 'A young girl in a sporty wheelchair, brown pigtails, wearing athletic gear, confident expression'),
('Jumping Jack', 'human', 'A young boy with red hair and freckles, energetic pose, wearing gym clothes'),
('Yoga Yara', 'human', 'A young South Asian girl with long braided hair, peaceful expression, wearing yoga attire'),
('Dancing Devon', 'human', 'A young nonbinary child with short colorful hair, wearing dance outfit with leg warmers'),
('Swimmer Sofia', 'human', 'A young girl with swim cap and goggles on head, athletic swimsuit, confident pose'),
('Runner Ray', 'human', 'A young African American boy with short hair, wearing running gear and race number'),
('Gymnast Grace', 'human', 'A young girl with hair in bun, wearing a sparkly leotard, graceful pose'),
-- Superheroes (new category)
('Captain Flex', 'superhero', 'An adult superhero with a cape and star emblem, athletic build, friendly smile, wearing red and blue costume'),
('Thunder Strike', 'superhero', 'A young adult hero with lightning bolt patterns on costume, electric aura, dynamic pose'),
('Iron Guardian', 'superhero', 'An armored hero with sleek tech suit, glowing chest piece, protective stance'),
('Blaze Runner', 'superhero', 'A speedster hero with flame trail effects, streamlined costume, running pose'),
('Cosmic Star', 'superhero', 'A cosmic hero with starfield patterns on costume, floating slightly, serene expression'),
('Shadow Swift', 'superhero', 'A ninja-style hero in dark outfit, athletic and agile, confident stance'),
('Frost Shield', 'superhero', 'An ice-powered hero with cool blue costume, ice crystal effects around hands'),
('Terra Titan', 'superhero', 'A strength hero with earth tones, rocky accents on costume, powerful stance'),
('Wind Warrior', 'superhero', 'A flying hero with wing-like cape, wind swirl effects, soaring pose'),
('Mystic Mage', 'superhero', 'A magical hero with glowing staff, mystical runes, flowing robes with athletic cut');