import { useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { MemoryMatch } from "@/components/games/MemoryMatch";
import Footer from "@/components/Footer";

const MemoryMatchPage = () => {
  const [backgroundColor, setBackgroundColor] = useState<string>('#F97316');

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main 
        className="flex-1 pt-24 pb-12 px-4 transition-colors duration-300"
        style={{ backgroundColor }}
      >
        <div className="container max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 gradient-text">
            Memory Match
          </h1>
          <MemoryMatch onBackgroundColorChange={setBackgroundColor} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MemoryMatchPage;
