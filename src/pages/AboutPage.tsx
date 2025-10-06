import { UnifiedHeader } from "@/components/UnifiedHeader";
import About from "@/components/About";
import Footer from "@/components/Footer";

const AboutPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14">
        <About />
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
