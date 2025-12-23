-- Add many more drink ingredients
INSERT INTO drink_ingredients (name, category, description, display_order) VALUES
-- More Bases
('Decaf Espresso', 'base', 'Smooth espresso without the caffeine', 5),
('Dirty Chai', 'base', 'Chai with a shot of espresso', 6),
('Golden Milk', 'base', 'Turmeric-infused warm milk base', 7),
('Iced Tea', 'base', 'Refreshing brewed tea over ice', 8),
('Lemonade', 'base', 'Fresh squeezed lemonade base', 9),

-- More Flavors
('Mocha', 'flavor', 'Rich chocolate espresso flavor', 6),
('Peppermint', 'flavor', 'Cool refreshing mint', 7),
('Maple', 'flavor', 'Sweet maple syrup notes', 8),
('Coconut', 'flavor', 'Tropical coconut essence', 9),
('Pumpkin Spice', 'flavor', 'Warm autumn spices', 10),
('Brown Sugar', 'flavor', 'Deep caramelized sweetness', 11),
('Rose', 'flavor', 'Delicate floral notes', 12),
('Gingerbread', 'flavor', 'Spiced holiday warmth', 13),
('Toffee', 'flavor', 'Buttery toffee sweetness', 14),
('White Chocolate', 'flavor', 'Creamy white chocolate', 15),

-- More Toppings
('Oat Milk Foam', 'topping', 'Creamy oat milk cold foam', 6),
('Sweet Cream', 'topping', 'Vanilla sweet cream topping', 7),
('Cocoa Powder', 'topping', 'Dusted chocolate powder', 8),
('Crushed Oreo', 'topping', 'Cookie crumble topping', 9),
('Caramel Bits', 'topping', 'Crunchy caramel pieces', 10),
('Rainbow Sprinkles', 'topping', 'Colorful festive sprinkles', 11),
('Matcha Powder', 'topping', 'Green tea dusting', 12),
('Sea Salt', 'topping', 'Savory salt flakes', 13),
('Cookie Crumbs', 'topping', 'Sweet cookie pieces', 14),
('Boba Pearls', 'topping', 'Chewy tapioca pearls', 15),

-- Extras category
('Oat Milk', 'extra', 'Creamy oat-based milk', 1),
('Almond Milk', 'extra', 'Nutty almond milk', 2),
('Coconut Milk', 'extra', 'Tropical coconut milk', 3),
('Soy Milk', 'extra', 'Classic soy milk', 4),
('Extra Shot', 'extra', 'Double the espresso', 5),
('Decaf', 'extra', 'No caffeine option', 6),
('Sugar Free', 'extra', 'Zero sugar sweetener', 7),
('Extra Ice', 'extra', 'Extra cold and icy', 8),
('Light Ice', 'extra', 'Just a little ice', 9),
('No Ice', 'extra', 'Room temperature', 10)
ON CONFLICT DO NOTHING;