-- Create table for memory match pack ideas
CREATE TABLE public.memory_match_pack_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memory_match_pack_ideas ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using get_user_role function
CREATE POLICY "Admins can view pack ideas"
  ON public.memory_match_pack_ideas
  FOR SELECT
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

CREATE POLICY "Admins can insert pack ideas"
  ON public.memory_match_pack_ideas
  FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

CREATE POLICY "Admins can update pack ideas"
  ON public.memory_match_pack_ideas
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

CREATE POLICY "Admins can delete pack ideas"
  ON public.memory_match_pack_ideas
  FOR DELETE
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Seed with a variety of pack ideas
INSERT INTO public.memory_match_pack_ideas (name, description) VALUES
  ('Coffee Shop', 'Cozy coffee house essentials - lattes, beans, pastries, and barista tools'),
  ('Space Exploration', 'Rockets, planets, astronauts, and cosmic wonders'),
  ('Ocean Life', 'Underwater creatures and marine treasures'),
  ('Garden & Flowers', 'Beautiful blooms, plants, and gardening tools'),
  ('Kitchen Essentials', 'Cooking utensils, appliances, and culinary delights'),
  ('Musical Instruments', 'Guitars, drums, pianos, and orchestral instruments'),
  ('World Landmarks', 'Famous monuments and architectural wonders'),
  ('Vintage Cars', 'Classic automobiles from different eras'),
  ('Camping & Outdoors', 'Tents, campfires, hiking gear, and nature'),
  ('Bakery Treats', 'Breads, cakes, cookies, and baking supplies'),
  ('Sports Equipment', 'Balls, rackets, and athletic gear from various sports'),
  ('Art Supplies', 'Paints, brushes, canvases, and creative tools'),
  ('Tropical Paradise', 'Palm trees, beaches, exotic fruits, and island life'),
  ('Winter Wonderland', 'Snowflakes, mittens, hot cocoa, and cozy winter items'),
  ('Farm Animals', 'Friendly farm creatures and rural life'),
  ('Jungle Safari', 'Wild animals and exotic jungle scenery'),
  ('Breakfast Time', 'Pancakes, eggs, cereal, and morning favorites'),
  ('Construction Zone', 'Hard hats, bulldozers, and building materials'),
  ('Candy Shop', 'Colorful sweets, lollipops, and confections'),
  ('Movie Night', 'Popcorn, tickets, film reels, and cinema classics'),
  ('Dinosaurs', 'Prehistoric creatures and fossils'),
  ('Weather & Seasons', 'Sun, rain, snow, and seasonal symbols'),
  ('Tools & Hardware', 'Hammers, wrenches, and workshop essentials'),
  ('Fruits & Vegetables', 'Fresh produce from the garden'),
  ('Desserts', 'Ice cream, pies, puddings, and sweet treats'),
  ('Birds', 'Colorful feathered friends from around the world'),
  ('Butterflies & Insects', 'Beautiful winged creatures and bugs'),
  ('Sushi & Japanese Food', 'Rolls, sashimi, and traditional Japanese cuisine'),
  ('Pizza Party', 'Slices, toppings, and Italian favorites'),
  ('Spa & Wellness', 'Candles, towels, and relaxation essentials'),
  ('Autumn Harvest', 'Pumpkins, leaves, and fall festivities'),
  ('Spring Garden', 'Blossoms, bunnies, and renewal'),
  ('Beach Day', 'Sandcastles, surfboards, and seaside fun'),
  ('Pets', 'Dogs, cats, hamsters, and beloved companions'),
  ('Fairy Tales', 'Castles, crowns, and storybook magic'),
  ('Pirates', 'Ships, treasure chests, and swashbuckling adventure'),
  ('Wild West', 'Cowboys, horses, and frontier life'),
  ('Ancient Egypt', 'Pyramids, pharaohs, and hieroglyphics'),
  ('Medieval Times', 'Knights, castles, and royal courts'),
  ('Circus', 'Clowns, acrobats, and big top excitement');