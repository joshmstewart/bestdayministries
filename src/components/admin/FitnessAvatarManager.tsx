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
  { name: 'Power Panda', character_type: 'animal', prompt: 'A strong black and white panda bear with a muscular build, wearing casual shorts and a tank top' },
  { name: 'Flash Fox', character_type: 'animal', prompt: 'An energetic red fox with sleek fur, wearing sneakers and a casual tracksuit' },
  { name: 'Mighty Mouse', character_type: 'animal', prompt: 'A small but determined gray mouse with big ears, wearing tiny gloves and sneakers' },
  { name: 'Bounce Bunny', character_type: 'animal', prompt: 'A fluffy white rabbit with pink ears, athletic build, wearing a colorful jersey' },
  { name: 'Strong Bear', character_type: 'animal', prompt: 'A friendly brown bear with powerful arms, wearing casual clothes and gloves' },
  { name: 'Swift Deer', character_type: 'animal', prompt: 'A graceful spotted deer with long legs, wearing a comfortable outfit' },
  { name: 'Flex Frog', character_type: 'animal', prompt: 'A bright green frog with strong legs, wearing casual shorts and wristbands' },
  { name: 'Dash Dog', character_type: 'animal', prompt: 'A golden retriever with a friendly face, wearing a bandana and sneakers' },
  { name: 'Owl Coach', character_type: 'animal', prompt: 'A wise brown owl with big eyes, wearing a whistle and cap' },
  { name: 'Tiger Trainer', character_type: 'animal', prompt: 'An orange tiger with black stripes, athletic build, wearing casual gear' },
  { name: 'Penguin Pal', character_type: 'animal', prompt: 'A cheerful black and white penguin, wearing a tiny headband' },
  { name: 'Kangaroo Kick', character_type: 'animal', prompt: 'A muscular kangaroo with boxing gloves, athletic stance, wearing shorts' },
  { name: 'Gorilla Grip', character_type: 'animal', prompt: 'A strong silverback gorilla with kind eyes, wearing a belt and wristbands' },
  { name: 'Cheetah Chase', character_type: 'animal', prompt: 'A sleek cheetah with spotted fur, wearing speed goggles' },
  { name: 'Elephant Effort', character_type: 'animal', prompt: 'A gentle gray elephant with a determined look, wearing a headband' },
  { name: 'Dolphin Dive', character_type: 'animal', prompt: 'A playful dolphin with a swimmer\'s build, wearing goggles on forehead' },
  { name: 'Lion Leader', character_type: 'animal', prompt: 'A majestic lion with flowing mane, wearing a jersey and whistle' },
  { name: 'Koala Calm', character_type: 'animal', prompt: 'A peaceful koala in a relaxed pose, wearing cozy comfortable clothes' },
  { name: 'Hippo Hustle', character_type: 'animal', prompt: 'A surprisingly agile hippo in casual clothes, mid-move' },
  { name: 'Raccoon Run', character_type: 'animal', prompt: 'A sneaky raccoon with athletic build, wearing casual gear' },
  { name: 'Giraffe Glide', character_type: 'animal', prompt: 'A tall giraffe with long neck, wearing a basketball jersey' },
  { name: 'Zebra Zoom', character_type: 'animal', prompt: 'A striped zebra in running pose, wearing a track outfit' },
  { name: 'Rhino Rush', character_type: 'animal', prompt: 'A powerful rhino with protective gear, football stance' },
  { name: 'Sloth Stretch', character_type: 'animal', prompt: 'A relaxed sloth doing stretches, wearing cozy clothes' },
  { name: 'Otter Athlete', character_type: 'animal', prompt: 'A playful otter with sleek fur, wearing swim gear and cap' },
  { name: 'Hawk Hover', character_type: 'animal', prompt: 'A sharp-eyed hawk with powerful wings, wearing aviator gear' },
  { name: 'Turtle Trek', character_type: 'animal', prompt: 'A determined turtle with hiking gear, wearing a tiny backpack' },
  { name: 'Wolf Warrior', character_type: 'animal', prompt: 'A fierce gray wolf with intense eyes, wearing a martial arts gi' },
  { name: 'Monkey Move', character_type: 'animal', prompt: 'An agile monkey swinging through gymnastics rings, wearing a leotard' },
  { name: 'Parrot Power', character_type: 'animal', prompt: 'A colorful parrot with vibrant feathers, wearing a dance outfit' },
  { name: 'Seal Spin', character_type: 'animal', prompt: 'A playful seal balancing a ball, wearing aquatic gear' },
  { name: 'Badger Boost', character_type: 'animal', prompt: 'A tough badger with determined expression, wearing boxing shorts' },
  { name: 'Flamingo Flex', character_type: 'animal', prompt: 'A graceful pink flamingo in tree pose, wearing leggings' },
  { name: 'Hedgehog Hustle', character_type: 'animal', prompt: 'A cute hedgehog with tiny sneakers, wearing a three-piece business suit' },
  { name: 'Lemur Leap', character_type: 'animal', prompt: 'A ring-tailed lemur mid-jump, wearing a wedding tuxedo with tails' },
  { name: 'Moose Muscle', character_type: 'animal', prompt: 'A large moose with impressive antlers, wearing a construction worker hard hat and vest' },
  { name: 'Peacock Pose', character_type: 'animal', prompt: 'A beautiful peacock with spread tail, wearing a glamorous ball gown and tiara' },
  { name: 'Jaguar Jab', character_type: 'animal', prompt: 'A spotted jaguar in boxing stance, wearing a disco jumpsuit with sequins' },
  { name: 'Crocodile Crunch', character_type: 'animal', prompt: 'A muscular crocodile, wearing chef whites and a tall chef hat' },
  { name: 'Squirrel Sprint', character_type: 'animal', prompt: 'A quick squirrel in racing position, wearing a race car driver suit' },
  { name: 'Polar Power', character_type: 'animal', prompt: 'A white polar bear with immense strength, wearing a Scottish kilt and sporran' },
  { name: 'Bat Balance', character_type: 'animal', prompt: 'A friendly bat hanging upside down in pose, wearing a magician cape and top hat' },
  { name: 'Beaver Build', character_type: 'animal', prompt: 'A hardworking beaver with strong arms, wearing overalls and a flannel shirt' },
  { name: 'Crab Cardio', character_type: 'animal', prompt: 'A red crab doing sideways exercises, wearing a Hawaiian shirt and sunglasses' },
  { name: 'Duck Dash', character_type: 'animal', prompt: 'A yellow duck waddling fast, wearing a postal worker uniform with mail bag' },
  { name: 'Eagle Eye', character_type: 'animal', prompt: 'A majestic bald eagle with sharp focus, wearing a pilot bomber jacket and aviator goggles' },
  { name: 'Ferret Fast', character_type: 'animal', prompt: 'A quick ferret zooming around, wearing a ninja outfit with throwing stars' },
  { name: 'Goat Climb', character_type: 'animal', prompt: 'A mountain goat on rocky terrain, wearing Swiss lederhosen' },
  { name: 'Husky Hero', character_type: 'animal', prompt: 'A fluffy husky with bright blue eyes, wearing an astronaut space suit' },

  // ========== HUMANS (50) ==========
  { name: 'Coach Casey', character_type: 'human', prompt: 'A friendly adult coach with short hair, warm smile, wearing a vintage 1920s flapper dress' },
  { name: 'Zara Zoom', character_type: 'human', prompt: 'A young Black girl with curly hair in puffs, athletic build, wearing a princess ball gown' },
  { name: 'Marcus Move', character_type: 'human', prompt: 'A young Latino boy with wavy hair, enthusiastic expression, wearing a chef coat and toque' },
  { name: 'Kim Kick', character_type: 'human', prompt: 'A young Asian girl with straight black hair in ponytail, wearing a space astronaut suit' },
  { name: 'Super Sam', character_type: 'human', prompt: 'A young boy with Down syndrome, big smile, wearing medieval knight armor' },
  { name: 'Wheels Wendy', character_type: 'human', prompt: 'A young girl in a sporty wheelchair, brown pigtails, wearing a rockstar outfit with guitar' },
  { name: 'Jumping Jack', character_type: 'human', prompt: 'A young boy with red hair and freckles, energetic pose, wearing a cowboy outfit with boots' },
  { name: 'Yoga Yara', character_type: 'human', prompt: 'A young South Asian girl with long braided hair, peaceful expression, wearing traditional sari' },
  { name: 'Dancing Devon', character_type: 'human', prompt: 'A young nonbinary child with short colorful hair, wearing a disco glitter jumpsuit' },
  { name: 'Swimmer Sofia', character_type: 'human', prompt: 'A young girl with swim cap and goggles on head, wearing a scientist lab coat' },
  { name: 'Runner Ray', character_type: 'human', prompt: 'A young African American boy with short hair, wearing a hip-hop outfit with gold chain' },
  { name: 'Gymnast Grace', character_type: 'human', prompt: 'A young girl with hair in bun, wearing a vintage Victorian dress' },
  { name: 'Archer Aiden', character_type: 'human', prompt: 'A focused young boy with steady hands, wearing a wizard robe with magic wand' },
  { name: 'Boxer Bella', character_type: 'human', prompt: 'A determined young girl with boxing braids, wearing a superhero cape and mask' },
  { name: 'Climber Cole', character_type: 'human', prompt: 'An adventurous young boy with chalk on hands, wearing a jungle explorer outfit' },
  { name: 'Diver Diana', character_type: 'human', prompt: 'A young girl on diving board, wearing a fairy costume with wings' },
  { name: 'Fencer Felix', character_type: 'human', prompt: 'A young boy in musketeer outfit with feathered hat, épée in hand' },
  { name: 'Goalie Gina', character_type: 'human', prompt: 'A young girl wearing a punk rock outfit with mohawk and leather jacket' },
  { name: 'Hockey Hunter', character_type: 'human', prompt: 'A young boy wearing a vampire costume with cape and fangs' },
  { name: 'Ice Skater Ivy', character_type: 'human', prompt: 'A young girl in elegant figure skating dress with sparkles' },
  { name: 'Judoka Jasmine', character_type: 'human', prompt: 'A young girl in judo gi, black belt, wearing flower crown for wedding' },
  { name: 'Karate Kai', character_type: 'human', prompt: 'A young person in samurai armor with katana' },
  { name: 'Lacrosse Leo', character_type: 'human', prompt: 'A young boy wearing a construction worker outfit with hard hat' },
  { name: 'Marathon Maya', character_type: 'human', prompt: 'A young girl crossing finish line, wearing nurse scrubs and stethoscope' },
  { name: 'Ninja Nate', character_type: 'human', prompt: 'A young boy in full ninja warrior course, wearing a DJ outfit with headphones' },
  { name: 'Olympian Olivia', character_type: 'human', prompt: 'A young girl on medal podium, wearing a Broadway star costume' },
  { name: 'Pitcher Pablo', character_type: 'human', prompt: 'A young Latino boy wearing a matador outfit with cape' },
  { name: 'Quarterback Quinn', character_type: 'human', prompt: 'A young person wearing a fighter pilot jumpsuit with patches' },
  { name: 'Rower Rosa', character_type: 'human', prompt: 'A young girl pulling oars, wearing a mermaid costume' },
  { name: 'Skater Shane', character_type: 'human', prompt: 'A young boy on skateboard, wearing a graffiti artist outfit' },
  { name: 'Tennis Tara', character_type: 'human', prompt: 'A young girl swinging tennis racket, wearing a Greek goddess toga' },
  { name: 'Ultimate Uma', character_type: 'human', prompt: 'A young person catching frisbee, wearing a safari guide outfit' },
  { name: 'Volleyball Victor', character_type: 'human', prompt: 'A young boy spiking volleyball, wearing a lifeguard outfit' },
  { name: 'Wrestler Willow', character_type: 'human', prompt: 'A young girl in ready stance, wearing a detective outfit with magnifying glass' },
  { name: 'Xtreme Xavier', character_type: 'human', prompt: 'A young boy on BMX bike, wearing a mechanic jumpsuit with grease stains' },
  { name: 'Yogi Yolanda', character_type: 'human', prompt: 'A young girl in lotus pose, wearing a hippie tie-dye outfit' },
  { name: 'Zumba Zoe', character_type: 'human', prompt: 'A young girl dancing, wearing a carnival Rio costume with feathers' },
  { name: 'Balance Ben', character_type: 'human', prompt: 'A young boy on balance beam, wearing a circus ringmaster outfit' },
  { name: 'Cheerleader Chloe', character_type: 'human', prompt: 'A young girl mid-jump split, wearing an ice queen costume with sparkles' },
  { name: 'Dancer Dante', character_type: 'human', prompt: 'A young boy in hip-hop dance pose, wearing a royal prince outfit' },
  { name: 'Equestrian Emma', character_type: 'human', prompt: 'A young girl with helmet, wearing a polo player outfit' },
  { name: 'Fitness Finn', character_type: 'human', prompt: 'A young boy with resistance bands, wearing a superhero spandex suit' },
  { name: 'Golf Gabby', character_type: 'human', prompt: 'A young girl swinging golf club, wearing a preppy country club outfit' },
  { name: 'Hiker Henry', character_type: 'human', prompt: 'A young boy with hiking poles, wearing mountain climber gear with ropes' },
  { name: 'Inline Izzy', character_type: 'human', prompt: 'A young person on inline skates, wearing a roller disco 70s outfit' },
  { name: 'Jump Rope Jada', character_type: 'human', prompt: 'A young girl mid-jump rope, wearing a cheerful sunshine dress' },
  { name: 'Kickball Kelly', character_type: 'human', prompt: 'A young person kicking red playground ball, wearing a birthday party outfit' },
  { name: 'Lifeguard Logan', character_type: 'human', prompt: 'A young person in lifeguard uniform, wearing a beach volleyball outfit' },
  { name: 'Martial Max', character_type: 'human', prompt: 'A young boy practicing tai chi, wearing traditional Chinese silk outfit' },
  { name: 'Netball Nina', character_type: 'human', prompt: 'A young girl shooting netball, wearing a superhero costume with cape' },

  // ========== SUPERHEROES (50) ==========
  { name: 'Captain Flex', character_type: 'superhero', prompt: 'An adult superhero with a cape and star emblem, athletic build, wearing a formal military dress uniform' },
  { name: 'Thunder Strike', character_type: 'superhero', prompt: 'A young adult hero with lightning bolt patterns, electric aura, wearing a wedding groom tuxedo' },
  { name: 'Iron Guardian', character_type: 'superhero', prompt: 'An armored hero with sleek tech suit, glowing chest piece, wearing Victorian steampunk outfit' },
  { name: 'Blaze Runner', character_type: 'superhero', prompt: 'A speedster hero with flame trail effects, wearing a race car driver suit' },
  { name: 'Cosmic Star', character_type: 'superhero', prompt: 'A cosmic hero with starfield patterns, floating slightly, wearing a sparkly ballroom dance dress' },
  { name: 'Shadow Swift', character_type: 'superhero', prompt: 'A ninja-style hero in dark outfit, athletic and agile, wearing a secret agent suit' },
  { name: 'Frost Shield', character_type: 'superhero', prompt: 'An ice-powered hero with cool blue costume, ice crystal effects, wearing ski instructor gear' },
  { name: 'Terra Titan', character_type: 'superhero', prompt: 'A strength hero with earth tones, rocky accents, wearing a park ranger uniform' },
  { name: 'Wind Warrior', character_type: 'superhero', prompt: 'A flying hero with wing-like cape, wind swirl effects, wearing a hang glider pilot outfit' },
  { name: 'Mystic Mage', character_type: 'superhero', prompt: 'A magical hero with glowing staff, mystical runes, wearing a Renaissance wizard robe' },
  { name: 'Aqua Ace', character_type: 'superhero', prompt: 'An ocean-powered hero with scales, trident, wearing a deep sea diver vintage suit' },
  { name: 'Solar Surge', character_type: 'superhero', prompt: 'A sun-powered hero with golden costume, radiating light, wearing a beach lifeguard outfit' },
  { name: 'Night Blade', character_type: 'superhero', prompt: 'A stealthy hero in midnight blue, twin daggers, wearing a jazz club singer outfit' },
  { name: 'Volt Vanguard', character_type: 'superhero', prompt: 'An electric hero with crackling energy, wearing an electrician work gear' },
  { name: 'Stone Sentinel', character_type: 'superhero', prompt: 'A rock-armored hero with granite skin, wearing a sculptor artist smock' },
  { name: 'Phoenix Fury', character_type: 'superhero', prompt: 'A fire-winged hero rising from flames, wearing a firebreather circus costume' },
  { name: 'Crystal Champion', character_type: 'superhero', prompt: 'A gem-powered hero with crystalline armor, wearing a jeweler magnifying glass outfit' },
  { name: 'Gravity Guardian', character_type: 'superhero', prompt: 'A hero controlling gravity, floating debris, wearing an astronaut space suit' },
  { name: 'Jungle Justice', character_type: 'superhero', prompt: 'A nature hero with vine patterns, wearing a zookeeper safari outfit' },
  { name: 'Metal Master', character_type: 'superhero', prompt: 'A hero controlling metal, chrome costume, wearing a blacksmith apron' },
  { name: 'Psychic Protector', character_type: 'superhero', prompt: 'A telepathic hero with glowing temples, wearing a fortune teller outfit with turban' },
  { name: 'Quantum Quest', character_type: 'superhero', prompt: 'A reality-warping hero with shifting costume, wearing a quantum physicist lab coat' },
  { name: 'Radiant Ray', character_type: 'superhero', prompt: 'A light-projecting hero with luminous costume, wearing a lighthouse keeper outfit' },
  { name: 'Sonic Siren', character_type: 'superhero', prompt: 'A sound-wave hero with audio equipment aesthetic, wearing a rock concert outfit' },
  { name: 'Tech Titan', character_type: 'superhero', prompt: 'A gadget hero with holographic displays, wearing a Silicon Valley tech startup hoodie' },
  { name: 'Ultra Unity', character_type: 'superhero', prompt: 'A team-leader hero with linked emblems, wearing an Olympic team tracksuit' },
  { name: 'Vortex Victor', character_type: 'superhero', prompt: 'A tornado-creating hero with spiral costume, wearing a storm chaser outfit' },
  { name: 'Wave Warden', character_type: 'superhero', prompt: 'An ocean-surf hero riding wave, wearing a pro surfer wetsuit' },
  { name: 'Xenon Xtreme', character_type: 'superhero', prompt: 'An alien hero with otherworldly features, wearing a sci-fi space explorer suit' },
  { name: 'Yonder Youth', character_type: 'superhero', prompt: 'A young sidekick hero, eager expression, wearing a delivery driver uniform' },
  { name: 'Zephyr Zero', character_type: 'superhero', prompt: 'An air-current hero with invisible force effects, wearing a paraglider pilot outfit' },
  { name: 'Atomic Avenger', character_type: 'superhero', prompt: 'A nuclear-powered hero with atomic symbol, wearing a nuclear plant worker hazmat suit' },
  { name: 'Blitz Bolt', character_type: 'superhero', prompt: 'A super-speed hero with blur effects, wearing a mail carrier running outfit' },
  { name: 'Comet Crusader', character_type: 'superhero', prompt: 'A space-traveling hero with meteor trail, wearing a starship captain uniform' },
  { name: 'Diamond Defender', character_type: 'superhero', prompt: 'An unbreakable hero with diamond-hard skin, wearing a fancy jewelry store owner suit' },
  { name: 'Echo Elite', character_type: 'superhero', prompt: 'A sound-duplicating hero with multiple echo images, wearing a recording studio producer outfit' },
  { name: 'Force Field', character_type: 'superhero', prompt: 'A barrier-creating hero with visible shield dome, wearing a bodyguard black suit' },
  { name: 'Geo Giant', character_type: 'superhero', prompt: 'A size-changing hero at large scale, wearing a geologist field researcher outfit' },
  { name: 'Hyper Hawk', character_type: 'superhero', prompt: 'A winged hero with feathered armor, wearing a falconer medieval outfit' },
  { name: 'Illusion Idol', character_type: 'superhero', prompt: 'A reality-bending hero with shifting appearances, wearing a stage magician tuxedo' },
  { name: 'Jet Justice', character_type: 'superhero', prompt: 'A rocket-powered hero with jet boots, wearing a test pilot flight suit' },
  { name: 'Kinetic Kid', character_type: 'superhero', prompt: 'A young hero absorbing energy, wearing a personal trainer athletic outfit' },
  { name: 'Laser Legend', character_type: 'superhero', prompt: 'A beam-shooting hero with visor, wearing an optometrist white coat' },
  { name: 'Magnet Maven', character_type: 'superhero', prompt: 'A magnetic hero with floating metal debris, wearing a junkyard mechanic outfit' },
  { name: 'Nova Knight', character_type: 'superhero', prompt: 'A star-born hero with armor, wearing a medieval tournament jousting armor' },
  { name: 'Omega Oracle', character_type: 'superhero', prompt: 'A future-seeing hero with all-seeing eyes, wearing a tarot card reader bohemian outfit' },
  { name: 'Plasma Paladin', character_type: 'superhero', prompt: 'An energy-sword hero with plasma blade, wearing a fencing tournament uniform' },
  { name: 'Quake Queen', character_type: 'superhero', prompt: 'An earthquake-causing hero with cracked ground effects, wearing a geologist hard hat outfit' },
  { name: 'Rocket Ranger', character_type: 'superhero', prompt: 'A jetpack hero with flight gear, wearing a retro 1950s space ranger costume' },
  { name: 'Storm Sage', character_type: 'superhero', prompt: 'A weather-controlling hero with lightning and clouds, wearing a TV weather forecaster suit' },

  // ========== MONSTERS (100) - Friendly Monsters Inc. style ==========
  { name: 'Sulley Stretch', character_type: 'monster', prompt: 'A large furry blue monster with purple spots, big friendly smile, wearing a headband and shorts' },
  { name: 'Fuzzy Phil', character_type: 'monster', prompt: 'A round orange furry monster with multiple eyes, cheerful expression, wearing a tiny tank top' },
  { name: 'Blobby Bob', character_type: 'monster', prompt: 'A green gelatinous blob monster with one big eye, happy smile, wearing sweatbands on tentacles' },
  { name: 'Spike Sprint', character_type: 'monster', prompt: 'A purple monster with friendly spikes down back, four arms, wearing sneakers on all feet' },
  { name: 'Googly Gary', character_type: 'monster', prompt: 'A tall skinny green monster with five googly eyes, long arms, wearing a basketball jersey' },
  { name: 'Fluff Flex', character_type: 'monster', prompt: 'A pink cotton candy-like monster, fluffy all over, wearing tiny gloves' },
  { name: 'Chomper Charlie', character_type: 'monster', prompt: 'A round blue monster with huge friendly teeth, wearing a whistle and cap' },
  { name: 'Tentacle Tim', character_type: 'monster', prompt: 'A yellow monster with eight tentacle arms, each holding different equipment, cheerful' },
  { name: 'Scales Sally', character_type: 'monster', prompt: 'A turquoise scaled monster with big doe eyes, wearing comfortable casual clothes' },
  { name: 'Horns Henry', character_type: 'monster', prompt: 'A red monster with two curved horns, kind expression, wearing a belt' },
  { name: 'Glob Gordon', character_type: 'monster', prompt: 'A translucent gooey monster in shades of purple, wearing visible clothes inside body' },
  { name: 'Fang Fiona', character_type: 'monster', prompt: 'A teal monster with cute underbite fangs, long ears, wearing a dance leotard' },
  { name: 'Bumpy Boris', character_type: 'monster', prompt: 'A lumpy orange monster covered in friendly bumps, wearing hiking boots' },
  { name: 'Wings Wendy', character_type: 'monster', prompt: 'A small purple monster with bat-like wings, wearing a cute outfit, mid-flutter' },
  { name: 'Patch Pete', character_type: 'monster', prompt: 'A patchwork monster with different colored fur patches, wearing mix-matched clothes' },
  { name: 'Snaggle Sam', character_type: 'monster', prompt: 'A green monster with one snaggletooth, three eyes, wearing a karate gi' },
  { name: 'Twirl Tina', character_type: 'monster', prompt: 'A spiral-patterned pink and purple monster, wearing a pretty dress' },
  { name: 'Bounce Barry', character_type: 'monster', prompt: 'A round bouncy yellow monster like a ball, wearing springy shoes, mid-bounce' },
  { name: 'Noodle Nancy', character_type: 'monster', prompt: 'A long noodle-shaped blue monster, very flexible, in pretzel pose' },
  { name: 'Grin Greg', character_type: 'monster', prompt: 'A wide monster thats mostly a huge friendly grin, tiny body, wearing a bib' },
  { name: 'Dot Diana', character_type: 'monster', prompt: 'A lavender monster covered in polka dots, each dot a different color, wearing a sporty outfit' },
  { name: 'Claws Carlos', character_type: 'monster', prompt: 'A friendly monster with oversized fuzzy claws, wearing boxing gloves over claws' },
  { name: 'Stripe Stella', character_type: 'monster', prompt: 'A tiger-striped monster in orange and pink, wearing matching stripes' },
  { name: 'Pudge Paul', character_type: 'monster', prompt: 'A chubby lovable green monster, determined expression, wearing casual gear' },
  { name: 'Float Felicia', character_type: 'monster', prompt: 'A ghost-like translucent monster who floats, wearing ethereal attire' },
  { name: 'Rock Randy', character_type: 'monster', prompt: 'A monster made of friendly rounded rocks, wearing a climbing harness' },
  { name: 'Shimmer Shelly', character_type: 'monster', prompt: 'A sparkly iridescent monster that shimmers, wearing a glittery costume' },
  { name: 'Trunk Trevor', character_type: 'monster', prompt: 'A monster with a long trunk-like nose, using it to lift things, cheerful' },
  { name: 'Ear Eddie', character_type: 'monster', prompt: 'A small monster with enormous floppy ears, using them as wings, wearing pilot goggles' },
  { name: 'Curl Cathy', character_type: 'monster', prompt: 'A monster with curly tentacle hair, each curl a different color, wearing a headband' },
  { name: 'Glow Gina', character_type: 'monster', prompt: 'A bioluminescent monster that glows softly, wearing reflective gear' },
  { name: 'Munch Mike', character_type: 'monster', prompt: 'A one-eyed green monster with big smile, compact body, wearing an MU sweatshirt' },
  { name: 'Jelly James', character_type: 'monster', prompt: 'A jellyfish-like monster with two stubby legs, translucent blue body, wearing swim goggles' },
  { name: 'Moss Morgan', character_type: 'monster', prompt: 'A mossy green bipedal nature monster, leaves growing from fur, wearing eco-friendly clothes' },
  { name: 'Zigzag Zara', character_type: 'monster', prompt: 'A bipedal monster with zigzag patterned body, electric personality, two arms two legs, wearing sprint gear' },
  { name: 'Bubble Benny', character_type: 'monster', prompt: 'A bubble-blowing bipedal monster with soap-like skin, cheerful, wearing swim trunks' },
  { name: 'Crystal Claire', character_type: 'monster', prompt: 'A crystalline bipedal monster with gem-like protrusions, two arms two legs, wearing a sparkly outfit' },
  { name: 'Shadow Shane', character_type: 'monster', prompt: 'A friendly shadow monster standing upright, dark purple, two arms two legs, wearing glow-in-dark stripes' },
  { name: 'Squish Sophia', character_type: 'monster', prompt: 'A squishy stress-ball-like pink bipedal monster, very huggable, wearing comfy clothes' },
  { name: 'Antler Andy', character_type: 'monster', prompt: 'A furry bipedal monster with majestic antlers, forest green, two arms two legs, wearing hiking gear' },
  { name: 'Twinkle Tina', character_type: 'monster', prompt: 'A sparkly star-shaped bipedal monster, glowing yellow, two arms two stubby legs, wearing a tutu' },
  { name: 'Crest Calvin', character_type: 'monster', prompt: 'A dinosaur-like bipedal monster with colorful head crest, two arms two legs, wearing a fun outfit' },
  { name: 'Vapor Vicky', character_type: 'monster', prompt: 'A misty cloud-like monster, soft and fluffy, wearing a cozy sweater' },
  { name: 'Twist Tony', character_type: 'monster', prompt: 'A pretzel-shaped flexible monster, stretchy, wearing a contortionist outfit' },
  { name: 'Marble Mary', character_type: 'monster', prompt: 'A smooth marble-textured monster with swirl patterns, wearing elegant dancewear' },
  { name: 'Fuzz Felix', character_type: 'monster', prompt: 'An extremely fuzzy monster, cant see eyes through fur, wearing a visible headband' },
  { name: 'Snore Stanley', character_type: 'monster', prompt: 'A sleepy-looking monster with droopy eyes, determined to stay awake' },
  { name: 'Giggle Grace', character_type: 'monster', prompt: 'A monster who cant stop giggling, pink cheeks, wearing a cheerleader outfit' },
  { name: 'Warts Walter', character_type: 'monster', prompt: 'A warty toad-like monster, friendly bumps, wearing swim trunks' },
  { name: 'Swirl Susie', character_type: 'monster', prompt: 'A hypnotic swirl-patterned monster in blues and greens, wearing spiral-design leggings' },
  // ========== MORE MONSTERS (50 additional) ==========
  { name: 'Confetti Carl', character_type: 'monster', prompt: 'A monster made of colorful confetti pieces, constantly shedding sparkles, wearing party-themed clothes' },
  { name: 'Drool Drew', character_type: 'monster', prompt: 'A happy slobbery monster with a long tongue, wearing a bib, cheerful dripping' },
  { name: 'Electricity Ellie', character_type: 'monster', prompt: 'A crackling electric monster with lightning bolt antennae, wearing rubber-soled sneakers' },
  { name: 'Feather Freddy', character_type: 'monster', prompt: 'A fluffy feathered monster with peacock-like plumes, wearing colorful leg warmers' },
  { name: 'Gummy Gus', character_type: 'monster', prompt: 'A gummy bear-shaped translucent monster in bright red, stretchy, wearing candy-themed shorts' },
  { name: 'Hiccup Holly', character_type: 'monster', prompt: 'A small monster who hiccups bubbles, purple with pink spots, wearing a bubble-proof suit' },
  { name: 'Icicle Ivan', character_type: 'monster', prompt: 'A frosty ice monster with icicle hair, light blue, wearing thermal gear' },
  { name: 'Jiggle Jasper', character_type: 'monster', prompt: 'A jiggly pudding-like monster, wobbles when moving, wearing a stabilizing belt' },
  { name: 'Knot Kenny', character_type: 'monster', prompt: 'A rope-like monster tied in friendly knots, flexible, wearing stretchy clothes' },
  { name: 'Lava Lily', character_type: 'monster', prompt: 'A warm lava monster with glowing orange cracks, friendly heat, wearing heat-resistant clothes' },
  { name: 'Mist Marcus', character_type: 'monster', prompt: 'A mysterious mist monster, barely visible, wearing reflective stripes to be seen' },
  { name: 'Neon Nelly', character_type: 'monster', prompt: 'A bright neon-colored monster that glows in the dark, wearing UV-reactive clothes' },
  { name: 'Origami Ollie', character_type: 'monster', prompt: 'A paper-folded monster in origami style, angular, wearing creased clothes' },
  { name: 'Prickle Penny', character_type: 'monster', prompt: 'A friendly cactus-like monster with soft rubbery spikes, wearing desert-themed outfit' },
  { name: 'Quiver Quinn', character_type: 'monster', prompt: 'A nervous but determined monster, always shaking, wearing comfort-fit clothes' },
  { name: 'Ripple Riley', character_type: 'monster', prompt: 'A water-ripple monster with concentric ring patterns, wearing aquatic gear' },
  { name: 'Spaghetti Spencer', character_type: 'monster', prompt: 'A noodle-like tangled monster with meatball eyes, wearing a chef-themed apron' },
  { name: 'Thunder Theo', character_type: 'monster', prompt: 'A rumbling cloud monster that makes thunder sounds when moving, wearing storm-cloud gray clothes' },
  { name: 'Umbrella Uma', character_type: 'monster', prompt: 'A mushroom-cap headed monster like an umbrella, wearing rain-resistant clothes' },
  { name: 'Velvet Victor', character_type: 'monster', prompt: 'A soft velvet-textured monster in royal purple, luxurious, wearing silk clothes' },
  { name: 'Whisker Wanda', character_type: 'monster', prompt: 'A monster with enormously long whiskers, catlike, wearing a whisker-friendly headband' },
  { name: 'Xray Xena', character_type: 'monster', prompt: 'A translucent monster with visible skeleton, friendly bones, wearing see-through clothes' },
  { name: 'Yawn Yolanda', character_type: 'monster', prompt: 'A sleepy monster with a permanent yawn, cozy, wearing pajama-style clothes' },
  { name: 'Zipper Zack', character_type: 'monster', prompt: 'A monster with a zipper down the middle, can open to reveal surprise, wearing a zippered tracksuit' },
  { name: 'Accordion Al', character_type: 'monster', prompt: 'A squeezable accordion-shaped monster, musical, wearing stretchy bellows-patterned outfit' },
  { name: 'Blotch Bella', character_type: 'monster', prompt: 'A tie-dye patterned monster with ink blotches, colorful, wearing matching tie-dye clothes' },
  { name: 'Crackle Cody', character_type: 'monster', prompt: 'A monster made of crackled eggshell texture, delicate but strong, wearing protective pads' },
  { name: 'Dizzy Dana', character_type: 'monster', prompt: 'A spiral-eyed monster who loves spinning, wearing anti-dizziness headband and shorts' },
  { name: 'Echo Evan', character_type: 'monster', prompt: 'A sound-wave monster with rippling body, repeats noises, wearing sound-dampening clothes' },
  { name: 'Fizz Frankie', character_type: 'monster', prompt: 'A carbonated soda-like monster, constantly bubbling, wearing pop-top themed outfit' },
  { name: 'Gradient Greta', character_type: 'monster', prompt: 'A smoothly gradient-colored monster, sunset orange to pink, wearing ombre clothes' },
  { name: 'Haze Harriet', character_type: 'monster', prompt: 'A foggy morning haze monster, mysterious but friendly, wearing misty gray clothes' },
  { name: 'Ink Igor', character_type: 'monster', prompt: 'An ink-dripping octopus-like monster, leaving trails, wearing waterproof clothes' },
  { name: 'Jolt Janet', character_type: 'monster', prompt: 'An energetic static electricity monster, hair standing up, wearing rubber-insulated clothes' },
  { name: 'Kaleidoscope Keith', character_type: 'monster', prompt: 'A constantly color-shifting monster like a kaleidoscope, wearing chromatic clothes' },
  { name: 'Lantern Larry', character_type: 'monster', prompt: 'A glowing paper lantern monster, warm light inside, wearing light-up shoes' },
  { name: 'Magma Milo', character_type: 'monster', prompt: 'A volcanic rock monster with magma veins, warm glow, wearing fireproof shorts' },
  { name: 'Nimbus Nora', character_type: 'monster', prompt: 'A puffy rain cloud monster with tiny lightning, wearing weather-resistant jacket' },
  { name: 'Opal Oscar', character_type: 'monster', prompt: 'An opalescent gemstone monster, shimmering colors, wearing crystal-themed clothes' },
  { name: 'Puzzle Patty', character_type: 'monster', prompt: 'A jigsaw puzzle monster with pieces that shift, wearing interlocking-pattern leggings' },
  { name: 'Quicksand Quincy', character_type: 'monster', prompt: 'A sandy shifty monster, constantly flowing, wearing desert-camo clothes' },
  { name: 'Rustle Rosie', character_type: 'monster', prompt: 'A leaf-pile monster that rustles when moving, autumn colors, wearing forest clothes' },
  { name: 'Slime Sammy', character_type: 'monster', prompt: 'A friendly green slime monster, gooey and stretchy, wearing waterproof clothes' },
  { name: 'Tangle Terri', character_type: 'monster', prompt: 'A yarn-ball monster with tangled threads, soft, wearing knitted clothes' },
  { name: 'Urchin Ursula', character_type: 'monster', prompt: 'A sea urchin-inspired monster with soft spine tips, wearing beach volleyball outfit' },
  { name: 'Vine Vincent', character_type: 'monster', prompt: 'A plant-vine monster with flowers blooming, green and growing, wearing botanical clothes' },
  { name: 'Whirlpool Wilma', character_type: 'monster', prompt: 'A spinning water vortex monster, always twirling, wearing spiral-patterned swimsuit' },
  { name: 'Xerox Xander', character_type: 'monster', prompt: 'A copy-machine monster that duplicates itself, wearing matching twin outfits' },
  { name: 'Yeti Yvonne', character_type: 'monster', prompt: 'A friendly white yeti monster, big and fluffy, wearing snow gear and goggles' },
  { name: 'Zest Zelda', character_type: 'monster', prompt: 'A citrus-inspired monster with orange peel texture, zesty, wearing fruit-themed clothes' },
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
  { value: "icons", label: "Iconic Characters", emoji: "⭐" },
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
  sex: "" as string,
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
  const [randomizeCategoryFilter, setRandomizeCategoryFilter] = useState<'all' | 'animal' | 'human' | 'superhero' | 'monster' | 'icons'>('all');

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
        character_type: data.character_type || "human",
        sex: data.sex && data.sex !== "not_specified" ? data.sex : null,
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
      sex: avatar.sex || "",
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
      'monster': 'monsters',
    };
    
    // If user selected a specific category filter (not "all"), use that for the display category
    const displayCategory = randomizeCategoryFilter !== 'all' 
      ? categoryMap[randomizeCategoryFilter] || 'humans'
      : categoryMap[randomTemplate.character_type] || 'humans';
    
    setFormData(prev => ({
      ...prev,
      name: randomTemplate.name,
      description: `A ${randomTemplate.character_type === 'animal' ? 'friendly animal' : randomTemplate.character_type === 'superhero' ? 'heroic' : randomTemplate.character_type === 'monster' ? 'friendly monster' : 'friendly'} character who loves fitness and can do any sport!`,
      character_prompt: randomTemplate.prompt + demographicSuffix,
      character_type: randomTemplate.character_type,
      category: displayCategory,
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
    // Use the avatar's actual character_type from the database, not inferred type
    // This fixes the bug where monsters were being generated as humans from the list view
    generateImageMutation.mutate({ 
      id: avatar.id, 
      name: avatar.name, 
      character_prompt: avatar.character_prompt, 
      character_type: avatar.character_type || 'human' 
    });
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
        category: formData.category || "free",
        character_type: formData.character_type || "human",
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
                  onValueChange={(val) => setRandomizeCategoryFilter(val as 'all' | 'animal' | 'human' | 'superhero' | 'monster' | 'icons')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🎲 All Types</SelectItem>
                    <SelectItem value="icons">⭐ Iconic Characters</SelectItem>
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
                
                {/* Sex Selector for anatomical consistency */}
                <div className="space-y-2">
                  <Label>Sex (for AI anatomical consistency)</Label>
                  <Select
                    value={formData.sex}
                    onValueChange={(value) => setFormData({ ...formData, sex: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_specified">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="androgynous">Androgynous</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Ensures AI-generated images maintain consistent anatomical traits</p>
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
              <TableHead className="w-12 text-center" title="Sex (Male/Female/Androgynous/Null)">Sex</TableHead>
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
                <TableCell className="text-center">
                  <Badge 
                    variant={avatar.sex ? "default" : "outline"} 
                    className={`text-xs font-bold ${
                      avatar.sex === 'male' ? 'bg-blue-500 hover:bg-blue-600' :
                      avatar.sex === 'female' ? 'bg-pink-500 hover:bg-pink-600' :
                      avatar.sex === 'androgynous' ? 'bg-purple-500 hover:bg-purple-600' :
                      'text-muted-foreground'
                    }`}
                    title={avatar.sex ? avatar.sex.charAt(0).toUpperCase() + avatar.sex.slice(1) : 'Not specified'}
                  >
                    {avatar.sex === 'male' ? 'M' :
                     avatar.sex === 'female' ? 'F' :
                     avatar.sex === 'androgynous' ? 'A' : 'N'}
                  </Badge>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
