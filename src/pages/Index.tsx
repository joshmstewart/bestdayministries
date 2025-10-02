import { UnifiedHeader } from "@/components/UnifiedHeader";
import Hero from "@/components/Hero";
import Mission from "@/components/Mission";
import CommunityFeatures from "@/components/CommunityFeatures";
import CommunityGallery from "@/components/CommunityGallery";
import JoyRocks from "@/components/JoyRocks";
import Donate from "@/components/Donate";
import About from "@/components/About";
import Footer from "@/components/Footer";
import { FeaturedBestieDisplay } from "@/components/FeaturedBestieDisplay";
import LatestAlbum from "@/components/LatestAlbum";
import PublicEvents from "@/components/PublicEvents";
import OurFamily from "@/components/OurFamily";

const Index = () => {
  return (
    <div className="min-h-screen">
      <UnifiedHeader />
      <main>
        <Hero />
        <section className="container mx-auto px-4 py-16">
          <FeaturedBestieDisplay />
        </section>
        <Mission />
        <CommunityFeatures />
        <OurFamily />
        <LatestAlbum />
        <PublicEvents />
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
