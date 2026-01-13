
-- Add fun, creative, and quirky sounds to the beat pad
INSERT INTO public.beat_pad_sounds (name, sound_type, emoji, color, frequency, decay, oscillator_type, has_noise, price_coins, description, is_default, is_active, display_order) VALUES
-- Brass & Winds
('Trombone', 'brass', '🎺', '#FFD700', 196, 0.8, 'sawtooth', false, 100, 'Classic trombone blat', false, true, 50),
('Trumpet', 'brass', '🎺', '#FFA500', 392, 0.6, 'sawtooth', false, 100, 'Bright trumpet hit', false, true, 51),
('Flute', 'wind', '🪈', '#87CEEB', 880, 0.5, 'sine', false, 80, 'Airy flute note', false, true, 52),
('Saxophone', 'brass', '🎷', '#CD853F', 294, 0.7, 'sawtooth', false, 120, 'Smooth sax note', false, true, 53),
('Tuba', 'brass', '📯', '#8B4513', 65, 1.0, 'sawtooth', false, 100, 'Deep tuba boom', false, true, 54),
('Harmonica', 'wind', '🎵', '#C0C0C0', 523, 0.4, 'square', false, 75, 'Blues harmonica', false, true, 55),

-- Strings
('Violin Pizz', 'strings', '🎻', '#8B0000', 440, 0.3, 'triangle', false, 90, 'Plucked violin string', false, true, 56),
('Cello', 'strings', '🎻', '#4A2C2A', 130, 0.9, 'sawtooth', false, 100, 'Rich cello tone', false, true, 57),
('Harp', 'strings', '🎵', '#FFB6C1', 523, 0.6, 'sine', false, 85, 'Heavenly harp gliss', false, true, 58),
('Banjo', 'strings', '🪕', '#DAA520', 392, 0.3, 'triangle', false, 80, 'Twangy banjo pluck', false, true, 59),

-- Fun Voices & Laughs
('Laugh', 'voice', '😂', '#FF69B4', 300, 0.5, 'sawtooth', true, 150, 'Hilarious laugh', false, true, 60),
('Evil Laugh', 'voice', '😈', '#800080', 150, 0.8, 'sawtooth', true, 150, 'Villainous cackle', false, true, 61),
('Yell', 'voice', '😱', '#FF4500', 400, 0.4, 'sawtooth', true, 100, 'Dramatic yell', false, true, 62),
('Whistle', 'voice', '😗', '#00CED1', 1200, 0.3, 'sine', false, 60, 'Sharp whistle', false, true, 63),
('Beatbox', 'voice', '🎤', '#9932CC', 100, 0.2, 'square', true, 120, 'Human beatbox', false, true, 64),
('Robot Voice', 'voice', '🤖', '#00FF00', 200, 0.5, 'square', false, 100, 'Robotic vocoder', false, true, 65),

-- Animal Sounds
('Duck Quack', 'animal', '🦆', '#FFD700', 600, 0.2, 'sawtooth', true, 80, 'Silly duck quack', false, true, 66),
('Dog Bark', 'animal', '🐕', '#8B4513', 300, 0.3, 'sawtooth', true, 80, 'Woof woof!', false, true, 67),
('Cat Meow', 'animal', '🐱', '#FFA07A', 500, 0.4, 'sine', false, 80, 'Cute meow', false, true, 68),
('Cow Moo', 'animal', '🐄', '#F5F5DC', 120, 0.8, 'sawtooth', false, 80, 'Classic moo', false, true, 69),
('Chicken', 'animal', '🐔', '#FF6347', 400, 0.3, 'triangle', true, 75, 'Bawk bawk!', false, true, 70),
('Elephant', 'animal', '🐘', '#808080', 80, 1.0, 'sawtooth', true, 100, 'Trumpet call', false, true, 71),
('Lion Roar', 'animal', '🦁', '#FF8C00', 100, 0.9, 'sawtooth', true, 120, 'Mighty roar', false, true, 72),
('Frog Ribbit', 'animal', '🐸', '#32CD32', 200, 0.2, 'square', false, 70, 'Ribbit ribbit', false, true, 73),

-- Vehicle & Transport
('Car Horn', 'vehicle', '🚗', '#FF0000', 350, 0.5, 'square', false, 90, 'Honk honk!', false, true, 74),
('Train Whistle', 'vehicle', '🚂', '#4682B4', 440, 0.7, 'sawtooth', true, 100, 'Choo choo!', false, true, 75),
('Siren', 'vehicle', '🚨', '#FF0000', 800, 0.6, 'sine', false, 100, 'Emergency siren', false, true, 76),
('Bike Bell', 'vehicle', '🚲', '#C0C0C0', 2000, 0.2, 'sine', false, 60, 'Ring ring!', false, true, 77),
('Boat Horn', 'vehicle', '🚢', '#000080', 110, 0.9, 'sawtooth', false, 90, 'Deep foghorn', false, true, 78),
('Spaceship', 'vehicle', '🚀', '#9400D3', 150, 0.8, 'sine', true, 120, 'Sci-fi engine', false, true, 79),

