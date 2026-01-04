import { 
  Dog, Cat, Bird, Fish, Bug, Rabbit,
  Apple, Pizza, IceCream, Cake, Cookie, Banana,
  Sun, Moon, Star, TreeDeciduous, Flower2, Cloud,
  Home, Car, CircleDot, Heart, Music, BookOpen
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface PictureItem {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // Tailwind color class
}

export const PICTURE_PASSWORD_IMAGES: PictureItem[] = [
  // Animals (6)
  { id: "dog", name: "Dog", icon: Dog, color: "text-amber-600" },
  { id: "cat", name: "Cat", icon: Cat, color: "text-orange-500" },
  { id: "bird", name: "Bird", icon: Bird, color: "text-sky-500" },
  { id: "fish", name: "Fish", icon: Fish, color: "text-blue-500" },
  { id: "butterfly", name: "Butterfly", icon: Bug, color: "text-purple-500" },
  { id: "rabbit", name: "Rabbit", icon: Rabbit, color: "text-pink-400" },
  
  // Food (6)
  { id: "apple", name: "Apple", icon: Apple, color: "text-red-500" },
  { id: "pizza", name: "Pizza", icon: Pizza, color: "text-orange-500" },
  { id: "icecream", name: "Ice Cream", icon: IceCream, color: "text-pink-400" },
  { id: "cake", name: "Cake", icon: Cake, color: "text-pink-500" },
  { id: "cookie", name: "Cookie", icon: Cookie, color: "text-amber-600" },
  { id: "banana", name: "Banana", icon: Banana, color: "text-yellow-500" },
  
  // Nature (6)
  { id: "sun", name: "Sun", icon: Sun, color: "text-yellow-500" },
  { id: "moon", name: "Moon", icon: Moon, color: "text-indigo-400" },
  { id: "star", name: "Star", icon: Star, color: "text-yellow-400" },
  { id: "tree", name: "Tree", icon: TreeDeciduous, color: "text-green-600" },
  { id: "flower", name: "Flower", icon: Flower2, color: "text-pink-500" },
  { id: "cloud", name: "Cloud", icon: Cloud, color: "text-sky-400" },
  
  // Objects (6)
  { id: "house", name: "House", icon: Home, color: "text-slate-600" },
  { id: "car", name: "Car", icon: Car, color: "text-red-600" },
  { id: "ball", name: "Ball", icon: CircleDot, color: "text-orange-500" },
  { id: "heart", name: "Heart", icon: Heart, color: "text-red-500" },
  { id: "music", name: "Music", icon: Music, color: "text-purple-500" },
  { id: "book", name: "Book", icon: BookOpen, color: "text-blue-600" },
];

export const getPictureById = (id: string): PictureItem | undefined => {
  return PICTURE_PASSWORD_IMAGES.find(p => p.id === id);
};

export const generateRandomSequence = (): string[] => {
  const sequence: string[] = [];
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * PICTURE_PASSWORD_IMAGES.length);
    sequence.push(PICTURE_PASSWORD_IMAGES[randomIndex].id);
  }
  return sequence;
};
