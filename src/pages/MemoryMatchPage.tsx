import { UnifiedHeader } from "@/components/UnifiedHeader";
import { MemoryMatch } from "@/components/games/MemoryMatch";
import Footer from "@/components/Footer";

const MemoryMatchPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12 px-4">
        <MemoryMatch />
      </main>
      <Footer />
    </div>
  );
};

export default MemoryMatchPage;
