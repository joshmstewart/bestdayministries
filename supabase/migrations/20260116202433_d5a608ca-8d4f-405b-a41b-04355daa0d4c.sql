-- Update location prompts to be activity-agnostic (no specific activities mentioned)
-- Locations should describe environments/platforms where ANY activity could take place

-- Hawaii Adventure Pack
UPDATE workout_locations SET prompt_text = 'Standing on the golden sands of Waikiki Beach with Diamond Head crater in the background, palm trees swaying, and turquoise waters' WHERE name = 'Waikiki Beach Sunrise';
UPDATE workout_locations SET prompt_text = 'Standing near the edge of an active volcano crater with glowing red lava visible below, volcanic rock formations and steam rising' WHERE name = 'Volcano Rim';
UPDATE workout_locations SET prompt_text = 'On a floating platform decorated with tropical flowers in the middle of a Hawaiian lagoon, surrounded by lush green mountains' WHERE name = 'Traditional Luau';
UPDATE workout_locations SET prompt_text = 'On a sturdy wooden dock extending into crystal clear Hawaiian waters with colorful fish visible below, tropical islands in distance' WHERE name = 'Snorkeling Cove';
UPDATE workout_locations SET prompt_text = 'Standing in a misty Hawaiian rainforest clearing next to a cascading waterfall with tropical flowers and ferns all around' WHERE name = 'Rainforest Waterfall';
UPDATE workout_locations SET prompt_text = 'On a scenic overlook along a Hawaiian mountain trail with panoramic views of valleys, ocean, and dramatic cliffs' WHERE name = 'Na Pali Coast Trail';

-- Beach Paradise Pack
UPDATE workout_locations SET prompt_text = 'On pristine white sand beach in the Maldives with crystal clear turquoise water, overwater bungalows visible in the distance' WHERE name = 'Maldives White Sand';
UPDATE workout_locations SET prompt_text = 'On the famous Copacabana Beach in Rio with Sugarloaf Mountain in the background, colorful beach umbrellas and palm trees' WHERE name = 'Copacabana Beach';
UPDATE workout_locations SET prompt_text = 'On a beautiful Australian beach with the Sydney Opera House and Harbour Bridge visible in the background, golden sand' WHERE name = 'Sydney Bondi Beach';
UPDATE workout_locations SET prompt_text = 'On a stunning pink sand beach with crystal waters, dramatic limestone cliffs, and tropical vegetation' WHERE name = 'Pink Sand Beach';
UPDATE workout_locations SET prompt_text = 'On a secluded Caribbean beach with palm trees leaning over turquoise waters, white sand, and a small wooden pier' WHERE name = 'Caribbean Cove';
UPDATE workout_locations SET prompt_text = 'On a beautiful beach in Thailand with dramatic limestone karst formations rising from emerald green waters' WHERE name = 'Thailand Paradise';

-- Mountain Explorer Pack
UPDATE workout_locations SET prompt_text = 'On a viewing platform near Mount Everest base camp with the snow-capped peak towering above, prayer flags fluttering' WHERE name = 'Everest Base Camp';
UPDATE workout_locations SET prompt_text = 'In a beautiful Swiss Alpine meadow with snow-capped peaks, wildflowers, and a traditional wooden chalet' WHERE name = 'Swiss Alps Meadow';
UPDATE workout_locations SET prompt_text = 'On a rocky outcrop in the Canadian Rockies with turquoise glacial lakes, pine forests, and jagged peaks' WHERE name = 'Rocky Mountain Peak';
UPDATE workout_locations SET prompt_text = 'At a scenic viewpoint on Mount Fuji with cherry blossoms, traditional Japanese architecture, and misty valleys below' WHERE name = 'Mount Fuji Sunrise';
UPDATE workout_locations SET prompt_text = 'On a flat area in the Andes mountains with ancient Incan ruins visible, dramatic mountain peaks and llamas nearby' WHERE name = 'Andes Adventure';
UPDATE workout_locations SET prompt_text = 'In a Himalayan village setting with colorful prayer flags, Buddhist temples, and snow-capped peaks in the distance' WHERE name = 'Himalayan Village';

