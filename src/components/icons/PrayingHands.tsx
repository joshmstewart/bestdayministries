import { cn } from "@/lib/utils";

interface PrayingHandsProps {
  className?: string;
  filled?: boolean;
}

export const PrayingHands = ({ className, filled = false }: PrayingHandsProps) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-4 h-4", className)}
  >
    {/* Praying hands icon */}
    <path d="M12 4C12 4 10 6 10 9V14L8 16V18L12 20L16 18V16L14 14V9C14 6 12 4 12 4Z" />
    <path d="M10 9C8 9 7 10 7 12V15" />
    <path d="M14 9C16 9 17 10 17 12V15" />
    <path d="M8 16L7 17" />
    <path d="M16 16L17 17" />
  </svg>
);
