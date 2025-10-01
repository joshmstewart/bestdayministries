import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Mission from "@/components/Mission";
import CommunityGallery from "@/components/CommunityGallery";
import JoyRocks from "@/components/JoyRocks";
import Donate from "@/components/Donate";
import About from "@/components/About";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <Mission />
        <CommunityGallery />
        <JoyRocks />
        <Donate />
        <About />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