-- City Adventure Pack
UPDATE workout_locations SET prompt_text = 'In Central Park New York with the Manhattan skyline visible through the trees, autumn leaves and green lawns' WHERE name = 'Central Park NYC';
UPDATE workout_locations SET prompt_text = 'On a platform near the Eiffel Tower in Paris with the iconic structure lit up, Parisian architecture all around' WHERE name = 'Eiffel Tower Paris';
UPDATE workout_locations SET prompt_text = 'On a rooftop garden in Tokyo with neon signs, the Tokyo Tower, and modern skyscrapers in the cyberpunk cityscape' WHERE name = 'Tokyo Neon District';
UPDATE workout_locations SET prompt_text = 'On Tower Bridge in London with Big Ben and the Houses of Parliament visible, double-decker buses and classic architecture' WHERE name = 'London Landmarks';
UPDATE workout_locations SET prompt_text = 'In front of the Sydney Opera House with the Harbour Bridge, sparkling blue water, and Australian sunshine' WHERE name = 'Sydney Harbor';
UPDATE workout_locations SET prompt_text = 'On a plaza near the Burj Khalifa in Dubai with futuristic architecture, fountains, and desert sunset colors' WHERE name = 'Dubai Skyline';

-- Forest & Nature Pack
UPDATE workout_locations SET prompt_text = 'In an enchanted forest clearing with magical glowing mushrooms, fireflies, and ancient twisted trees with mystical atmosphere' WHERE name = 'Enchanted Forest';
UPDATE workout_locations SET prompt_text = 'Among giant California redwood trees with sunbeams filtering through the massive trunks, ferns covering the forest floor' WHERE name = 'Redwood Giants';
UPDATE workout_locations SET prompt_text = 'In a bamboo forest in Japan with tall green bamboo stalks creating a natural tunnel, soft filtered light' WHERE name = 'Bamboo Grove';
UPDATE workout_locations SET prompt_text = 'In a cherry blossom garden in Japan with pink petals floating in the air, traditional Japanese garden elements' WHERE name = 'Cherry Blossom Garden';
UPDATE workout_locations SET prompt_text = 'In a colorful autumn forest with red, orange, and gold leaves, a peaceful stream, and misty morning atmosphere' WHERE name = 'Autumn Wonderland';
UPDATE workout_locations SET prompt_text = 'In a tropical rainforest with exotic birds, colorful butterflies, cascading vines, and a canopy of green leaves' WHERE name = 'Tropical Rainforest';

-- Arctic & Snow Pack
UPDATE workout_locations SET prompt_text = 'On an Arctic ice floe with polar bears in the distance, northern lights dancing in the sky, icebergs floating nearby' WHERE name = 'Arctic Ice Floe';
UPDATE workout_locations SET prompt_text = 'At an Antarctic research station with penguins, glaciers, and the pristine white landscape of Antarctica' WHERE name = 'Antarctic Base';
UPDATE workout_locations SET prompt_text = 'Under the spectacular aurora borealis in Iceland with snow-covered landscape, stars, and magical green lights' WHERE name = 'Northern Lights';
UPDATE workout_locations SET prompt_text = 'At a cozy ski lodge in the Alps with snow-covered mountains, warm lights glowing, and fresh powder snow' WHERE name = 'Alpine Ski Lodge';
UPDATE workout_locations SET prompt_text = 'In a magical ice cave with blue glacial ice formations, crystals, and ethereal light filtering through' WHERE name = 'Ice Cave';
UPDATE workout_locations SET prompt_text = 'In a snow-covered winter wonderland forest with frosted trees, fresh snow, and a peaceful cabin in the distance' WHERE name = 'Snowy Forest';

