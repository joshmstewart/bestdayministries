import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, Coins, Eye, EyeOff, Wand2, Shuffle, RefreshCw, Dumbbell, Download, Upload, Eraser, ArchiveRestore } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import ImageLightbox from "@/components/ImageLightbox";

// ============================================================================
// HARDCODED AVATAR TEMPLATES (like packThemes in WorkoutLocationsManager)
// ============================================================================
interface AvatarTemplate {
  name: string;
  character_type: 'animal' | 'human' | 'superhero' | 'monster';
  prompt: string;
}

const avatarTemplates: AvatarTemplate[] = [
  // ========== ANIMALS (50) ==========
  { name: 'Sporty Cat', character_type: 'animal', prompt: 'A friendly orange tabby cat with an athletic build, wearing a colorful headband and wristbands' },
  { name: 'Power Panda', character_type: 'animal', prompt: 'A strong black and white panda bear with a muscular build, wearing athletic shorts and a tank top' },
  { name: 'Flash Fox', character_type: 'animal', prompt: 'An energetic red fox with sleek fur, wearing running shoes and a tracksuit' },
  { name: 'Mighty Mouse', character_type: 'animal', prompt: 'A small but determined gray mouse with big ears, wearing tiny workout gloves and sneakers' },
  { name: 'Bounce Bunny', character_type: 'animal', prompt: 'A fluffy white rabbit with pink ears, athletic build, wearing a sports jersey' },
  { name: 'Strong Bear', character_type: 'animal', prompt: 'A friendly brown bear with powerful arms, wearing gym clothes and lifting gloves' },
  { name: 'Swift Deer', character_type: 'animal', prompt: 'A graceful spotted deer with long legs, wearing a runner\'s outfit' },
  { name: 'Flex Frog', character_type: 'animal', prompt: 'A bright green frog with strong legs, wearing athletic shorts and wristbands' },
  { name: 'Dash Dog', character_type: 'animal', prompt: 'A golden retriever with a friendly face, wearing a sports bandana and running shoes' },
  { name: 'Owl Coach', character_type: 'animal', prompt: 'A wise brown owl with big eyes, wearing a coach\'s whistle and cap' },
  { name: 'Tiger Trainer', character_type: 'animal', prompt: 'An orange tiger with black stripes, athletic build, wearing training gear' },
  { name: 'Penguin Pal', character_type: 'animal', prompt: 'A cheerful black and white penguin, wearing a tiny workout headband' },
  { name: 'Kangaroo Kick', character_type: 'animal', prompt: 'A muscular kangaroo with boxing gloves, athletic stance, wearing workout shorts' },
  { name: 'Gorilla Grip', character_type: 'animal', prompt: 'A strong silverback gorilla with kind eyes, wearing weightlifting belt and wristbands' },
  { name: 'Cheetah Chase', character_type: 'animal', prompt: 'A sleek cheetah with spotted fur, wearing racing gear and speed goggles' },
  { name: 'Elephant Effort', character_type: 'animal', prompt: 'A gentle gray elephant with a determined look, wearing a workout headband' },
  { name: 'Dolphin Dive', character_type: 'animal', prompt: 'A playful dolphin with a swimmer\'s build, wearing goggles on forehead' },
  { name: 'Lion Leader', character_type: 'animal', prompt: 'A majestic lion with flowing mane, wearing a coach jersey and whistle' },
  { name: 'Koala Calm', character_type: 'animal', prompt: 'A peaceful koala doing yoga pose, wearing zen workout attire' },
  { name: 'Hippo Hustle', character_type: 'animal', prompt: 'A surprisingly agile hippo in dance workout clothes, mid-move' },
  { name: 'Raccoon Run', character_type: 'animal', prompt: 'A sneaky raccoon with athletic build, wearing night-runner gear' },
  { name: 'Giraffe Glide', character_type: 'animal', prompt: 'A tall giraffe with long neck, wearing basketball jersey' },
  { name: 'Zebra Zoom', character_type: 'animal', prompt: 'A striped zebra in running pose, wearing track outfit' },
  { name: 'Rhino Rush', character_type: 'animal', prompt: 'A powerful rhino with protective gear, football stance' },
  { name: 'Sloth Stretch', character_type: 'animal', prompt: 'A relaxed sloth doing stretches, wearing cozy yoga clothes' },
  { name: 'Otter Athlete', character_type: 'animal', prompt: 'A playful otter with sleek fur, wearing swim gear and cap' },
  { name: 'Hawk Hover', character_type: 'animal', prompt: 'A sharp-eyed hawk with powerful wings, wearing aviator workout gear' },
  { name: 'Turtle Trek', character_type: 'animal', prompt: 'A determined turtle with hiking gear, wearing a tiny backpack' },
  { name: 'Wolf Warrior', character_type: 'animal', prompt: 'A fierce gray wolf with intense eyes, wearing martial arts gi' },
  { name: 'Monkey Move', character_type: 'animal', prompt: 'An agile monkey swinging through gymnastics rings, wearing leotard' },
  { name: 'Parrot Power', character_type: 'animal', prompt: 'A colorful parrot with vibrant feathers, wearing dance outfit' },
  { name: 'Seal Spin', character_type: 'animal', prompt: 'A playful seal balancing a ball, wearing aquatic workout gear' },
  { name: 'Badger Boost', character_type: 'animal', prompt: 'A tough badger with determined expression, wearing boxing shorts' },
  { name: 'Flamingo Flex', character_type: 'animal', prompt: 'A graceful pink flamingo in yoga tree pose, wearing leggings' },
  { name: 'Hedgehog Hustle', character_type: 'animal', prompt: 'A cute hedgehog with tiny sneakers, wearing a jogger outfit' },
  { name: 'Lemur Leap', character_type: 'animal', prompt: 'A ring-tailed lemur mid-jump, wearing acrobatic costume' },
  { name: 'Moose Muscle', character_type: 'animal', prompt: 'A large moose with impressive antlers, wearing lifting gear' },
  { name: 'Peacock Pose', character_type: 'animal', prompt: 'A beautiful peacock with spread tail, in yoga warrior pose' },
  { name: 'Jaguar Jab', character_type: 'animal', prompt: 'A spotted jaguar in boxing stance, wearing gloves and shorts' },
  { name: 'Crocodile Crunch', character_type: 'animal', prompt: 'A muscular crocodile doing crunches, wearing workout tank' },
  { name: 'Squirrel Sprint', character_type: 'animal', prompt: 'A quick squirrel in racing position, wearing tiny running shoes' },
  { name: 'Polar Power', character_type: 'animal', prompt: 'A white polar bear with immense strength, wearing wrestling singlet' },
  { name: 'Bat Balance', character_type: 'animal', prompt: 'A friendly bat hanging upside down in yoga pose, wearing stretchy clothes' },
  { name: 'Beaver Build', character_type: 'animal', prompt: 'A hardworking beaver with strong arms, wearing construction-style workout gear' },
  { name: 'Crab Cardio', character_type: 'animal', prompt: 'A red crab doing sideways exercises, wearing beach workout attire' },
  { name: 'Duck Dash', character_type: 'animal', prompt: 'A yellow duck waddling fast, wearing a racing bib and sneakers' },
  { name: 'Eagle Eye', character_type: 'animal', prompt: 'A majestic bald eagle with sharp focus, wearing archery gear' },
  { name: 'Ferret Fast', character_type: 'animal', prompt: 'A quick ferret zooming around, wearing speed skating outfit' },
  { name: 'Goat Climb', character_type: 'animal', prompt: 'A mountain goat on rocky terrain, wearing climbing gear' },
  { name: 'Husky Hero', character_type: 'animal', prompt: 'A fluffy husky with bright blue eyes, wearing sled-racing harness' },

  // ========== HUMANS (50) ==========
  { name: 'Coach Casey', character_type: 'human', prompt: 'A friendly adult coach with short hair, warm smile, wearing athletic polo and whistle around neck' },
  { name: 'Zara Zoom', character_type: 'human', prompt: 'A young Black girl with curly hair in puffs, athletic build, wearing bright colored activewear' },
  { name: 'Marcus Move', character_type: 'human', prompt: 'A young Latino boy with wavy hair, enthusiastic expression, wearing basketball jersey' },
  { name: 'Kim Kick', character_type: 'human', prompt: 'A young Asian girl with straight black hair in ponytail, wearing martial arts outfit' },
  { name: 'Super Sam', character_type: 'human', prompt: 'A young boy with Down syndrome, big smile, wearing a superhero cape over workout clothes' },
  { name: 'Wheels Wendy', character_type: 'human', prompt: 'A young girl in a sporty wheelchair, brown pigtails, wearing athletic gear, confident expression' },
  { name: 'Jumping Jack', character_type: 'human', prompt: 'A young boy with red hair and freckles, energetic pose, wearing gym clothes' },
  { name: 'Yoga Yara', character_type: 'human', prompt: 'A young South Asian girl with long braided hair, peaceful expression, wearing yoga attire' },
  { name: 'Dancing Devon', character_type: 'human', prompt: 'A young nonbinary child with short colorful hair, wearing dance outfit with leg warmers' },
  { name: 'Swimmer Sofia', character_type: 'human', prompt: 'A young girl with swim cap and goggles on head, athletic swimsuit, confident pose' },
  { name: 'Runner Ray', character_type: 'human', prompt: 'A young African American boy with short hair, wearing running gear and race number' },
  { name: 'Gymnast Grace', character_type: 'human', prompt: 'A young girl with hair in bun, wearing a sparkly leotard, graceful pose' },
  { name: 'Archer Aiden', character_type: 'human', prompt: 'A focused young boy with steady hands, wearing archery vest and arm guard' },
  { name: 'Boxer Bella', character_type: 'human', prompt: 'A determined young girl with boxing braids, wearing gloves and shorts' },
  { name: 'Climber Cole', character_type: 'human', prompt: 'An adventurous young boy with chalk on hands, wearing climbing harness' },
  { name: 'Diver Diana', character_type: 'human', prompt: 'A young girl on diving board, wearing competition swimsuit, focused expression' },
  { name: 'Fencer Felix', character_type: 'human', prompt: 'A young boy in fencing gear, mask lifted, épée in hand' },
  { name: 'Goalie Gina', character_type: 'human', prompt: 'A young girl in goalkeeper gear, ready stance, wearing gloves' },
  { name: 'Hockey Hunter', character_type: 'human', prompt: 'A young boy in hockey gear, stick ready, on ice skates' },
  { name: 'Ice Skater Ivy', character_type: 'human', prompt: 'A young girl in figure skating dress, graceful spin pose' },
  { name: 'Judoka Jasmine', character_type: 'human', prompt: 'A young girl in judo gi, black belt, confident bow' },
  { name: 'Karate Kai', character_type: 'human', prompt: 'A young person in karate uniform, mid-kick, focused expression' },
  { name: 'Lacrosse Leo', character_type: 'human', prompt: 'A young boy with lacrosse stick, wearing helmet and pads' },
  { name: 'Marathon Maya', character_type: 'human', prompt: 'A young girl crossing finish line, arms raised, wearing marathon bib' },
  { name: 'Ninja Nate', character_type: 'human', prompt: 'A young boy in ninja warrior course, climbing obstacle' },
  { name: 'Olympian Olivia', character_type: 'human', prompt: 'A young girl on medal podium, wearing tracksuit, holding torch' },
  { name: 'Pitcher Pablo', character_type: 'human', prompt: 'A young Latino boy in baseball uniform, winding up to pitch' },
  { name: 'Quarterback Quinn', character_type: 'human', prompt: 'A young person in football uniform, throwing spiral pass' },
  { name: 'Rower Rosa', character_type: 'human', prompt: 'A young girl in rowing shell, pulling oars, determined face' },
  { name: 'Skater Shane', character_type: 'human', prompt: 'A young boy on skateboard, mid-trick, wearing helmet and pads' },
  { name: 'Tennis Tara', character_type: 'human', prompt: 'A young girl swinging tennis racket, wearing white outfit' },
  { name: 'Ultimate Uma', character_type: 'human', prompt: 'A young person catching frisbee, diving catch, wearing jersey' },
  { name: 'Volleyball Victor', character_type: 'human', prompt: 'A young boy spiking volleyball, jumping high, beach setting' },
  { name: 'Wrestler Willow', character_type: 'human', prompt: 'A young girl in wrestling singlet, ready stance, headgear on' },
  { name: 'Xtreme Xavier', character_type: 'human', prompt: 'A young boy on BMX bike, mid-air trick, wearing safety gear' },
  { name: 'Yogi Yolanda', character_type: 'human', prompt: 'A young girl in lotus pose, peaceful expression, outdoor setting' },
  { name: 'Zumba Zoe', character_type: 'human', prompt: 'A young girl dancing zumba, colorful outfit, big smile' },
  { name: 'Balance Ben', character_type: 'human', prompt: 'A young boy on balance beam, arms out, focused concentration' },
  { name: 'Cheerleader Chloe', character_type: 'human', prompt: 'A young girl in cheerleading uniform, mid-jump split, pom-poms' },
  { name: 'Dancer Dante', character_type: 'human', prompt: 'A young boy in hip-hop dance pose, wearing streetwear' },
  { name: 'Equestrian Emma', character_type: 'human', prompt: 'A young girl in riding gear, with helmet, next to horse' },
  { name: 'Fitness Finn', character_type: 'human', prompt: 'A young boy with resistance bands, wearing workout clothes' },
  { name: 'Golf Gabby', character_type: 'human', prompt: 'A young girl swinging golf club, wearing polo and visor' },
  { name: 'Hiker Henry', character_type: 'human', prompt: 'A young boy with hiking poles, backpack, on trail' },
  { name: 'Inline Izzy', character_type: 'human', prompt: 'A young person on inline skates, wearing protective gear' },
  { name: 'Jump Rope Jada', character_type: 'human', prompt: 'A young girl mid-jump rope, double-dutch style' },
  { name: 'Kickball Kelly', character_type: 'human', prompt: 'A young person kicking red playground ball, playground setting' },
  { name: 'Lifeguard Logan', character_type: 'human', prompt: 'A young person in lifeguard uniform, rescue buoy, poolside' },
  { name: 'Martial Max', character_type: 'human', prompt: 'A young boy practicing tai chi, peaceful park setting' },
  { name: 'Netball Nina', character_type: 'human', prompt: 'A young girl shooting netball, wearing team uniform' },

  // ========== SUPERHEROES (50) ==========
  { name: 'Captain Flex', character_type: 'superhero', prompt: 'An adult superhero with a cape and star emblem, athletic build, friendly smile, wearing red and blue costume' },
  { name: 'Thunder Strike', character_type: 'superhero', prompt: 'A young adult hero with lightning bolt patterns on costume, electric aura, dynamic pose' },
  { name: 'Iron Guardian', character_type: 'superhero', prompt: 'An armored hero with sleek tech suit, glowing chest piece, protective stance' },
  { name: 'Blaze Runner', character_type: 'superhero', prompt: 'A speedster hero with flame trail effects, streamlined costume, running pose' },
  { name: 'Cosmic Star', character_type: 'superhero', prompt: 'A cosmic hero with starfield patterns on costume, floating slightly, serene expression' },
  { name: 'Shadow Swift', character_type: 'superhero', prompt: 'A ninja-style hero in dark outfit, athletic and agile, confident stance' },
  { name: 'Frost Shield', character_type: 'superhero', prompt: 'An ice-powered hero with cool blue costume, ice crystal effects around hands' },
  { name: 'Terra Titan', character_type: 'superhero', prompt: 'A strength hero with earth tones, rocky accents on costume, powerful stance' },
  { name: 'Wind Warrior', character_type: 'superhero', prompt: 'A flying hero with wing-like cape, wind swirl effects, soaring pose' },
  { name: 'Mystic Mage', character_type: 'superhero', prompt: 'A magical hero with glowing staff, mystical runes, flowing robes with athletic cut' },
  { name: 'Aqua Ace', character_type: 'superhero', prompt: 'An ocean-powered hero with scales, trident, water effects swirling' },
  { name: 'Solar Surge', character_type: 'superhero', prompt: 'A sun-powered hero with golden costume, radiating light, warm smile' },
  { name: 'Night Blade', character_type: 'superhero', prompt: 'A stealthy hero in midnight blue, twin daggers, crouched ready' },
  { name: 'Volt Vanguard', character_type: 'superhero', prompt: 'An electric hero with crackling energy, yellow and black costume' },
  { name: 'Stone Sentinel', character_type: 'superhero', prompt: 'A rock-armored hero with granite skin, protective stance' },
  { name: 'Phoenix Fury', character_type: 'superhero', prompt: 'A fire-winged hero rising from flames, orange and red costume' },
  { name: 'Crystal Champion', character_type: 'superhero', prompt: 'A gem-powered hero with crystalline armor, prismatic effects' },
  { name: 'Gravity Guardian', character_type: 'superhero', prompt: 'A hero controlling gravity, floating debris, purple aura' },
  { name: 'Jungle Justice', character_type: 'superhero', prompt: 'A nature hero with vine patterns, green costume, leaf cape' },
  { name: 'Metal Master', character_type: 'superhero', prompt: 'A hero controlling metal, chrome costume, floating metal objects' },
  { name: 'Psychic Protector', character_type: 'superhero', prompt: 'A telepathic hero with glowing temples, mind wave effects' },
  { name: 'Quantum Quest', character_type: 'superhero', prompt: 'A reality-warping hero with shifting costume, dimensional effects' },
  { name: 'Radiant Ray', character_type: 'superhero', prompt: 'A light-projecting hero with luminous costume, bright energy beams' },
  { name: 'Sonic Siren', character_type: 'superhero', prompt: 'A sound-wave hero with audio equipment aesthetic, soundwave effects' },
  { name: 'Tech Titan', character_type: 'superhero', prompt: 'A gadget hero with holographic displays, cyber armor, drones' },
  { name: 'Ultra Unity', character_type: 'superhero', prompt: 'A team-leader hero with linked emblems, inspiring pose, rainbow accents' },
  { name: 'Vortex Victor', character_type: 'superhero', prompt: 'A tornado-creating hero with spiral costume, wind funnel effects' },
  { name: 'Wave Warden', character_type: 'superhero', prompt: 'An ocean-surf hero riding wave, blue and white costume' },
  { name: 'Xenon Xtreme', character_type: 'superhero', prompt: 'An alien hero with otherworldly features, glowing suit, cosmic background' },
  { name: 'Yonder Youth', character_type: 'superhero', prompt: 'A young sidekick hero, eager expression, colorful costume, ready to help' },
  { name: 'Zephyr Zero', character_type: 'superhero', prompt: 'An air-current hero with invisible force effects, light flowing costume' },
  { name: 'Atomic Avenger', character_type: 'superhero', prompt: 'A nuclear-powered hero with atomic symbol, glowing core, protective suit' },
  { name: 'Blitz Bolt', character_type: 'superhero', prompt: 'A super-speed hero with blur effects, aerodynamic costume, motion lines' },
  { name: 'Comet Crusader', character_type: 'superhero', prompt: 'A space-traveling hero with meteor trail, starry cape, cosmic helm' },
  { name: 'Diamond Defender', character_type: 'superhero', prompt: 'An unbreakable hero with diamond-hard skin, crystalline costume' },
  { name: 'Echo Elite', character_type: 'superhero', prompt: 'A sound-duplicating hero with multiple echo images, vibrant costume' },
  { name: 'Force Field', character_type: 'superhero', prompt: 'A barrier-creating hero with visible shield dome, protective stance' },
  { name: 'Geo Giant', character_type: 'superhero', prompt: 'A size-changing hero at large scale, friendly giant pose, brown costume' },
  { name: 'Hyper Hawk', character_type: 'superhero', prompt: 'A winged hero with feathered armor, sharp eyes, taloned gloves' },
  { name: 'Illusion Idol', character_type: 'superhero', prompt: 'A reality-bending hero with shifting appearances, mysterious aura' },
  { name: 'Jet Justice', character_type: 'superhero', prompt: 'A rocket-powered hero with jet boots, exhaust trail, helmet visor' },
  { name: 'Kinetic Kid', character_type: 'superhero', prompt: 'A young hero absorbing energy, glowing fists, eager stance' },
  { name: 'Laser Legend', character_type: 'superhero', prompt: 'A beam-shooting hero with visor, red and white costume, precision aim' },
  { name: 'Magnet Maven', character_type: 'superhero', prompt: 'A magnetic hero with floating metal debris, purple and silver costume' },
  { name: 'Nova Knight', character_type: 'superhero', prompt: 'A star-born hero with armor, celestial sword, stellar effects' },
  { name: 'Omega Oracle', character_type: 'superhero', prompt: 'A future-seeing hero with all-seeing eyes, mystical symbols, robes' },
  { name: 'Plasma Paladin', character_type: 'superhero', prompt: 'An energy-sword hero with plasma blade, futuristic armor' },
  { name: 'Quake Queen', character_type: 'superhero', prompt: 'An earthquake-causing hero with cracked ground effects, brown costume' },
  { name: 'Rocket Ranger', character_type: 'superhero', prompt: 'A jetpack hero with flight gear, goggles, adventurous expression' },
  { name: 'Storm Sage', character_type: 'superhero', prompt: 'A weather-controlling hero with lightning and clouds, flowing cape' },

  // ========== MONSTERS (50) - Friendly Monsters Inc. style ==========
  { name: 'Sulley Stretch', character_type: 'monster', prompt: 'A large furry blue monster with purple spots, big friendly smile, wearing workout headband and gym shorts' },
  { name: 'Fuzzy Phil', character_type: 'monster', prompt: 'A round orange furry monster with multiple eyes, cheerful expression, wearing a tiny tank top' },
  { name: 'Blobby Bob', character_type: 'monster', prompt: 'A green gelatinous blob monster with one big eye, happy smile, wearing sweatbands on tentacles' },
  { name: 'Spike Sprint', character_type: 'monster', prompt: 'A purple monster with friendly spikes down back, four arms, wearing running shoes on all feet' },
  { name: 'Googly Gary', character_type: 'monster', prompt: 'A tall skinny green monster with five googly eyes, long arms, wearing basketball jersey' },
  { name: 'Fluff Flex', character_type: 'monster', prompt: 'A pink cotton candy-like monster, fluffy all over, wearing tiny gym gloves' },
  { name: 'Chomper Charlie', character_type: 'monster', prompt: 'A round blue monster with huge friendly teeth, wearing a coach whistle and cap' },
  { name: 'Tentacle Tim', character_type: 'monster', prompt: 'A yellow monster with eight tentacle arms, each holding different gym equipment, cheerful' },
  { name: 'Scales Sally', character_type: 'monster', prompt: 'A turquoise scaled monster with big doe eyes, wearing yoga pants and sports bra' },
  { name: 'Horns Henry', character_type: 'monster', prompt: 'A red monster with two curved horns, kind expression, wearing weightlifting belt' },
  { name: 'Glob Gordon', character_type: 'monster', prompt: 'A translucent gooey monster in shades of purple, wearing visible workout clothes inside body' },
  { name: 'Fang Fiona', character_type: 'monster', prompt: 'A teal monster with cute underbite fangs, long ears, wearing dance leotard' },
  { name: 'Bumpy Boris', character_type: 'monster', prompt: 'A lumpy orange monster covered in friendly bumps, wearing hiking boots' },
  { name: 'Wings Wendy', character_type: 'monster', prompt: 'A small purple monster with bat-like wings, wearing aerobics outfit, mid-flutter' },
  { name: 'Patch Pete', character_type: 'monster', prompt: 'A patchwork monster with different colored fur patches, wearing mix-matched gym clothes' },
  { name: 'Snaggle Sam', character_type: 'monster', prompt: 'A green monster with one snaggletooth, three eyes, wearing karate gi' },
  { name: 'Twirl Tina', character_type: 'monster', prompt: 'A spiral-patterned pink and purple monster, wearing figure skating dress' },
  { name: 'Bounce Barry', character_type: 'monster', prompt: 'A round bouncy yellow monster like a ball, wearing springy shoes, mid-bounce' },
  { name: 'Noodle Nancy', character_type: 'monster', prompt: 'A long noodle-shaped blue monster, very flexible, in yoga pretzel pose' },
  { name: 'Grin Greg', character_type: 'monster', prompt: 'A wide monster thats mostly a huge friendly grin, tiny body, wearing running bib' },
  { name: 'Dot Diana', character_type: 'monster', prompt: 'A lavender monster covered in polka dots, each dot a different color, wearing tennis outfit' },
  { name: 'Claws Carlos', character_type: 'monster', prompt: 'A friendly monster with oversized fuzzy claws, wearing boxing gloves over claws' },
  { name: 'Stripe Stella', character_type: 'monster', prompt: 'A tiger-striped monster in orange and pink, wearing athletic stripes to match' },
  { name: 'Pudge Paul', character_type: 'monster', prompt: 'A chubby lovable green monster, determined expression, wearing workout gear' },
  { name: 'Float Felicia', character_type: 'monster', prompt: 'A ghost-like translucent monster who floats, wearing ethereal workout attire' },
  { name: 'Rock Randy', character_type: 'monster', prompt: 'A monster made of friendly rounded rocks, wearing a climbing harness' },
  { name: 'Shimmer Shelly', character_type: 'monster', prompt: 'A sparkly iridescent monster that shimmers, wearing glittery dance costume' },
  { name: 'Trunk Trevor', character_type: 'monster', prompt: 'A monster with a long trunk-like nose, using it to lift weights, cheerful' },
  { name: 'Ear Eddie', character_type: 'monster', prompt: 'A small monster with enormous floppy ears, using them as wings, wearing pilot goggles' },
  { name: 'Curl Cathy', character_type: 'monster', prompt: 'A monster with curly tentacle hair, each curl a different color, wearing headband' },
  { name: 'Glow Gina', character_type: 'monster', prompt: 'A bioluminescent monster that glows softly, wearing reflective running gear' },
  { name: 'Munch Mike', character_type: 'monster', prompt: 'A one-eyed green monster with big smile, compact body, wearing MU sweatshirt' },
  { name: 'Jelly James', character_type: 'monster', prompt: 'A jellyfish-like monster with two stubby legs, translucent blue body, wearing swim goggles' },
  { name: 'Moss Morgan', character_type: 'monster', prompt: 'A mossy green bipedal nature monster, leaves growing from fur, wearing eco-friendly gym clothes' },
  { name: 'Zigzag Zara', character_type: 'monster', prompt: 'A bipedal monster with zigzag patterned body, electric personality, two arms two legs, wearing sprint gear' },
  { name: 'Bubble Benny', character_type: 'monster', prompt: 'A bubble-blowing bipedal monster with soap-like skin, cheerful, wearing swim trunks' },
  { name: 'Crystal Claire', character_type: 'monster', prompt: 'A crystalline bipedal monster with gem-like protrusions, two arms two legs, wearing sparkly gymnastics outfit' },
  { name: 'Shadow Shane', character_type: 'monster', prompt: 'A friendly shadow monster standing upright, dark purple, two arms two legs, wearing glow-in-dark workout stripes' },
  { name: 'Squish Sophia', character_type: 'monster', prompt: 'A squishy stress-ball-like pink bipedal monster, very huggable, wearing comfy athleisure' },
  { name: 'Antler Andy', character_type: 'monster', prompt: 'A furry bipedal monster with majestic antlers, forest green, two arms two legs, wearing hiking gear' },
  { name: 'Twinkle Tina', character_type: 'monster', prompt: 'A sparkly star-shaped bipedal monster, glowing yellow, two arms two stubby legs, wearing tutu' },
  { name: 'Crest Calvin', character_type: 'monster', prompt: 'A dinosaur-like bipedal monster with colorful head crest, two arms two legs, wearing prehistoric gym outfit' },
  { name: 'Vapor Vicky', character_type: 'monster', prompt: 'A misty cloud-like monster, soft and fluffy, wearing cozy workout sweater' },
  { name: 'Twist Tony', character_type: 'monster', prompt: 'A pretzel-shaped flexible monster, stretchy, wearing contortionist outfit' },
  { name: 'Marble Mary', character_type: 'monster', prompt: 'A smooth marble-textured monster with swirl patterns, wearing elegant dancewear' },
  { name: 'Fuzz Felix', character_type: 'monster', prompt: 'An extremely fuzzy monster, cant see eyes through fur, wearing visible headband' },
  { name: 'Snore Stanley', character_type: 'monster', prompt: 'A sleepy-looking monster with droopy eyes, determined to stay awake for workout' },
  { name: 'Giggle Grace', character_type: 'monster', prompt: 'A monster who cant stop giggling, pink cheeks, wearing cheerleader outfit' },
  { name: 'Warts Walter', character_type: 'monster', prompt: 'A warty toad-like monster, friendly bumps, wearing swim team speedo' },
  { name: 'Swirl Susie', character_type: 'monster', prompt: 'A hypnotic swirl-patterned monster in blues and greens, wearing spiral-design leggings' },
];

