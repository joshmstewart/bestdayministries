// 20 very distinct emojis for friend codes
export const FRIEND_CODE_EMOJIS = [
  { emoji: "🌟", name: "Star" },
  { emoji: "🌈", name: "Rainbow" },
  { emoji: "🔥", name: "Fire" },
  { emoji: "🌊", name: "Wave" },
  { emoji: "🌸", name: "Cherry Blossom" },
  { emoji: "🍕", name: "Pizza" },
  { emoji: "🎸", name: "Guitar" },
  { emoji: "🚀", name: "Rocket" },
  { emoji: "🏆", name: "Trophy" },
  { emoji: "⚡", name: "Lightning" },
  { emoji: "🎨", name: "Palette" },
  { emoji: "🎭", name: "Theater Masks" },
  { emoji: "🎪", name: "Circus Tent" },
  { emoji: "🏰", name: "Castle" },
  { emoji: "🌵", name: "Cactus" },
  { emoji: "🦋", name: "Butterfly" },
  { emoji: "🐉", name: "Dragon" },
  { emoji: "🎯", name: "Target" },
  { emoji: "🎺", name: "Trumpet" },
  { emoji: "🏖️", name: "Beach" },
] as const;

export const getRandomEmoji = () => {
  return FRIEND_CODE_EMOJIS[Math.floor(Math.random() * FRIEND_CODE_EMOJIS.length)].emoji;
};

export const getRandomNumber = () => {
  return Math.floor(Math.random() * 20) + 1;
};

export const formatFriendCode = (emoji: string | null, number: number | null) => {
  if (!emoji || !number) return null;
  return `${emoji}${number.toString().padStart(2, '0')}`;
};
