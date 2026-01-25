import { useMemo } from "react";

interface MemoryMatchGridPreviewProps {
  difficulty: 'hard' | 'extreme';
  cardBackUrl?: string;
}

export const MemoryMatchGridPreview = ({ difficulty, cardBackUrl }: MemoryMatchGridPreviewProps) => {
  // Define grid configuration based on difficulty
  const gridConfig = useMemo(() => {
    if (difficulty === 'hard') {
      return { cols: 5, rows: 4, totalCards: 20 }; // 10 pairs
    } else {
      return { cols: 4, rows: 8, totalCards: 32 }; // 16 pairs
    }
  }, [difficulty]);

  const defaultCardBack = "https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/game-assets/memory-match/card-backs/42f5cae0-8bc7-4cff-b0a8-b6d3c0e0b4a7.png";
  const imageUrl = cardBackUrl || defaultCardBack;

  return (
    <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-3 flex items-center justify-center">
      <div 
        className="grid gap-1 w-full h-full"
        style={{ 
          gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`
        }}
      >
        {Array.from({ length: gridConfig.totalCards }).map((_, index) => (
          <div 
            key={index} 
            className="rounded-sm overflow-hidden bg-primary/10 shadow-sm"
          >
            <img 
              src={imageUrl} 
              alt="Card back"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
