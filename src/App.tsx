import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { useAppManifest } from "@/hooks/useAppManifest";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TermsAcceptanceGuard } from "@/components/TermsAcceptanceGuard";
import { FaviconManager } from "@/components/FaviconManager";
import { ProductTourRunner } from "@/components/help/ProductTourRunner";
import { WelcomeRedirectModal } from "@/components/WelcomeRedirectModal";
import { useDomainRouting } from "@/hooks/useDomainRouting";
import { PicturePasswordNotificationManager } from "@/components/auth/PicturePasswordNotificationManager";
import { AuthProvider } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeSentry } from "@/lib/sentry";
import Index from "./pages/Index";
import ColoringBook from "./pages/ColoringBook";
import CoffeeShopHome from "./pages/CoffeeShopHome";
import Auth from "./pages/Auth";
import Community from "./pages/Community";
import Admin from "./pages/Admin";
import AvatarManagement from "./pages/AvatarManagement";
import EventManagement from "./pages/EventManagement";
import AlbumManagement from "./pages/AlbumManagement";
import HelpCenter from "./pages/HelpCenter";
import EventsPage from "./pages/EventsPage";
import AboutPage from "./pages/AboutPage";
import AmbassadorPage from "./pages/AmbassadorPage";
import JoyRocksPage from "./pages/JoyRocksPage";
import Partners from "./pages/Partners";
import GalleryPage from "./pages/GalleryPage";
import VideosPage from "./pages/VideosPage";
import SupportUs from "./pages/SupportUs";
import SponsorBestie from "./pages/SponsorBestie";
import SponsorshipSuccess from "./pages/SponsorshipSuccess";
import Discussions from "./pages/Discussions";
import ModerationQueue from "./pages/ModerationQueue";
import ProfileSettings from "./pages/ProfileSettings";
import GuardianLinks from "./pages/GuardianLinks";
import GuardianApprovals from "./pages/GuardianApprovals";
import BestieMessages from "./pages/BestieMessages";
import Marketplace from "./pages/Marketplace";
import VendorDashboard from "./pages/VendorDashboard";
import VendorAuth from "./pages/VendorAuth";
import VendorProfile from "./pages/VendorProfile";
import OrderHistory from "./pages/OrderHistory";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Newsletter from "./pages/Newsletter";
import Notifications from "./pages/Notifications";
import MemoryMatchPage from "./pages/MemoryMatchPage";
import Match3Page from "./pages/Match3Page";
import UnsubscribeSuccess from "./pages/UnsubscribeSuccess";
import UnsubscribeError from "./pages/UnsubscribeError";
import VirtualPetPage from "./pages/VirtualPetPage";
import StorePage from "./pages/Store";
import ProductDetail from "./pages/ProductDetail";
import StickerAlbumPage from "./pages/StickerAlbumPage";
import InstallApp from "./pages/InstallApp";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import DrinkCreator from "./pages/DrinkCreator";
import RecipeMaker from "./pages/RecipeMaker";
import RecipeGallery from "./pages/RecipeGallery";
import NotFound from "./pages/NotFound";
import DonationHistoryPage from "./pages/DonationHistoryPage";
import PictureLogin from "./pages/PictureLogin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't show stale data older than 30 seconds
      staleTime: 30 * 1000,
      // Only refetch on mount if data is stale
      refetchOnMount: 'always',
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
    },
  },
});

function TourManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tour, setTour] = useState<any>(null);
  const tourId = searchParams.get('tour');

  useEffect(() => {
    console.log('TourManager - tourId changed:', tourId);
    if (tourId) {
      loadTour(tourId);
    } else {
      setTour(null);
    }
  }, [tourId]);

  const loadTour = async (id: string) => {
    console.log('TourManager - Loading tour:', id);
    const { data, error } = await supabase
      .from('help_tours')
      .select('*')
      .eq('id', id)
      .single();
    
    console.log('TourManager - Tour data loaded:', data, 'Error:', error);
    
    if (data) {
      const tourData = {
        ...data,
        steps: Array.isArray(data.steps) ? data.steps : []
      };
      console.log('TourManager - Setting tour with steps:', tourData.steps.length);
      setTour(tourData);
    }
  };

  const handleClose = () => {
    // Remove tour param from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('tour');
    setSearchParams(newParams);
    setTour(null);
  };

  if (!tour) return null;

  return <ProductTourRunner tour={tour} onClose={handleClose} />;
}

const DomainRouter = () => {
  const { isCoffeeShopDomain } = useDomainRouting();
  
  // If on coffee shop domain, show coffee shop landing page
  if (isCoffeeShopDomain) {
    return <CoffeeShopHome />;
  }
  
  // Otherwise show main site landing page
  return <Index />;
};

const App = () => {
  // Update app manifest dynamically based on database settings 
  useAppManifest();

  // Initialize Sentry for error tracking
  useEffect(() => {
    initializeSentry();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
          <FaviconManager />
          <ImpersonationBanner />
          <PWAInstallBanner />
          <TourManager />
          <WelcomeRedirectModal />
          <PicturePasswordNotificationManager />
          <TermsAcceptanceGuard>
            <Routes>
            <Route path="/" element={<DomainRouter />} />
            <Route path="/coffee-shop" element={<CoffeeShopHome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/picture" element={<PictureLogin />} />
            <Route path="/auth/vendor" element={<VendorAuth />} />
            <Route path="/vendor-auth" element={<VendorAuth />} />
            <Route path="/community" element={<Community />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/avatars" element={<AvatarManagement />} />
            <Route path="/admin/events" element={<EventManagement />} />
            <Route path="/admin/albums" element={<AlbumManagement />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/ambassador" element={<AmbassadorPage />} />
            <Route path="/joy-rocks" element={<JoyRocksPage />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/support" element={<SupportUs />} />
            <Route path="/sponsor-bestie" element={<SponsorBestie />} />
            <Route path="/sponsorship-success" element={<SponsorshipSuccess />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route path="/moderation" element={<ModerationQueue />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/guardian-links" element={<GuardianLinks />} />
            <Route path="/guardian-approvals" element={<GuardianApprovals />} />
            <Route path="/bestie-messages" element={<BestieMessages />} />
            <Route path="/joyhousestore" element={<Marketplace />} />
            <Route path="/vendors/:id" element={<VendorProfile />} />
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/donation-history" element={<DonationHistoryPage />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/unsubscribe-success" element={<UnsubscribeSuccess />} />
            <Route path="/unsubscribe-error" element={<UnsubscribeError />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/notifications" element={<Notifications />} />
          <Route path="/games/memory-match" element={<MemoryMatchPage />} />
          <Route path="/games/match3" element={<Match3Page />} />
          <Route path="/games/drink-creator" element={<DrinkCreator />} />
          <Route path="/games/recipe-maker" element={<RecipeMaker />} />
          <Route path="/games/recipe-gallery" element={<RecipeGallery />} />
          <Route path="/games/coloring-book" element={<ColoringBook />} />
          <Route path="/virtual-pet" element={<VirtualPetPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/store/product/:productId" element={<ProductDetail />} />
          <Route path="/sticker-album" element={<StickerAlbumPage />} />
          <Route path="/install" element={<InstallApp />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </TermsAcceptanceGuard>
        </BrowserRouter>
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
