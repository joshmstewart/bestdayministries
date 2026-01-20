import { UnifiedHeader } from "@/components/UnifiedHeader";
import { Match3 } from "@/components/games/Match3";
import Footer from "@/components/Footer";
import { BackButton } from "@/components/BackButton";

const Match3Page = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-4xl mx-auto px-4">
          <BackButton />
          <h1 className="text-4xl font-bold text-center mb-8 gradient-text">
            Brew Blast
          </h1>
          <Match3 />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Match3Page;