-- Desert & Safari Pack
UPDATE workout_locations SET prompt_text = 'At the great pyramids of Giza in Egypt with the Sphinx, golden sand dunes, and ancient monuments under blue sky' WHERE name = 'Egyptian Pyramids';
UPDATE workout_locations SET prompt_text = 'On the African savanna at sunset with acacia trees, elephants and giraffes in the distance, golden grass' WHERE name = 'African Safari';
UPDATE workout_locations SET prompt_text = 'In the red rock formations of the American Southwest desert with dramatic sandstone arches and buttes' WHERE name = 'Desert Canyon';
UPDATE workout_locations SET prompt_text = 'At a luxurious desert oasis camp in Dubai with Arabian tents, palm trees, and sand dunes at sunset' WHERE name = 'Dubai Desert Camp';
UPDATE workout_locations SET prompt_text = 'In Monument Valley with iconic sandstone buttes, red desert landscape, and dramatic southwestern scenery' WHERE name = 'Monument Valley';
UPDATE workout_locations SET prompt_text = 'At an ancient Moroccan palace in Marrakech with colorful tiles, fountains, and traditional architecture' WHERE name = 'Moroccan Oasis';

-- Underwater World Pack
UPDATE workout_locations SET prompt_text = 'On a floating platform above the Great Barrier Reef with crystal clear water showing colorful coral and fish below' WHERE name = 'Coral Reef';
UPDATE workout_locations SET prompt_text = 'In a magical underwater bubble dome surrounded by tropical fish, sea turtles, and vibrant coral gardens' WHERE name = 'Underwater Dome';
UPDATE workout_locations SET prompt_text = 'On the deck of a submarine with portholes showing deep ocean creatures, bioluminescent jellyfish floating by' WHERE name = 'Submarine Adventure';
UPDATE workout_locations SET prompt_text = 'On a platform next to a sunken pirate ship with treasure chests, friendly dolphins, and colorful fish' WHERE name = 'Sunken Ship';
UPDATE workout_locations SET prompt_text = 'In an underwater cave with ancient columns, treasure, and mysterious sea creatures with ethereal lighting' WHERE name = 'Atlantis Ruins';
UPDATE workout_locations SET prompt_text = 'In a kelp forest with tall seaweed, playful sea otters, fish, and dappled sunlight filtering through the water' WHERE name = 'Kelp Forest';

-- Space Explorer Pack
UPDATE workout_locations SET prompt_text = 'Inside a space station with Earth visible through the window, stars and galaxies in the background, futuristic technology' WHERE name = 'Space Station';
UPDATE workout_locations SET prompt_text = 'On the surface of the moon with Earth rising in the background, lunar landscape with craters and the American flag' WHERE name = 'Moon Base';
UPDATE workout_locations SET prompt_text = 'On the red surface of Mars with rusty terrain, distant mountains, and a futuristic Mars habitat dome' WHERE name = 'Mars Colony';
UPDATE workout_locations SET prompt_text = 'In a beautiful nebula with colorful cosmic clouds, distant galaxies, stars, and a space platform' WHERE name = 'Nebula Station';
UPDATE workout_locations SET prompt_text = 'Near the rings of Saturn with the giant planet visible, ice particles sparkling, and a futuristic space platform' WHERE name = 'Saturn Ring View';
UPDATE workout_locations SET prompt_text = 'In the asteroid belt with rocky asteroids floating by, distant sun, and a mining station platform' WHERE name = 'Asteroid Mining';

-- Fantasy Kingdom Pack
UPDATE workout_locations SET prompt_text = 'In a magical fairy tale castle with towers, flags, and a beautiful kingdom with rolling hills and a rainbow' WHERE name = 'Castle Courtyard';
UPDATE workout_locations SET prompt_text = 'On a platform among clouds with a friendly dragon, floating islands, and a magical sky kingdom' WHERE name = 'Dragon Lair';
UPDATE workout_locations SET prompt_text = 'In a magical unicorn meadow with rainbows, sparkling streams, colorful flowers, and mystical forest' WHERE name = 'Unicorn Meadow';
UPDATE workout_locations SET prompt_text = 'In a wizard tower with magical books, potions, crystal balls, and mystical artifacts floating around' WHERE name = 'Wizard Tower';
UPDATE workout_locations SET prompt_text = 'In an enchanted fairy village with tiny houses in mushrooms, glowing lights, and magical creatures' WHERE name = 'Fairy Village';
UPDATE workout_locations SET prompt_text = 'On a floating island in the sky with waterfalls cascading into clouds, magical crystals, and fantasy architecture' WHERE name = 'Floating Island';

