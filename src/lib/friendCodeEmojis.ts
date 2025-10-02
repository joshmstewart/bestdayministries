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

export const generateRandomFriendCode = () => {
  // Generate 4 random emojis (duplicates allowed) - 160,000 possible combinations
  const emoji1 = getRandomEmoji();
  const emoji2 = getRandomEmoji();
  const emoji3 = getRandomEmoji();
  const emoji4 = getRandomEmoji();
  return `${emoji1}${emoji2}${emoji3}${emoji4}`;
};

export const formatFriendCode = (friendCode: string | null) => {
  return friendCode || null;
};
