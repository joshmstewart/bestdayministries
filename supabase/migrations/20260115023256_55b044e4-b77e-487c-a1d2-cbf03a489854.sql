-- Add category column to beat_pad_sounds
ALTER TABLE beat_pad_sounds ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'uncategorized';

-- Update categories based on sound characteristics
UPDATE beat_pad_sounds SET category = 'drums' WHERE name IN ('Kick', 'Snare', 'Hi-Hat', 'Crash Cymbal', 'Ride Cymbal', 'Open Hi-Hat', 'Closed Hi-Hat', 'Floor Tom', 'Mid Tom', 'High Tom', 'Clap', 'Rim Shot', 'Tom Tom');

UPDATE beat_pad_sounds SET category = 'percussion' WHERE name IN ('Bongo', 'Bongo High', 'Bongo Low', 'Conga', 'Cowbell', 'Shaker', 'Tambourine', 'Triangle', 'Woodblock', 'Maracas');

UPDATE beat_pad_sounds SET category = 'bass' WHERE name IN ('808 Bass', 'Bass', 'Wobble Bass', 'Sub Bass');

UPDATE beat_pad_sounds SET category = 'melodic' WHERE name IN ('Piano', 'Organ', 'Synth Pad', 'Synth Lead', 'Accordion', 'Harmonica', 'Xylophone', 'Marimba', 'Steel Drum', 'Kalimba', 'Music Box', 'Chord Stab', 'Arpeggio', 'Bell');

UPDATE beat_pad_sounds SET category = 'strings' WHERE name IN ('Guitar', 'Banjo', 'Harp', 'Violin', 'Cello', 'Sitar', 'Ukulele');

UPDATE beat_pad_sounds SET category = 'wind' WHERE name IN ('Flute', 'Trumpet', 'Saxophone', 'Trombone', 'Tuba', 'Bagpipes', 'Pan Flute', 'Whistle', 'Slide Whistle');

UPDATE beat_pad_sounds SET category = 'animals' WHERE name IN ('Dog Bark', 'Cat Meow', 'Cow Moo', 'Chicken', 'Duck Quack', 'Frog Ribbit', 'Elephant', 'Bird Tweet', 'Horse Neigh', 'Lion Roar', 'Monkey', 'Pig Oink', 'Rooster', 'Sheep', 'Wolf Howl');

UPDATE beat_pad_sounds SET category = 'vehicles' WHERE name IN ('Car Horn', 'Boat Horn', 'Bike Bell', 'Train Whistle', 'Police Siren', 'Helicopter', 'Spaceship');

UPDATE beat_pad_sounds SET category = 'retro' WHERE name IN ('8-Bit Coin', '8-Bit Jump', '8-Bit Laser', '8-Bit Power Up', 'Game Over', 'Blip');

UPDATE beat_pad_sounds SET category = 'effects' WHERE name IN ('Burp', 'Boing', 'Record Scratch', 'Glitch', 'Laser', 'Zap', 'Pop', 'Whoosh', 'Air Horn', 'Thunder', 'Rain', 'Ocean Waves', 'Wind', 'Fire Crackle', 'Water Drop', 'Brass Hit');

UPDATE beat_pad_sounds SET category = 'voice' WHERE name IN ('Beatbox', 'Evil Laugh', 'Yeah', 'Hey', 'Robot Voice', 'Scream', 'Oh Yeah');