-- Home & Backyard Pack  
UPDATE workout_locations SET prompt_text = 'In a cozy living room with comfortable furniture, warm lighting, plants, and a welcoming home atmosphere' WHERE name = 'Living Room';
UPDATE workout_locations SET prompt_text = 'In a beautiful backyard garden with flowers, a green lawn, patio furniture, and a fence with climbing roses' WHERE name = 'Backyard Garden';
UPDATE workout_locations SET prompt_text = 'In a home garage gym with weights, equipment, motivational posters, and good lighting' WHERE name = 'Garage Gym';
UPDATE workout_locations SET prompt_text = 'On a wooden deck or patio with outdoor furniture, potted plants, string lights, and a peaceful backyard view' WHERE name = 'Patio Deck';
UPDATE workout_locations SET prompt_text = 'In a sunny bedroom with natural light streaming through windows, plants, and calming decor' WHERE name = 'Bedroom Sunrise';
UPDATE workout_locations SET prompt_text = 'In a peaceful indoor garden room or sunroom with lots of plants, natural light, and comfortable seating' WHERE name = 'Indoor Garden';

-- Amusement Park Pack
UPDATE workout_locations SET prompt_text = 'At a colorful carnival with a ferris wheel, cotton candy stands, games, and festive decorations' WHERE name = 'Carnival Grounds';
UPDATE workout_locations SET prompt_text = 'Near a thrilling roller coaster at an amusement park with colorful rides and excited atmosphere' WHERE name = 'Roller Coaster';
UPDATE workout_locations SET prompt_text = 'In a magical theme park with a fairy tale castle, colorful attractions, and happy festive atmosphere' WHERE name = 'Magic Kingdom';
UPDATE workout_locations SET prompt_text = 'At a splashing water park with colorful slides, wave pools, and tropical theming' WHERE name = 'Water Park';
UPDATE workout_locations SET prompt_text = 'Under a colorful circus big top tent with spotlights, trapeze, and circus decorations' WHERE name = 'Circus Big Top';
UPDATE workout_locations SET prompt_text = 'On a beautiful vintage carousel with ornate horses and magical lighting' WHERE name = 'Carousel';

-- Sports Arena Pack
UPDATE workout_locations SET prompt_text = 'In a massive football stadium with green field, stadium seating, and exciting game day atmosphere' WHERE name = 'Football Stadium';
UPDATE workout_locations SET prompt_text = 'On a professional basketball court with hardwood floors, hoops, and arena lighting' WHERE name = 'Basketball Court';
UPDATE workout_locations SET prompt_text = 'On a tennis court at Wimbledon with pristine grass, white lines, and classic tennis atmosphere' WHERE name = 'Tennis Court';
UPDATE workout_locations SET prompt_text = 'At an Olympic track and field stadium with the iconic rings, running track, and world-class facilities' WHERE name = 'Olympic Stadium';
UPDATE workout_locations SET prompt_text = 'In a wrestling ring or boxing arena with spotlights, ropes, and exciting competition atmosphere' WHERE name = 'Wrestling Ring';
UPDATE workout_locations SET prompt_text = 'At an ice hockey rink with gleaming ice, goals, and arena excitement' WHERE name = 'Hockey Arena';

-- World Wonders Pack
UPDATE workout_locations SET prompt_text = 'At the Great Wall of China winding through misty mountains with ancient watchtowers and beautiful scenery' WHERE name = 'Great Wall of China';
UPDATE workout_locations SET prompt_text = 'At Machu Picchu with ancient Incan ruins, terraces, and misty Andes mountains in Peru' WHERE name = 'Machu Picchu';
UPDATE workout_locations SET prompt_text = 'At the Taj Mahal in India with the beautiful white marble monument, reflecting pools, and gardens' WHERE name = 'Taj Mahal';
UPDATE workout_locations SET prompt_text = 'At the Colosseum in Rome with ancient Roman architecture, arches, and historic atmosphere' WHERE name = 'Roman Colosseum';
UPDATE workout_locations SET prompt_text = 'At the ancient temple of Petra carved into red rock cliffs in Jordan with dramatic desert scenery' WHERE name = 'Petra Temple';
UPDATE workout_locations SET prompt_text = 'At Stonehenge in England with the mysterious ancient stone circle and English countryside' WHERE name = 'Stonehenge';