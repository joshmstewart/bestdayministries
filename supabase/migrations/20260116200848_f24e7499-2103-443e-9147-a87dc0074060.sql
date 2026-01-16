-- Insert workout location packs and locations using proper UUIDs
DO $$
DECLARE
  pack_hawaii UUID := gen_random_uuid();
  pack_beach UUID := gen_random_uuid();
  pack_mountain UUID := gen_random_uuid();
  pack_city UUID := gen_random_uuid();
  pack_winter UUID := gen_random_uuid();
  pack_jungle UUID := gen_random_uuid();
  pack_europe UUID := gen_random_uuid();
  pack_asia UUID := gen_random_uuid();
  pack_desert UUID := gen_random_uuid();
  pack_underwater UUID := gen_random_uuid();
  pack_space UUID := gen_random_uuid();
  pack_fantasy UUID := gen_random_uuid();
  pack_parks UUID := gen_random_uuid();
  pack_home UUID := gen_random_uuid();
BEGIN
  -- Insert packs
  INSERT INTO workout_location_packs (id, name, description, is_free, price_coins, display_order, is_active) VALUES
    (pack_hawaii, 'Hawaii Adventure', 'Tropical paradise locations across the Hawaiian islands', false, 150, 1, true),
    (pack_beach, 'Beach Paradise', 'Beautiful beaches from around the world', true, 0, 2, true),
    (pack_mountain, 'Mountain Explorer', 'Epic mountain peaks and alpine adventures', false, 100, 3, true),
    (pack_city, 'City Fitness', 'Urban workout spots in famous cities', false, 100, 4, true),
    (pack_winter, 'Winter Wonderland', 'Snowy and icy workout locations', false, 120, 5, true),
    (pack_jungle, 'Tropical Rainforest', 'Lush jungle and rainforest settings', false, 100, 6, true),
    (pack_europe, 'European Landmarks', 'Iconic European destinations', false, 150, 7, true),
    (pack_asia, 'Asian Adventures', 'Beautiful locations across Asia', false, 150, 8, true),
    (pack_desert, 'Desert Oasis', 'Sandy deserts and ancient ruins', false, 100, 9, true),
    (pack_underwater, 'Ocean Dreams', 'Underwater and coastal marine locations', false, 120, 10, true),
    (pack_space, 'Space & Sci-Fi', 'Futuristic and cosmic workout spots', false, 200, 11, true),
    (pack_fantasy, 'Fantasy Worlds', 'Magical and mythical locations', false, 200, 12, true),
    (pack_parks, 'National Parks', 'Americas beautiful national parks', false, 100, 13, true),
    (pack_home, 'Home & Backyard', 'Familiar everyday locations', true, 0, 14, true);

  -- Hawaii locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_hawaii, 'Waikiki Beach', 'Famous beach in Honolulu', 'on Waikiki Beach in Hawaii with palm trees, blue ocean waves, and Diamond Head crater in the background, sunny day', 1),
    (pack_hawaii, 'Hawaii Volcano', 'Active volcanic landscape', 'near an active volcano in Hawaii with glowing lava flows, volcanic rock, and steam rising, dramatic lighting', 2),
    (pack_hawaii, 'Hawaiian Luau', 'Traditional celebration setting', 'at a Hawaiian luau with tiki torches, tropical flowers, bamboo decorations, and a sunset beach backdrop', 3),
    (pack_hawaii, 'Maui Rainforest', 'Lush tropical forest', 'in a lush Maui rainforest with waterfalls, tropical plants, colorful birds, and misty atmosphere', 4),
    (pack_hawaii, 'Kauai Cliffs', 'Dramatic Na Pali Coast', 'on the dramatic Na Pali Coast cliffs in Kauai with ocean views, green mountains, and blue sky', 5),
    (pack_hawaii, 'Hawaiian Waterfall', 'Scenic waterfall', 'next to a beautiful Hawaiian waterfall surrounded by tropical vegetation and rainbow mist', 6),
    (pack_hawaii, 'Surfing Waves', 'Big wave surfing spot', 'on a surfboard riding a big wave in Hawaii with crystal clear blue water and sunny sky', 7);

  -- Beach Paradise locations (6)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_beach, 'Tropical Beach', 'Generic tropical paradise', 'on a beautiful tropical beach with white sand, palm trees, and turquoise water', 1),
    (pack_beach, 'Sunset Beach', 'Golden hour beach', 'on a beach during golden sunset with orange and pink sky reflecting on calm water', 2),
    (pack_beach, 'Rocky Coastline', 'Dramatic coastal rocks', 'on a rocky coastline with waves crashing against dramatic cliffs and sea spray', 3),
    (pack_beach, 'Coral Reef Shore', 'Colorful reef beach', 'on a beach next to a colorful coral reef visible through crystal clear shallow water', 4),
    (pack_beach, 'Caribbean Cove', 'Secluded Caribbean spot', 'in a secluded Caribbean cove with turquoise water, white sand, and lush green hills', 5),
    (pack_beach, 'Boardwalk Beach', 'Beach with wooden boardwalk', 'on a wooden beach boardwalk with sand dunes, beach grass, and ocean views', 6);

  -- Mountain Explorer locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_mountain, 'Alpine Meadow', 'High mountain meadow', 'in an alpine meadow with wildflowers, snow-capped peaks in the background, and clear blue sky', 1),
    (pack_mountain, 'Rocky Summit', 'Mountain peak', 'on a rocky mountain summit with panoramic views of other peaks and clouds below', 2),
    (pack_mountain, 'Forest Trail', 'Mountain hiking trail', 'on a forest hiking trail through pine trees with mountain views peeking through', 3),
    (pack_mountain, 'Mountain Lake', 'Alpine lake setting', 'beside a crystal clear alpine lake with mountain reflections and evergreen trees', 4),
    (pack_mountain, 'Cliff Overlook', 'Dramatic cliff edge', 'on a cliff overlook with vast mountain valley views and eagles soaring', 5),
    (pack_mountain, 'Waterfall Valley', 'Mountain waterfall', 'in a mountain valley with a tall waterfall cascading down rocky cliffs', 6),
    (pack_mountain, 'Mountain Sunrise', 'Dawn at elevation', 'on a mountain peak at sunrise with golden light and misty valleys below', 7);

  -- City Fitness locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_city, 'Rooftop Gym', 'Urban rooftop', 'on a city rooftop with skyline views, modern buildings, and sunrise lighting', 1),
    (pack_city, 'Central Park', 'Famous urban park', 'in Central Park New York with green lawns, trees, and city skyline in background', 2),
    (pack_city, 'City Bridge', 'Iconic bridge setting', 'on a famous city bridge like Golden Gate or Brooklyn Bridge with city views', 3),
    (pack_city, 'Urban Plaza', 'Modern city square', 'in a modern city plaza with fountains, sculptures, and contemporary architecture', 4),
    (pack_city, 'Street Corner', 'Vibrant city street', 'on a vibrant city street corner with colorful buildings and urban energy', 5),
    (pack_city, 'Skyscraper View', 'High-rise perspective', 'on a skyscraper observation deck with city lights and sunset views', 6),
    (pack_city, 'Stadium Field', 'Sports stadium', 'on a professional sports stadium field with empty seats and scoreboard', 7);

  -- Winter Wonderland locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_winter, 'Snowy Forest', 'Winter forest scene', 'in a peaceful snowy forest with snow-covered pine trees and soft falling snow', 1),
    (pack_winter, 'Frozen Lake', 'Icy lake setting', 'on a frozen lake surrounded by snow-covered mountains and evergreen trees', 2),
    (pack_winter, 'Ski Slope', 'Mountain ski resort', 'on a ski slope at a mountain resort with chairlifts and snowy peaks', 3),
    (pack_winter, 'Ice Cave', 'Glacial ice cave', 'inside a beautiful blue ice cave with crystal formations and ethereal light', 4),
    (pack_winter, 'Northern Lights', 'Aurora borealis', 'under the northern lights aurora borealis in a snowy arctic landscape', 5),
    (pack_winter, 'Cozy Cabin', 'Winter cabin exterior', 'outside a cozy log cabin in the snow with warm lights glowing from windows', 6),
    (pack_winter, 'Ice Rink', 'Outdoor skating rink', 'at an outdoor ice skating rink with holiday lights and festive decorations', 7);

  -- Tropical Rainforest locations (6)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_jungle, 'Dense Jungle', 'Thick rainforest', 'in a dense tropical jungle with giant leaves, vines, and exotic flowers', 1),
    (pack_jungle, 'Jungle Waterfall', 'Hidden falls', 'next to a hidden jungle waterfall with moss-covered rocks and tropical birds', 2),
    (pack_jungle, 'Canopy Bridge', 'Treetop walkway', 'on a rope bridge high in the jungle canopy with views of the forest below', 3),
    (pack_jungle, 'River Rapids', 'Jungle river', 'beside rushing jungle river rapids surrounded by lush vegetation', 4),
    (pack_jungle, 'Ancient Temple', 'Overgrown ruins', 'at overgrown ancient temple ruins in the jungle with vines and mystery', 5),
    (pack_jungle, 'Bamboo Forest', 'Tall bamboo grove', 'in a peaceful bamboo forest with tall green stalks and filtered sunlight', 6);

  -- European Landmarks locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_europe, 'Eiffel Tower', 'Paris landmark', 'in front of the Eiffel Tower in Paris with beautiful gardens and Parisian architecture', 1),
    (pack_europe, 'Colosseum', 'Roman ruins', 'at the ancient Roman Colosseum in Rome with historic architecture and blue sky', 2),
    (pack_europe, 'Swiss Alps', 'Alpine village', 'in a Swiss Alps village with chalet buildings, green meadows, and snowy peaks', 3),
    (pack_europe, 'Greek Islands', 'Santorini setting', 'on a Greek island like Santorini with white buildings, blue domes, and ocean views', 4),
    (pack_europe, 'English Garden', 'British countryside', 'in a beautiful English garden with roses, hedges, and a historic manor house', 5),
    (pack_europe, 'Amsterdam Canal', 'Dutch waterways', 'along an Amsterdam canal with historic buildings, bicycles, and bridges', 6),
    (pack_europe, 'Spanish Plaza', 'Mediterranean square', 'in a sunny Spanish plaza with fountains, palm trees, and colorful tiles', 7);

  -- Asian Adventures locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_asia, 'Japanese Garden', 'Zen garden', 'in a peaceful Japanese zen garden with cherry blossoms, koi pond, and stone lanterns', 1),
    (pack_asia, 'Great Wall', 'Chinese landmark', 'on the Great Wall of China with mountains stretching into the misty distance', 2),
    (pack_asia, 'Thai Temple', 'Buddhist temple', 'at a golden Thai Buddhist temple with ornate decorations and lotus flowers', 3),
    (pack_asia, 'Bali Rice Terraces', 'Indonesian landscape', 'in the green rice terraces of Bali with palm trees and traditional huts', 4),
    (pack_asia, 'Tokyo Skyline', 'Modern Japan', 'in Tokyo with neon lights, modern skyscrapers, and Mount Fuji in distance', 5),
    (pack_asia, 'Indian Palace', 'Majestic architecture', 'at a majestic Indian palace like Taj Mahal with gardens and reflecting pools', 6),
    (pack_asia, 'Korean Temple', 'Mountain monastery', 'at a traditional Korean temple in autumn mountains with colorful foliage', 7);

  -- Desert Oasis locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_desert, 'Sand Dunes', 'Rolling desert dunes', 'on golden sand dunes in the Sahara desert with dramatic shadows and blue sky', 1),
    (pack_desert, 'Desert Oasis', 'Palm oasis', 'at a desert oasis with palm trees, clear pool of water, and sand all around', 2),
    (pack_desert, 'Egyptian Pyramids', 'Ancient wonder', 'in front of the Egyptian pyramids at Giza with sphinx and desert landscape', 3),
    (pack_desert, 'Canyon Vista', 'Red rock canyon', 'on the edge of a red rock canyon like Grand Canyon with vast colorful views', 4),
    (pack_desert, 'Desert Sunset', 'Golden hour desert', 'in the desert during a spectacular sunset with cacti silhouettes', 5),
    (pack_desert, 'Ancient Ruins', 'Desert archaeology', 'at ancient desert ruins like Petra with carved rock architecture', 6),
    (pack_desert, 'Monument Valley', 'Iconic formations', 'in Monument Valley with iconic red rock buttes and western landscape', 7);

  -- Ocean Dreams locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_underwater, 'Coral Reef', 'Underwater reef', 'swimming in a colorful coral reef with tropical fish, sea turtles, and sunbeams', 1),
    (pack_underwater, 'Kelp Forest', 'Underwater forest', 'in an underwater kelp forest with sea otters and rays of sunlight filtering through', 2),
    (pack_underwater, 'Dolphin Bay', 'Swimming with dolphins', 'swimming with playful dolphins in crystal clear blue ocean water', 3),
    (pack_underwater, 'Shipwreck Dive', 'Sunken ship', 'exploring a sunken shipwreck covered in coral with fish swimming around', 4),
    (pack_underwater, 'Sea Turtle Beach', 'Turtle sanctuary', 'on a beach with sea turtles coming ashore, tropical setting', 5),
    (pack_underwater, 'Whale Watching', 'Ocean giants', 'in the ocean near a majestic whale breaching with spray and sunlight', 6),
    (pack_underwater, 'Tropical Lagoon', 'Calm lagoon', 'in a calm tropical lagoon with overwater bungalows and crystal water', 7);

  -- Space & Sci-Fi locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_space, 'Space Station', 'Orbital gym', 'on a space station with Earth visible through windows and zero gravity equipment', 1),
    (pack_space, 'Moon Surface', 'Lunar landscape', 'on the moon surface with Earth rising in the starry sky and lunar craters', 2),
    (pack_space, 'Mars Colony', 'Red planet base', 'at a Mars colony base with red desert, domes, and rovers in background', 3),
    (pack_space, 'Asteroid Belt', 'Space rocks', 'floating among asteroids in space with distant stars and nebula colors', 4),
    (pack_space, 'Futuristic City', 'Sci-fi metropolis', 'in a futuristic city with flying cars, holograms, and neon lights', 5),
    (pack_space, 'Alien Planet', 'Exotic world', 'on a beautiful alien planet with unusual plants, multiple moons, and purple sky', 6),
    (pack_space, 'Nebula View', 'Cosmic beauty', 'floating in space with a colorful nebula backdrop and distant galaxies', 7);

  -- Fantasy Worlds locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_fantasy, 'Enchanted Forest', 'Magical woods', 'in an enchanted forest with glowing mushrooms, fairy lights, and mystical fog', 1),
    (pack_fantasy, 'Dragon Mountain', 'Fantasy peak', 'on a mountain with a friendly dragon, castle towers, and magical aurora', 2),
    (pack_fantasy, 'Fairy Garden', 'Miniature magic', 'in a magical fairy garden with tiny houses, flowers, and sparkling dust', 3),
    (pack_fantasy, 'Crystal Cave', 'Gem cavern', 'in a crystal cave with glowing gems, magical light, and underground lake', 4),
    (pack_fantasy, 'Unicorn Meadow', 'Magical field', 'in a meadow with unicorns, rainbows, and magical flowers', 5),
    (pack_fantasy, 'Wizard Tower', 'Magic castle', 'at a wizard tower with floating books, magical orbs, and starry sky', 6),
    (pack_fantasy, 'Mermaid Lagoon', 'Underwater magic', 'in a magical mermaid lagoon with underwater palace and bioluminescent creatures', 7);

  -- National Parks locations (7)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_parks, 'Yellowstone Geyser', 'Famous geyser', 'at Yellowstone with Old Faithful geyser erupting and colorful hot springs', 1),
    (pack_parks, 'Yosemite Valley', 'Iconic valley', 'in Yosemite Valley with El Capitan, waterfalls, and giant sequoia trees', 2),
    (pack_parks, 'Grand Canyon', 'Canyon rim', 'at the Grand Canyon rim with layered red rocks and vast canyon views', 3),
    (pack_parks, 'Zion Narrows', 'Slot canyon', 'hiking through Zion Narrows slot canyon with towering red walls and river', 4),
    (pack_parks, 'Glacier National Park', 'Mountain lake', 'at Glacier National Park with pristine lake, mountains, and wildlife', 5),
    (pack_parks, 'Redwood Forest', 'Giant trees', 'among giant redwood trees in the forest with shafts of golden sunlight', 6),
    (pack_parks, 'Arches Park', 'Natural arches', 'at Arches National Park with Delicate Arch and red rock formations', 7);

  -- Home & Backyard locations - FREE (8)
  INSERT INTO workout_locations (pack_id, name, description, prompt_text, display_order) VALUES
    (pack_home, 'Backyard Lawn', 'Home grass', 'in a sunny backyard with green grass, fence, and family garden', 1),
    (pack_home, 'Living Room', 'Indoor home', 'in a cozy living room with comfortable furniture and warm lighting', 2),
    (pack_home, 'Garage Gym', 'Home gym', 'in a home garage gym with weights, mats, and motivational posters', 3),
    (pack_home, 'Front Porch', 'House entrance', 'on a front porch of a house with steps, plants, and neighborhood view', 4),
    (pack_home, 'Park Playground', 'Local park', 'at a neighborhood park with playground equipment, trees, and picnic tables', 5),
    (pack_home, 'Driveway', 'Home driveway', 'on a residential driveway with basketball hoop and sunny sky', 6),
    (pack_home, 'School Gym', 'Indoor gymnasium', 'in a school gymnasium with basketball court, bleachers, and banners', 7),
    (pack_home, 'Community Pool', 'Local pool', 'at a community swimming pool with lanes, diving board, and lounge chairs', 8);
END $$;