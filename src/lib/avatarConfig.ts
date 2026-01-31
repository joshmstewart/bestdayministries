// Shared avatar configuration utility for the profile avatar system
// These are the composite avatars used for user profiles

import composite1 from "@/assets/avatars/composite-1.png";
import composite2 from "@/assets/avatars/composite-2.png";
import composite3 from "@/assets/avatars/composite-3.png";
import composite4 from "@/assets/avatars/composite-4.png";
import composite5 from "@/assets/avatars/composite-5.png";
import composite6 from "@/assets/avatars/composite-6.png";
import composite7 from "@/assets/avatars/composite-7.png";
import composite8 from "@/assets/avatars/composite-8.png";
import composite9 from "@/assets/avatars/composite-9.png";
import composite10 from "@/assets/avatars/composite-10.png";
import composite11 from "@/assets/avatars/composite-11.png";
import composite12 from "@/assets/avatars/composite-12.png";
import monsterPirateStarfish from "@/assets/avatars/monster-pirate-starfish.png";
import monsterPurpleThreeEyes from "@/assets/avatars/monster-purple-three-eyes.png";

export interface AvatarConfig {
  image: string | null;
  position: { x: number; y: number } | null;
  isStorageAvatar?: boolean;
  name: string;
}

// Avatar names organized by number
export const AVATAR_NAMES: Record<number, string> = {
  // Composite 1 (1-4) - Humans
  1: "Alex",
  2: "Jordan",
  3: "Taylor",
  4: "Morgan",
  // Composite 2 (5-8) - Humans
  5: "Casey",
  6: "Riley",
  7: "Avery",
  8: "Quinn",
  // Composite 3 (9-12) - Animals
  9: "Whiskers",
  10: "Patches",
  11: "Fang",
  12: "Spike",
  // Composite 4 (13-16) - Humans
  13: "Jamie",
  14: "Drew",
  15: "Skyler",
  16: "Emery",
  // Composite 5 (17-20) - Animals
  17: "Fluffy",
  18: "Buddy",
  19: "Ziggy",
  20: "Pepper",
  // Composite 6 (21-24) - Animals/Shapes
  21: "Cubey",
  22: "Bubbles",
  23: "Sunny",
  24: "Twinkle",
  // Composite 7 (25-28) - Humans
  25: "Blake",
  26: "Hayden",
  27: "Sage",
  28: "Rowan",
  // Composite 8 (29-32) - Humans
  29: "Phoenix",
  30: "River",
  31: "Finley",
  32: "Dakota",
  // Composite 9 (33-36) - Animals
  33: "Coco",
  34: "Nutmeg",
  35: "Peanut",
  36: "Cookie",
  // Composite 10 (37-40) - Humans
  37: "Cameron",
  38: "Reese",
  39: "Ellis",
  40: "Lennox",
  // Composite 11 (41-44) - Monsters
  41: "Gloopy",
  42: "Snork",
  43: "Zorp",
  44: "Blip",
  // Composite 12 (45-48) - Monsters
  45: "Fizz",
  46: "Glimmer",
  47: "Sprocket",
  48: "Nebula",
  // Individual monsters
  49: "Captain Starfish",
  50: "Tri-Eye",
};

const GRID_POSITIONS = [
  { x: 0, y: 0 },      // top-left
  { x: 100, y: 0 },    // top-right
  { x: 0, y: 100 },    // bottom-left
  { x: 100, y: 100 },  // bottom-right
];

const COMPOSITE_IMAGES = [
  composite1,
  composite2,
  composite3,
  composite4,
  composite5,
  composite6,
  composite7,
  composite8,
  composite9,
  composite10,
  composite11,
  composite12,
];

export const getAvatarConfig = (avatarNumber: number): AvatarConfig | null => {
  const name = AVATAR_NAMES[avatarNumber] || `Avatar ${avatarNumber}`;
  
  // Check if it's a dynamically uploaded avatar (49+)
  if (avatarNumber >= 49) {
    // Special individual monsters
    if (avatarNumber === 49) {
      return { image: monsterPirateStarfish, position: null, name };
    }
    if (avatarNumber === 50) {
      return { image: monsterPurpleThreeEyes, position: null, name };
    }
    // Other uploaded avatars
    return { image: null, position: null, isStorageAvatar: true, name };
  }
  
  // Calculate which composite image and position
  if (avatarNumber >= 1 && avatarNumber <= 48) {
    const compositeIndex = Math.floor((avatarNumber - 1) / 4);
    const positionIndex = (avatarNumber - 1) % 4;
    
    if (compositeIndex < COMPOSITE_IMAGES.length) {
      return {
        image: COMPOSITE_IMAGES[compositeIndex],
        position: GRID_POSITIONS[positionIndex],
        name,
      };
    }
  }
  
  return null;
};

export const getAvatarName = (avatarNumber: number): string => {
  return AVATAR_NAMES[avatarNumber] || `Avatar ${avatarNumber}`;
};