// ============================================================================
// localStorage helpers for rejected templates (like locations pattern)
// ============================================================================
const REJECTED_AVATAR_TEMPLATES_KEY = "fitness_avatar_rejected_templates_v1";
const RECENT_AVATAR_TEMPLATES_KEY = "fitness_avatar_recent_templates_v1";
const MAX_RECENT_TEMPLATES = 8;

const readRejectedTemplates = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REJECTED_AVATAR_TEMPLATES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const writeRejectedTemplates = (names: string[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REJECTED_AVATAR_TEMPLATES_KEY, JSON.stringify(names));
  } catch {
    // ignore
  }
};

const readRecentTemplates = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_AVATAR_TEMPLATES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const writeRecentTemplates = (names: string[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_AVATAR_TEMPLATES_KEY, JSON.stringify(names));
  } catch {
    // ignore
  }
};

const AVATAR_CATEGORIES = [
  { value: "free", label: "Free Tier", emoji: "🆓" },
  { value: "animals", label: "Animals", emoji: "🐾" },
  { value: "superheroes", label: "Superheroes", emoji: "🦸" },
  { value: "humans", label: "Humans", emoji: "👤" },
  { value: "monsters", label: "Monsters", emoji: "👹" },
] as const;

const defaultFormData = {
  name: "", description: "", preview_image_url: "", character_prompt: "",
  is_free: false, price_coins: 100, display_order: 0, is_active: true,
  character_type: "human" as string,
  category: "free" as string,
};

