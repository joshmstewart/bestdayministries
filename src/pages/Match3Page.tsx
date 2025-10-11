import { UnifiedHeader } from "@/components/UnifiedHeader";
import { Match3 } from "@/components/games/Match3";
import Footer from "@/components/Footer";

const Match3Page = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12">
        <Match3 />
      </main>
      <Footer />
    </div>
  );
};

export default Match3Page;
