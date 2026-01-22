import { useState, useRef } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { MemoryMatch, MemoryMatchRef } from "@/components/games/MemoryMatch";
import Footer from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { useNavigate } from "react-router-dom";

const MemoryMatchPage = () => {
  const [backgroundColor, setBackgroundColor] = useState<string>('#F97316');
  const [gameStarted, setGameStarted] = useState(false);
  const gameRef = useRef<MemoryMatchRef>(null);
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (gameStarted) {
      // If in game, go back to pack/difficulty selection
      gameRef.current?.resetToSelection();
    } else {
      // If on selection screen, go back to community
      navigate('/community');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main 
        className="flex-1 pt-20 pb-6 px-1 sm:px-4 transition-colors duration-300"
        style={{ backgroundColor }}
      >
        <div className="max-w-4xl mx-auto">
          <BackButton 
            onClick={handleBackClick} 
            label={gameStarted ? "Back to Selection" : "Back to Community"} 
          />
          <MemoryMatch 
            ref={gameRef}
            onBackgroundColorChange={setBackgroundColor} 
            onGameStartedChange={setGameStarted}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MemoryMatchPage;