export function FitnessAvatarManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [generatingInDialog, setGeneratingInDialog] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [generatingWorkoutTest, setGeneratingWorkoutTest] = useState<string | null>(null);
  const [workoutTestResult, setWorkoutTestResult] = useState<{
    imageUrl: string;
    workout: string;
    location: string;
  } | null>(null);
  const [workoutTestDialogOpen, setWorkoutTestDialogOpen] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [removingBgFor, setRemovingBgFor] = useState<string | null>(null);
  
  // localStorage-backed rejected templates (like locations pattern)
  const [rejectedTemplates, setRejectedTemplates] = useState<string[]>(() => readRejectedTemplates());
  const [recentTemplates, setRecentTemplates] = useState<string[]>(() => readRecentTemplates());
  const [previousTemplateName, setPreviousTemplateName] = useState<string | null>(null);
  const [rejectedDialogOpen, setRejectedDialogOpen] = useState(false);
  const [randomizeCategoryFilter, setRandomizeCategoryFilter] = useState<'all' | 'animal' | 'human' | 'superhero'>('all');

  const handleImageClick = (imageUrl: string) => {
    setLightboxImage(imageUrl);
    setLightboxOpen(true);
  };

  const handleDownloadImage = async (avatar: any) => {
    if (!avatar.preview_image_url) {
      toast.error("No image to download");
      return;
    }
    
    try {
      const response = await fetch(avatar.preview_image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${avatar.name.toLowerCase().replace(/\s+/g, "-")}-avatar.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  const handleUploadImage = async (avatarId: string, file: File) => {
    setUploadingFor(avatarId);
    
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `fitness-avatar-${avatarId}-${Date.now()}.${fileExt}`;
      const filePath = `fitness-avatars/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from("fitness_avatars")
        .update({ preview_image_url: urlData.publicUrl })
        .eq("id", avatarId);
      
      if (updateError) throw updateError;
      
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      showErrorToastWithCopy("Failed to upload image", error);
    } finally {
      setUploadingFor(null);
    }
  };

  const handleRemoveBackground = async (avatar: any) => {
    if (!avatar.preview_image_url) {
      toast.error("No image to process");
      return;
    }
    
    setRemovingBgFor(avatar.id);
    toast.info("🎨 Removing background...", { description: "This may take a moment." });
    
    try {
      const { data, error } = await supabase.functions.invoke("remove-customer-background", {
        body: { imageUrl: avatar.preview_image_url, customerId: avatar.id },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      const { error: updateError } = await supabase
        .from("fitness_avatars")
        .update({ preview_image_url: data.imageUrl })
        .eq("id", avatar.id);
      
      if (updateError) throw updateError;
      
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Background removed!", { description: "Image updated with white background." });
    } catch (error) {
      console.error("Background removal error:", error);
      showErrorToastWithCopy("Failed to remove background", error);
    } finally {
      setRemovingBgFor(null);
    }
  };

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["admin-fitness-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fitness_avatars").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        name: data.name, description: data.description || null,
        preview_image_url: data.preview_image_url || null, character_prompt: data.character_prompt,
        is_free: data.is_free, price_coins: data.is_free ? 0 : data.price_coins,
        display_order: data.display_order, is_active: data.is_active,
        category: data.category || "free",
      };
      if (data.id) {
        const { error } = await supabase.from("fitness_avatars").update(payload).eq("id", data.id);
        if (error) throw error;
        return { id: data.id };
      } else {
        const { data: newAvatar, error } = await supabase.from("fitness_avatars").insert(payload).select().single();
        if (error) throw error;
        return { id: newAvatar.id, isNew: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success(editingAvatar ? "Avatar updated!" : "Avatar created!");
      handleCloseDialog();
    },
    onError: (error) => showErrorToastWithCopy("Failed to save avatar", error),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_avatars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] }); toast.success("Avatar deleted"); },
    onError: (error) => showErrorToastWithCopy("Failed to delete avatar", error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("fitness_avatars").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] }),
  });

  const generateImageMutation = useMutation({
    mutationFn: async (avatar: { id: string; name: string; character_prompt: string; character_type?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-avatar-image", {
        body: { 
          avatarId: avatar.id, 
          characterPrompt: avatar.character_prompt, 
          name: avatar.name,
          characterType: avatar.character_type || 'human'
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Avatar image generated!", { description: "The preview has been updated." });
      if (data.imageUrl) {
        setFormData(prev => ({ ...prev, preview_image_url: data.imageUrl }));
      }
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to generate image", error);
    },
    onSettled: () => {
      setGeneratingImageFor(null);
      setGeneratingInDialog(false);
    },
  });

  const testWorkoutImageMutation = useMutation({
    mutationFn: async (avatar: { id: string; name: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-workout-image", {
        body: { 
          avatarId: avatar.id, 
          imageType: "activity",
          isAdminTest: true,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setWorkoutTestResult({
        imageUrl: data.image?.image_url,
        workout: data.selectedWorkout || "Unknown",
        location: data.selectedLocation || "Unknown",
      });
      setWorkoutTestDialogOpen(true);
      toast.success("Test workout image generated!");
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to generate test workout image", error);
    },
    onSettled: () => {
      setGeneratingWorkoutTest(null);
    },
  });

  const handleTestWorkoutImage = (avatar: any) => {
    if (!avatar.character_prompt) {
      toast.error("Character prompt is required");
      return;
    }
    setGeneratingWorkoutTest(avatar.id);
    toast.info("🏋️ Generating test workout image...", { description: "Random workout + random location" });
    testWorkoutImageMutation.mutate({ id: avatar.id, name: avatar.name });
  };

  const handleEdit = (avatar: any) => {
    setEditingAvatar(avatar);
    setFormData({ 
      name: avatar.name, 
      description: avatar.description || "", 
      preview_image_url: avatar.preview_image_url || "",
      character_prompt: avatar.character_prompt || "", 
      is_free: avatar.is_free, 
      price_coins: avatar.price_coins,
      display_order: avatar.display_order, 
      is_active: avatar.is_active,
      character_type: "human",
      category: avatar.category || "free",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { 
    setDialogOpen(false); 
    setEditingAvatar(null); 
    setFormData(defaultFormData); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.character_prompt) { 
      toast.error("Name and character prompt are required"); 
      return; 
    }
    
    const result = await saveMutation.mutateAsync({ ...formData, id: editingAvatar?.id });
    
    if (result.isNew && !formData.preview_image_url && formData.character_prompt) {
      toast.info("✨ Generating avatar image...", { description: "This may take a moment." });
      generateImageMutation.mutate({ 
        id: result.id, 
        name: formData.name, 
        character_prompt: formData.character_prompt,
        character_type: formData.character_type,
      });
    }
  };

  // ============================================================================
  // RANDOMIZE - matches locations pattern exactly
  // ============================================================================
  const handleRandomize = () => {
    // If previous template was shown and user clicks randomize again, auto-reject it
    if (previousTemplateName && formData.name === previousTemplateName) {
      if (!rejectedTemplates.includes(previousTemplateName)) {
        const newRejected = [...rejectedTemplates, previousTemplateName];
        setRejectedTemplates(newRejected);
        writeRejectedTemplates(newRejected);
        toast.info(`"${previousTemplateName}" rejected`, {
          description: "It won't be suggested again. Click 'Rejected' to restore.",
        });
      }
    }
    
    // Filter by selected category first
    const categoryFilteredTemplates = randomizeCategoryFilter === 'all'
      ? avatarTemplates
      : avatarTemplates.filter(t => t.character_type === randomizeCategoryFilter);

    if (categoryFilteredTemplates.length === 0) {
      toast.error("No templates in this category");
      return;
    }

    // Prefer unused templates, but NEVER get stuck at "no templates left".
    // If all templates already exist as avatars, we fall back to allowing repeats
    // (like location packs never "run out").
    const usedNames = new Set((avatars || []).map((a) => (a.name || "").toLowerCase().trim()));
    const rejectedNamesLower = new Set(rejectedTemplates.map((n) => n.toLowerCase().trim()));

    const nonRejectedTemplates = categoryFilteredTemplates.filter(
      (t) => !rejectedNamesLower.has(t.name.toLowerCase().trim())
    );

    const unusedTemplates = nonRejectedTemplates.filter(
      (t) => !usedNames.has(t.name.toLowerCase().trim())
    );

    const usingFallbackRepeats = unusedTemplates.length === 0;
    const availableTemplates = usingFallbackRepeats ? nonRejectedTemplates : unusedTemplates;

    if (availableTemplates.length === 0) {
      // Only happens if user rejected EVERYTHING.
      toast.error("No templates available", {
        description:
          rejectedTemplates.length > 0
            ? `All ${avatarTemplates.length} templates are rejected. Click the restore button (archive icon) to bring some back.`
            : "No templates are configured.",
      });
      return;
    }
    
    // Pick random template, avoiding recently shown
    const recentNamesLower = new Set(recentTemplates.map(n => n.toLowerCase()));
    let pool = availableTemplates.filter(t => !recentNamesLower.has(t.name.toLowerCase()));
    if (pool.length === 0) pool = availableTemplates;
    
    const randomTemplate = pool[Math.floor(Math.random() * pool.length)];
    
    // Update recent templates
    const newRecent = [randomTemplate.name, ...recentTemplates.filter(n => n !== randomTemplate.name)].slice(0, MAX_RECENT_TEMPLATES);
    setRecentTemplates(newRecent);
    writeRecentTemplates(newRecent);
    
    const typeEmoji = randomTemplate.character_type === 'animal' ? '🐾 Animal' 
      : randomTemplate.character_type === 'superhero' ? '🦸 Superhero' 
      : '👤 Human';
    
    // Generate diverse demographic traits for HUMAN characters only (not animals or monsters)
    let demographicSuffix = "";
    if (randomTemplate.character_type === 'human' || randomTemplate.character_type === 'superhero') {
      const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
      
      // Realistic skin tones - weighted toward common demographics
      const skinTone = pick([
        "light skin", "light skin", "medium skin", "tan skin", "olive skin", 
        "brown skin", "brown skin", "dark brown skin",
      ]);
      
      // Realistic gender presentation - no androgynous
      const genderPresentation = pick([
        "feminine-presenting", "feminine-presenting", "masculine-presenting", "masculine-presenting",
      ]);
      
      // Realistic hair colors only - no fantasy colors
      const hairColor = pick([
        "black", "black", "brown", "brown", "brown", "blonde", "red", "auburn", "gray",
      ]);
      const hairStyle = pick([
        "curly hair", "wavy hair", "straight hair", "short hair", "short hair", "long hair",
      ]);
      
      demographicSuffix = `. Character has ${skinTone}, ${genderPresentation}, with ${hairColor} ${hairStyle}`;
    }
    // For animals and monsters - no demographic suffix added
    
    const categoryMap: Record<string, string> = {
      'animal': 'animals',
      'superhero': 'superheroes',
      'human': 'humans',
    };
    
    setFormData(prev => ({
      ...prev,
      name: randomTemplate.name,
      description: `A ${randomTemplate.character_type === 'animal' ? 'friendly animal' : randomTemplate.character_type === 'superhero' ? 'heroic' : 'friendly'} character who loves fitness and can do any sport!`,
      character_prompt: randomTemplate.prompt + demographicSuffix,
      character_type: randomTemplate.character_type,
      category: categoryMap[randomTemplate.character_type] || 'humans',
      display_order: avatars?.length || 0,
    }));
    
    setPreviousTemplateName(randomTemplate.name);
    
    const remaining = availableTemplates.length - 1;
    toast.success(`Randomized: ${randomTemplate.name}`, {
      description: `${typeEmoji} • ${remaining} left${usingFallbackRepeats ? " (repeats allowed)" : " unused"} • ${rejectedTemplates.length} rejected`,
    });
  };

  // Restore a rejected template
  const handleRestoreTemplate = (name: string) => {
    const newRejected = rejectedTemplates.filter(n => n !== name);
    setRejectedTemplates(newRejected);
    writeRejectedTemplates(newRejected);
    toast.success(`"${name}" restored`);
  };

  const handleGenerateImage = (avatar: any) => {
    if (!avatar.character_prompt) {
      toast.error("Character prompt is required to generate an image");
      return;
    }
    setGeneratingImageFor(avatar.id);
    toast.info("✨ Generating avatar image...", { description: "This may take a moment." });
    const inferredType = avatar.character_prompt?.toLowerCase().includes('animal') || 
                         avatar.character_prompt?.toLowerCase().match(/\b(dog|cat|bear|rabbit|fox|lion|tiger|panda|koala|owl|penguin|dolphin|elephant|giraffe|monkey)\b/)
                         ? 'animal' : 'human';
    generateImageMutation.mutate({ id: avatar.id, name: avatar.name, character_prompt: avatar.character_prompt, character_type: inferredType });
  };

  const handleGenerateImageInDialog = async () => {
    if (!formData.character_prompt) {
      toast.error("Character prompt is required to generate an image");
      return;
    }
    
    if (!editingAvatar?.id) {
      toast.error("Please save the avatar first, then generate an image");
      return;
    }
    
    setGeneratingInDialog(true);
    toast.info("✨ Generating avatar image...", { description: "This may take a moment." });
    generateImageMutation.mutate({ 
      id: editingAvatar.id, 
      name: formData.name, 
      character_prompt: formData.character_prompt,
      character_type: formData.character_type,
    });
  };

  const handleSaveAndGenerate = async () => {
    if (!formData.name || !formData.character_prompt) {
      toast.error("Name and character prompt are required");
      return;
    }
    
    setGeneratingInDialog(true);
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        preview_image_url: formData.preview_image_url || null,
        character_prompt: formData.character_prompt,
        is_free: formData.is_free,
        price_coins: formData.is_free ? 0 : formData.price_coins,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };
      
      const { data: newAvatar, error } = await supabase
        .from("fitness_avatars")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      setEditingAvatar(newAvatar);
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Avatar created! Now generating image...");
      
      generateImageMutation.mutate({
        id: newAvatar.id,
        name: formData.name,
        character_prompt: formData.character_prompt,
        character_type: formData.character_type,
      });
    } catch (error) {
      setGeneratingInDialog(false);
      showErrorToastWithCopy("Failed to save avatar", error);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fitness Avatars</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Mix of animal, human, and superhero characters for workouts</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setEditingAvatar(null); setFormData(defaultFormData); }}>
                <Plus className="h-4 w-4 mr-1" />Add Avatar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAvatar ? "Edit Avatar" : "Create Avatar"}</DialogTitle>
              </DialogHeader>
              
              {/* Category Filter + Randomize Button + Rejected button */}
              <div className="flex gap-2 items-center">
                <Select
                  value={randomizeCategoryFilter}
                  onValueChange={(val) => setRandomizeCategoryFilter(val as 'all' | 'animal' | 'human' | 'superhero')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🎲 All Types</SelectItem>
                    <SelectItem value="animal">🐾 Animals</SelectItem>
                    <SelectItem value="human">👤 Humans</SelectItem>
                    <SelectItem value="superhero">🦸 Superheroes</SelectItem>
                    <SelectItem value="monster">👹 Monsters</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRandomize}
                  className="flex-1"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Randomize
                </Button>
                {rejectedTemplates.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRejectedDialogOpen(true)}
                    className="px-3"
                    title={`${rejectedTemplates.length} rejected templates`}
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    <Badge variant="secondary" className="ml-1.5 text-xs">
                      {rejectedTemplates.length}
                    </Badge>
                  </Button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="Sporty Cat" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="A friendly cat who loves all sports" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Character Prompt *</Label>
                  <Textarea 
                    value={formData.character_prompt} 
                    onChange={(e) => setFormData({ ...formData, character_prompt: e.target.value })} 
                    rows={3} 
                    placeholder="A friendly orange tabby cat with athletic build, wearing a colorful headband..."
                  />
                  <p className="text-xs text-muted-foreground">Describe the character's appearance for AI generation. Don't include sports - they can do any sport!</p>
                </div>
                
                {/* Preview Image Section */}
                <div className="space-y-2">
                  <Label>Preview Image</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.preview_image_url} 
                      onChange={(e) => setFormData({ ...formData, preview_image_url: e.target.value })} 
                      placeholder="Auto-generated or paste URL"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={editingAvatar?.id ? handleGenerateImageInDialog : handleSaveAndGenerate}
                      disabled={generatingInDialog || !formData.character_prompt || !formData.name}
                      title={editingAvatar?.id ? "Generate AI image" : "Save & Generate AI image"}
                    >
                      {generatingInDialog ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 text-purple-600" />
                      )}
                    </Button>
                  </div>
                  {formData.preview_image_url && (
                    <div className="mt-2 flex items-center gap-3">
                      <img 
                        src={formData.preview_image_url} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(formData.preview_image_url)}
                        title="Click to enlarge"
                      />
                      <span className="text-xs text-muted-foreground">Click to enlarge</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {editingAvatar?.id ? "Click the wand to regenerate" : "Click the wand to save & generate image"}
                  </p>
                </div>
                
                {/* Category Selector */}
                <div className="space-y-2">
                  <Label>Category (Display Group)</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.emoji} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose which group this avatar appears in</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input 
                      type="number" 
                      value={formData.display_order} 
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coin Price</Label>
                    <Input 
                      type="number" 
                      value={formData.price_coins} 
                      onChange={(e) => setFormData({ ...formData, price_coins: parseInt(e.target.value) || 0 })} 
                      disabled={formData.is_free} 
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_free} 
                      onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })} 
                    />
                    <Label>Free</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_active} 
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} 
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {avatars?.map((avatar) => (
              <TableRow key={avatar.id}>
                <TableCell>
                  <div className="w-12 h-12 rounded-md bg-muted overflow-hidden relative">
                    {avatar.preview_image_url ? (
                      <img 
                        src={avatar.preview_image_url} 
                        alt={avatar.name} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(avatar.preview_image_url)}
                        title="Click to enlarge"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🏃</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{avatar.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{avatar.character_prompt}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {AVATAR_CATEGORIES.find(c => c.value === avatar.category)?.emoji || '📁'}{' '}
                    {AVATAR_CATEGORIES.find(c => c.value === avatar.category)?.label || avatar.category || 'Uncategorized'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {avatar.is_free ? (
                    <Badge variant="secondary">Free</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Coins className="h-3 w-3" />{avatar.price_coins}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => toggleActiveMutation.mutate({ id: avatar.id, is_active: !avatar.is_active })}
                  >
                    {avatar.is_active ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleDownloadImage(avatar)}
                      disabled={!avatar.preview_image_url}
                      title="Download image"
                    >
                      <Download className="h-4 w-4 text-blue-600" />
                    </Button>
                    
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => document.getElementById(`upload-${avatar.id}`)?.click()}
                      disabled={uploadingFor === avatar.id}
                      title="Upload new image"
                    >
                      {uploadingFor === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <input
                      id={`upload-${avatar.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(avatar.id, file);
                        e.target.value = "";
                      }}
                    />
                    
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleRemoveBackground(avatar)}
                      disabled={removingBgFor === avatar.id || !avatar.preview_image_url}
                      title="Remove background (white bg)"
                    >
                      {removingBgFor === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eraser className="h-4 w-4 text-pink-600" />
                      )}
                    </Button>
                    
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleTestWorkoutImage(avatar)}
                      disabled={generatingWorkoutTest === avatar.id || !avatar.character_prompt}
                      title="Test workout image (random workout + location)"
                    >
                      {generatingWorkoutTest === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Dumbbell className="h-4 w-4 text-orange-600" />
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleGenerateImage(avatar)}
                      disabled={generatingImageFor === avatar.id || !avatar.character_prompt}
                      title={avatar.preview_image_url ? "Regenerate AI image" : "Generate AI image"}
                    >
                      {generatingImageFor === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : avatar.preview_image_url ? (
                        <RefreshCw className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Wand2 className="h-4 w-4 text-purple-600" />
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleEdit(avatar)} 
                      title="Edit avatar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-destructive" 
                      onClick={() => { if (confirm("Delete this avatar?")) deleteMutation.mutate(avatar.id); }} 
                      title="Delete avatar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {avatars?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No avatars yet. Click "Add Avatar" and use "Randomize Character" to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImage ? [{ image_url: lightboxImage }] : []}
        currentIndex={0}
        isOpen={lightboxOpen}
        onClose={() => {
          setLightboxOpen(false);
          setLightboxImage(null);
        }}
        onPrevious={() => {}}
        onNext={() => {}}
      />

      {/* Test Workout Image Result Dialog */}
      <Dialog open={workoutTestDialogOpen} onOpenChange={setWorkoutTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Test Workout Image Result</DialogTitle>
          </DialogHeader>
          {workoutTestResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Workout:</p>
                  <p className="text-lg font-semibold capitalize">{workoutTestResult.workout}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Location:</p>
                  <p className="text-lg font-semibold capitalize">{workoutTestResult.location}</p>
                </div>
              </div>
              {workoutTestResult.imageUrl && (
                <div className="rounded-lg overflow-hidden border">
                  <img 
                    src={workoutTestResult.imageUrl} 
                    alt="Test workout" 
                    className="w-full h-auto cursor-pointer"
                    onClick={() => handleImageClick(workoutTestResult.imageUrl)}
                    title="Click to enlarge"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                This image was generated with a random workout and location to test the system.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejected Templates Dialog (localStorage-backed, like locations) */}
      <Dialog open={rejectedDialogOpen} onOpenChange={setRejectedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArchiveRestore className="w-5 h-5" />
              Rejected Templates ({rejectedTemplates.length})
            </DialogTitle>
          </DialogHeader>
          
          {rejectedTemplates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No rejected templates
            </p>
          ) : (
            <>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 pr-4">
                  {rejectedTemplates.map((name) => {
                    const template = avatarTemplates.find(t => t.name === name);
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{name}</p>
                          {template && (
                            <p className="text-xs text-muted-foreground truncate">
                              {template.character_type === 'animal' ? '🐾' : template.character_type === 'superhero' ? '🦸' : '👤'} {template.character_type}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreTemplate(name)}
                        >
                          Restore
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectedDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
