// Import badge images
import streak3Badge from "@/assets/badges/streak-3.png";
import streak7Badge from "@/assets/badges/streak-7.png";
import streak14Badge from "@/assets/badges/streak-14.png";
import streak30Badge from "@/assets/badges/streak-30.png";
import total7Badge from "@/assets/badges/total-7.png";
import total30Badge from "@/assets/badges/total-30.png";
import total100Badge from "@/assets/badges/total-100.png";
import total365Badge from "@/assets/badges/total-365.png";

export interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  icon: string; // emoji fallback
  imageUrl: string; // generated image
  threshold: number;
  category: 'streak' | 'total';
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { 
    type: 'streak_3', 
    name: '3 Day Streak', 
    description: 'Complete all chores 3 days in a row!', 
    icon: '🔥', 
    imageUrl: streak3Badge,
    threshold: 3, 
    category: 'streak' 
  },
  { 
    type: 'streak_7', 
    name: 'Week Warrior', 
    description: 'Complete all chores 7 days in a row!', 
    icon: '⭐', 
    imageUrl: streak7Badge,
    threshold: 7, 
    category: 'streak' 
  },
  { 
    type: 'streak_14', 
    name: 'Two Week Champion', 
    description: 'Complete all chores 14 days in a row!', 
    icon: '🌟', 
    imageUrl: streak14Badge,
    threshold: 14, 
    category: 'streak' 
  },
  { 
    type: 'streak_30', 
    name: 'Monthly Master', 
    description: 'Complete all chores 30 days in a row!', 
    icon: '👑', 
    imageUrl: streak30Badge,
    threshold: 30, 
    category: 'streak' 
  },
  { 
    type: 'total_7', 
    name: 'Getting Started', 
    description: 'Complete all chores on 7 different days!', 
    icon: '🎯', 
    imageUrl: total7Badge,
    threshold: 7, 
    category: 'total' 
  },
  { 
    type: 'total_30', 
    name: 'Dedicated Helper', 
    description: 'Complete all chores on 30 different days!', 
    icon: '💪', 
    imageUrl: total30Badge,
    threshold: 30, 
    category: 'total' 
  },
  { 
    type: 'total_100', 
    name: 'Chore Champion', 
    description: 'Complete all chores on 100 different days!', 
    icon: '🏆', 
    imageUrl: total100Badge,
    threshold: 100, 
    category: 'total' 
  },
  { 
    type: 'total_365', 
    name: 'Year of Excellence', 
    description: 'Complete all chores on 365 different days!', 
    icon: '🎖️', 
    imageUrl: total365Badge,
    threshold: 365, 
    category: 'total' 
  },
];

// Helper to get badge definition by type
export function getBadgeDefinition(type: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.type === type);
}