-- Silly & Fun Effects
('Boing', 'silly', '🦘', '#FF1493', 300, 0.4, 'sine', false, 70, 'Cartoon spring', false, true, 80),
('Splat', 'silly', '💦', '#00BFFF', 100, 0.2, 'sawtooth', true, 70, 'Messy splat', false, true, 81),
('Pop', 'silly', '🎈', '#FF69B4', 1000, 0.1, 'sine', true, 50, 'Bubble pop', false, true, 82),
('Slide Whistle', 'silly', '📉', '#FFFF00', 500, 0.5, 'sine', false, 80, 'Classic slide', false, true, 83),
('Kazoo', 'silly', '🎉', '#FF4500', 350, 0.3, 'sawtooth', true, 70, 'Party kazoo', false, true, 84),
('Whoopee', 'silly', '💨', '#98FB98', 80, 0.6, 'sawtooth', true, 90, 'Whoopee cushion', false, true, 85),
('Burp', 'silly', '😮', '#90EE90', 60, 0.4, 'sawtooth', true, 80, 'Gross but funny', false, true, 86),
('Slurp', 'silly', '🥤', '#FF6B6B', 200, 0.3, 'sine', true, 70, 'Drinking sound', false, true, 87),

-- Nature & Environment
('Thunder', 'nature', '⛈️', '#4B0082', 40, 1.2, 'sawtooth', true, 100, 'Rumbling thunder', false, true, 88),
('Rain', 'nature', '🌧️', '#87CEEB', 800, 0.8, 'sine', true, 80, 'Gentle rain', false, true, 89),
('Wind', 'nature', '💨', '#E0FFFF', 200, 1.0, 'sine', true, 70, 'Whooshing wind', false, true, 90),
('Ocean Wave', 'nature', '🌊', '#006994', 60, 1.5, 'sine', true, 90, 'Crashing wave', false, true, 91),
('Bird Tweet', 'nature', '🐦', '#FFD700', 2000, 0.2, 'sine', false, 60, 'Cheerful chirp', false, true, 92),

-- Retro & Gaming
('8-Bit Jump', 'retro', '👾', '#00FF00', 400, 0.1, 'square', false, 80, 'Classic game jump', false, true, 93),
('8-Bit Coin', 'retro', '🪙', '#FFD700', 988, 0.15, 'square', false, 80, 'Collect coin!', false, true, 94),
('8-Bit Laser', 'retro', '🔫', '#FF00FF', 1500, 0.2, 'sawtooth', false, 90, 'Pew pew!', false, true, 95),
('8-Bit Power Up', 'retro', '⬆️', '#00FFFF', 600, 0.3, 'square', false, 100, 'Level up!', false, true, 96),
('Game Over', 'retro', '☠️', '#FF0000', 150, 0.8, 'square', false, 100, 'Sad trombone', false, true, 97),
('Victory Fanfare', 'retro', '🏆', '#FFD700', 523, 0.5, 'square', false, 120, 'You win!', false, true, 98),

-- Musical Instruments
('Piano', 'melodic', '🎹', '#FFFFFF', 523, 0.6, 'sine', false, 100, 'Grand piano key', false, true, 99),
('Organ', 'melodic', '🎹', '#8B0000', 262, 0.8, 'sawtooth', false, 100, 'Church organ', false, true, 100),
('Xylophone', 'melodic', '🎵', '#FFB347', 1047, 0.3, 'sine', false, 80, 'Bright mallet hit', false, true, 101),
('Marimba', 'melodic', '🎵', '#8B4513', 392, 0.4, 'sine', false, 85, 'Warm wood tone', false, true, 102),
('Steel Drum', 'melodic', '🥁', '#C0C0C0', 523, 0.5, 'sine', false, 90, 'Tropical vibes', false, true, 103),
('Kalimba', 'melodic', '🎶', '#DEB887', 880, 0.4, 'sine', false, 85, 'Thumb piano', false, true, 104),
('Accordion', 'melodic', '🪗', '#DC143C', 349, 0.6, 'sawtooth', false, 95, 'Squeeze box', false, true, 105),
('Bagpipes', 'melodic', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '#006400', 233, 0.9, 'sawtooth', true, 110, 'Scottish drone', false, true, 106);
