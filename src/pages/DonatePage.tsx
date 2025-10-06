import { UnifiedHeader } from "@/components/UnifiedHeader";
import Donate from "@/components/Donate";
import Footer from "@/components/Footer";

const DonatePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14">
        <Donate />
      </main>
      <Footer />
    </div>
  );
};

export default DonatePage;
