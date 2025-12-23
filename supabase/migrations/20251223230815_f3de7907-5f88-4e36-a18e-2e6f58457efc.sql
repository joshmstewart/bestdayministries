-- Create drink_vibes table
CREATE TABLE public.drink_vibes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  atmosphere_hint TEXT NOT NULL,
  emoji TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drink_vibes ENABLE ROW LEVEL SECURITY;

-- Public read access for active vibes
CREATE POLICY "Anyone can view active vibes"
ON public.drink_vibes
FOR SELECT
USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage vibes"
ON public.drink_vibes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Insert default vibes
INSERT INTO public.drink_vibes (name, description, atmosphere_hint, emoji, display_order) VALUES
('Christmas', 'Warm and festive holiday spirit', 'cozy winter scene with snow, warm fireplace glow, red and green accents, twinkling lights, pine branches and holly', '🎄', 1),
('Spooky', 'Dark and mysterious Halloween vibes', 'eerie purple and green mist, full moon, gothic shadows, cobwebs, mysterious fog, haunted atmosphere', '👻', 2),
('Beach', 'Tropical paradise relaxation', 'sunny tropical beach, crystal blue water, palm trees, golden sand, seashells, ocean breeze feeling', '🏖️', 3),
('Cyberpunk', 'Neon-lit futuristic dystopia', 'neon pink and cyan lights, rain-slicked streets, holographic displays, futuristic cityscape, chrome and glass', '🤖', 4),
('Ancient Greece', 'Classical Mediterranean elegance', 'marble columns, olive branches, Mediterranean blue sea, golden sunlight, amphitheater, grape vines', '🏛️', 5),
('Enchanted Forest', 'Magical woodland mystery', 'glowing mushrooms, fairy lights, ancient trees, mystical fog, magical creatures silhouettes, bioluminescence', '🧚', 6),
('Retro Diner', '1950s Americana nostalgia', 'chrome and neon signs, checkered floors, jukebox, milkshake glasses, vintage red vinyl booths', '🍔', 7),
('Space Odyssey', 'Cosmic adventure among the stars', 'galaxies and nebulae, floating asteroids, spaceship interior, Earth from orbit, cosmic purple and blue', '🚀', 8),
('Underwater Kingdom', 'Deep sea aquatic wonder', 'coral reefs, bioluminescent fish, sunbeams through water, treasure chests, mermaids silhouette', '🧜', 9),
('Steampunk', 'Victorian industrial fantasy', 'brass gears and cogs, steam pipes, clockwork mechanisms, leather and copper, vintage goggles', '⚙️', 10),
('Japanese Garden', 'Zen tranquility and harmony', 'cherry blossoms, koi pond, bamboo, stone lanterns, peaceful bridge, soft pink and green', '🌸', 11),
('Wild West', 'Frontier adventure spirit', 'desert sunset, cacti silhouettes, wooden saloon, tumbleweeds, cowboy boots, dusty trails', '🤠', 12),
('Candy Land', 'Sweet whimsical wonderland', 'lollipop trees, candy cane fences, gummy bear friends, cotton candy clouds, rainbow colors', '🍭', 13),
('Northern Lights', 'Arctic magical phenomenon', 'aurora borealis dancing, snow-covered mountains, starry night sky, ice crystals, ethereal green glow', '🌌', 14),
('Pirate Adventure', 'Swashbuckling sea tales', 'treasure map, wooden ship deck, skull and crossbones, tropical island, golden coins', '🏴‍☠️', 15),
('Vaporwave', 'Retro-futuristic aesthetic', 'pink and purple gradients, Greek statues, palm trees, sunset grids, 80s computer graphics', '📼', 16),
('Cozy Cabin', 'Warm rustic comfort', 'log cabin interior, crackling fireplace, plaid blankets, hot cocoa, snowy window view', '🏔️', 17),
('Art Deco', '1920s glamorous elegance', 'gold geometric patterns, black marble, champagne glasses, jazz age sophistication, gatsby style', '🎷', 18),
('Tropical Rainforest', 'Lush jungle paradise', 'exotic flowers, toucan birds, waterfall, dense green foliage, misty atmosphere, butterflies', '🦜', 19),
('Midnight Garden', 'Romantic nocturnal beauty', 'moonlit roses, fireflies, gothic iron gates, starry sky, mysterious shadows, night-blooming flowers', '🌙', 20),
('Cartoon World', 'Animated playful fun', 'bold outlines, bright primary colors, exaggerated expressions, comic book style, pop art elements', '🎨', 21),
('Abstract Art', 'Modern artistic expression', 'geometric shapes, bold color blocks, fluid forms, Kandinsky-inspired, contemporary gallery feel', '🔶', 22),
('Fairy Tale', 'Once upon a time magic', 'enchanted castle, magical creatures, storybook pages, golden crowns, happily ever after glow', '👑', 23),
('Neon Arcade', '80s gaming nostalgia', 'pixel art elements, arcade cabinet glow, joysticks, high score displays, synthwave colors', '🕹️', 24);

-- Create updated_at trigger
CREATE TRIGGER update_drink_vibes_updated_at
BEFORE UPDATE ON public.drink_vibes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();