import { 
  Gamepad2, Music, Palette, Calculator, ClipboardCheck, UtensilsCrossed, 
  CupSoda, Laugh, Square, BookOpen, Image, Heart, MessageSquare, Calendar, 
  Bell, User, History, Album, Dog, Brain, Grid3X3, PenTool
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  route: string;
  category: "games" | "resources" | "content" | "user";
  color: string;
}

export const AVAILABLE_APPS: AppConfig[] = [
  // Games
  {
    id: "beat-pad",
    name: "Beat Pad",
    description: "Create music beats",
    icon: Music,
    route: "/games/beat-pad",
    category: "games",
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "card-creator",
    name: "Card Creator",
    description: "Design greeting cards",
    icon: Square,
    route: "/games/card-creator",
    category: "games",
    color: "from-rose-500 to-orange-500"
  },
  {
    id: "coloring-book",
    name: "Coloring Book",
    description: "Color beautiful pages",
    icon: Palette,
    route: "/games/coloring-book",
    category: "games",
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: "cash-register",
    name: "Cash Register",
    description: "Practice money skills",
    icon: Calculator,
    route: "/games/cash-register",
    category: "games",
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "chore-tracker",
    name: "Chore Tracker",
    description: "Track daily tasks",
    icon: ClipboardCheck,
    route: "/chore-chart",
    category: "resources",
    color: "from-amber-500 to-yellow-500"
  },
  {
    id: "recipe-pal",
    name: "Recipe Pal",
    description: "Discover recipes",
    icon: UtensilsCrossed,
    route: "/games/recipe-gallery",
    category: "resources",
    color: "from-orange-500 to-red-500"
  },
  {
    id: "drink-maker",
    name: "Drink Maker",
    description: "Create fun drinks",
    icon: CupSoda,
    route: "/games/drink-creator",
    category: "resources",
    color: "from-sky-500 to-indigo-500"
  },
  {
    id: "joke-generator",
    name: "Joke Generator",
    description: "Laugh out loud",
    icon: Laugh,
    route: "/games/jokes",
    category: "resources",
    color: "from-yellow-500 to-lime-500"
  },
  {
    id: "memory-match",
    name: "Memory Match",
    description: "Test your memory",
    icon: Brain,
    route: "/games/memory-match",
    category: "games",
    color: "from-violet-500 to-purple-500"
  },
  {
    id: "match3",
    name: "Match 3",
    description: "Match colorful gems",
    icon: Grid3X3,
    route: "/games/match3",
    category: "games",
    color: "from-pink-500 to-rose-500"
  },
  {
    id: "daily-five",
    name: "Daily Five",
    description: "Word puzzle game",
    icon: PenTool,
    route: "/games/daily-five",
    category: "games",
    color: "from-teal-500 to-cyan-500"
  },
  {
    id: "emotion-journal",
    name: "Emotion Journal",
    description: "Track your feelings",
    icon: BookOpen,
    route: "/games/emotion-journal",
    category: "resources",
    color: "from-indigo-500 to-blue-500"
  },
  {
    id: "virtual-pet",
    name: "Virtual Pet",
    description: "Care for a pet",
    icon: Dog,
    route: "/virtual-pet",
    category: "resources",
    color: "from-amber-400 to-orange-500"
  },
  // Content features
  {
    id: "discussions",
    name: "Discussions",
    description: "Join conversations",
    icon: MessageSquare,
    route: "/discussions",
    category: "content",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "events",
    name: "Events",
    description: "Upcoming activities",
    icon: Calendar,
    route: "/events",
    category: "content",
    color: "from-green-500 to-teal-500"
  },
  {
    id: "albums",
    name: "Albums",
    description: "Photo galleries",
    icon: Image,
    route: "/albums",
    category: "content",
    color: "from-purple-500 to-indigo-500"
  },
  {
    id: "prayer-wall",
    name: "Prayer Wall",
    description: "Share prayers",
    icon: Heart,
    route: "/prayer-wall",
    category: "content",
    color: "from-rose-500 to-pink-500"
  },
  // User features
  {
    id: "profile",
    name: "My Profile",
    description: "View your profile",
    icon: User,
    route: "/profile",
    category: "user",
    color: "from-slate-500 to-gray-600"
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Stay updated",
    icon: Bell,
    route: "/notifications",
    category: "user",
    color: "from-red-500 to-rose-500"
  },
  {
    id: "donation-history",
    name: "Giving History",
    description: "View donations",
    icon: History,
    route: "/donation-history",
    category: "user",
    color: "from-emerald-500 to-green-500"
  },
  {
    id: "sticker-album",
    name: "Sticker Album",
    description: "Your collection",
    icon: Album,
    route: "/sticker-album",
    category: "user",
    color: "from-fuchsia-500 to-purple-500"
  }
];

export const APP_CATEGORIES = {
  games: { label: "Games", order: 1 },
  resources: { label: "Resources", order: 2 },
  content: { label: "Community", order: 3 },
  user: { label: "My Stuff", order: 4 }
} as const;
