/**
 * Avatar utility for managing user avatars
 * Each avatar is represented by a number (1-34) corresponding to the design system
 */

export const AVAILABLE_AVATARS = Array.from({ length: 50 }, (_, i) => i + 1);

export const getAvatarDisplay = (avatarNumber: number | null | undefined) => {
  if (!avatarNumber || avatarNumber < 1 || avatarNumber > 50) {
    // Default avatar
    return {
      emoji: "😊",
      bgColor: "bg-gradient-to-br from-primary/20 to-accent/20",
      textColor: "text-foreground"
    };
  }

  // Assign unique emojis/icons for different avatar numbers
  const avatarMap: { [key: number]: { emoji: string; bgColor: string; textColor: string } } = {
    1: { emoji: "👦", bgColor: "bg-gradient-to-br from-orange-200 to-red-200", textColor: "text-orange-900" },
    2: { emoji: "👧", bgColor: "bg-gradient-to-br from-pink-200 to-rose-200", textColor: "text-pink-900" },
    3: { emoji: "🧒", bgColor: "bg-gradient-to-br from-blue-200 to-cyan-200", textColor: "text-blue-900" },
    4: { emoji: "👶", bgColor: "bg-gradient-to-br from-yellow-200 to-amber-200", textColor: "text-yellow-900" },
    5: { emoji: "👩", bgColor: "bg-gradient-to-br from-orange-200 to-orange-300", textColor: "text-orange-900" },
    6: { emoji: "🐻", bgColor: "bg-gradient-to-br from-amber-200 to-brown-200", textColor: "text-amber-900" },
    7: { emoji: "👽", bgColor: "bg-gradient-to-br from-green-200 to-emerald-200", textColor: "text-green-900" },
    8: { emoji: "🦋", bgColor: "bg-gradient-to-br from-pink-200 to-purple-200", textColor: "text-pink-900" },
    9: { emoji: "🐥", bgColor: "bg-gradient-to-br from-yellow-200 to-yellow-300", textColor: "text-yellow-900" },
    10: { emoji: "👨", bgColor: "bg-gradient-to-br from-orange-200 to-amber-200", textColor: "text-orange-900" },
    11: { emoji: "👹", bgColor: "bg-gradient-to-br from-orange-300 to-red-300", textColor: "text-orange-900" },
    12: { emoji: "👻", bgColor: "bg-gradient-to-br from-gray-100 to-gray-200", textColor: "text-gray-700" },
    13: { emoji: "🐘", bgColor: "bg-gradient-to-br from-slate-300 to-gray-300", textColor: "text-slate-700" },
    14: { emoji: "🎾", bgColor: "bg-gradient-to-br from-purple-200 to-pink-200", textColor: "text-purple-900" },
    15: { emoji: "🦉", bgColor: "bg-gradient-to-br from-amber-300 to-orange-300", textColor: "text-amber-900" },
    16: { emoji: "🌸", bgColor: "bg-gradient-to-br from-pink-200 to-pink-300", textColor: "text-pink-900" },
    17: { emoji: "🧱", bgColor: "bg-gradient-to-br from-amber-200 to-orange-200", textColor: "text-amber-900" },
    18: { emoji: "🧶", bgColor: "bg-gradient-to-br from-blue-300 to-indigo-300", textColor: "text-blue-900" },
    19: { emoji: "🐱", bgColor: "bg-gradient-to-br from-gray-300 to-slate-300", textColor: "text-gray-700" },
    20: { emoji: "🐤", bgColor: "bg-gradient-to-br from-yellow-300 to-amber-300", textColor: "text-yellow-900" },
    21: { emoji: "🐰", bgColor: "bg-gradient-to-br from-gray-100 to-slate-200", textColor: "text-gray-700" },
    22: { emoji: "🟢", bgColor: "bg-gradient-to-br from-green-300 to-emerald-300", textColor: "text-green-900" },
    23: { emoji: "👾", bgColor: "bg-gradient-to-br from-purple-300 to-violet-300", textColor: "text-purple-900" },
    24: { emoji: "☀️", bgColor: "bg-gradient-to-br from-yellow-300 to-orange-300", textColor: "text-yellow-900" },
    25: { emoji: "☁️", bgColor: "bg-gradient-to-br from-blue-100 to-cyan-100", textColor: "text-blue-700" },
    26: { emoji: "❤️", bgColor: "bg-gradient-to-br from-red-200 to-pink-200", textColor: "text-red-900" },
    27: { emoji: "⭐", bgColor: "bg-gradient-to-br from-yellow-200 to-orange-200", textColor: "text-yellow-900" },
    28: { emoji: "🧑", bgColor: "bg-gradient-to-br from-green-200 to-teal-200", textColor: "text-green-900" },
    29: { emoji: "👧🏾", bgColor: "bg-gradient-to-br from-orange-300 to-pink-300", textColor: "text-orange-900" },
    30: { emoji: "👶🏾", bgColor: "bg-gradient-to-br from-orange-300 to-amber-300", textColor: "text-orange-900" },
    31: { emoji: "🐘", bgColor: "bg-gradient-to-br from-blue-300 to-indigo-300", textColor: "text-blue-900" },
    32: { emoji: "👨🏻‍🦰", bgColor: "bg-gradient-to-br from-green-200 to-lime-200", textColor: "text-green-900" },
    33: { emoji: "🤖", bgColor: "bg-gradient-to-br from-green-300 to-lime-300", textColor: "text-green-900" },
    34: { emoji: "😈", bgColor: "bg-gradient-to-br from-blue-300 to-purple-300", textColor: "text-blue-900" },
    49: { emoji: "🌟", bgColor: "bg-gradient-to-br from-orange-300 to-red-300", textColor: "text-orange-900" },
    50: { emoji: "👾", bgColor: "bg-gradient-to-br from-purple-300 to-violet-400", textColor: "text-purple-900" },
  };

  return avatarMap[avatarNumber] || avatarMap[1];
};
