
-- Add new base drink options
INSERT INTO public.drink_ingredients (name, category, description, color_hint, display_order, is_active)
VALUES
  ('Smoothie', 'base', 'Creamy blended fruit base', '#FF6B9D', 11, true),
  ('Orange Juice', 'base', 'Fresh squeezed citrus', '#FFA500', 12, true),
  ('Milkshake', 'base', 'Rich creamy ice cream base', '#F5DEB3', 13, true),
  ('Root Beer', 'base', 'Classic root beer soda', '#4A3728', 14, true),
  ('Cream Soda', 'base', 'Sweet vanilla fizz', '#FFD700', 15, true),
  ('Cola', 'base', 'Classic cola flavor', '#3D2314', 16, true),
  ('Lemon-Lime Soda', 'base', 'Citrus sparkling refresher', '#ADFF2F', 17, true),
  ('Sparkling Water', 'base', 'Plain bubbly base for infusions', '#E0F7FA', 18, true),
  ('Green Smoothie', 'base', 'Spinach and fruit wellness blend', '#7CB342', 19, true),
  ('Protein Shake', 'base', 'Vanilla protein base', '#D2B48C', 20, true);
