import { UnifiedHeader } from "@/components/UnifiedHeader";
import JoyRocks from "@/components/JoyRocks";
import Footer from "@/components/Footer";

const JoyRocksPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14">
        <JoyRocks />
      </main>
      <Footer />
    </div>
  );
};

export default JoyRocksPage;
