import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useAppManifest } from "@/hooks/useAppManifest";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TermsAcceptanceGuard } from "@/components/TermsAcceptanceGuard";
import { FaviconManager } from "@/components/FaviconManager";
import { ProductTourRunner } from "@/components/help/ProductTourRunner";
import { WelcomeRedirectModal } from "@/components/WelcomeRedirectModal";
import { useDomainRouting } from "@/hooks/useDomainRouting";
import { usePageTracking } from "@/hooks/usePageTracking";
import { PicturePasswordNotificationManager } from "@/components/auth/PicturePasswordNotificationManager";
import { AuthProvider } from "@/contexts/AuthContext";
import { DailyLoginRewardManager } from "@/components/DailyLoginRewardManager";
import { SkipLink } from "@/components/accessibility";
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeSentry } from "@/lib/sentry";
import { getPublicSiteUrl } from "@/lib/publicSiteUrl";

// Eagerly loaded pages (critical path)
import Index from "./pages/Index";
import CoffeeShopHome from "./pages/CoffeeShopHome";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - grouped by feature area for better chunking
const ColoringBook = lazy(() => import("./pages/ColoringBook"));
const EmotionJournal = lazy(() => import("./pages/EmotionJournal"));
const Community = lazy(() => import("./pages/Community"));
const Admin = lazy(() => import("./pages/Admin"));
const AvatarManagement = lazy(() => import("./pages/AvatarManagement"));
const EventManagement = lazy(() => import("./pages/EventManagement"));
const AlbumManagement = lazy(() => import("./pages/AlbumManagement"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AmbassadorPage = lazy(() => import("./pages/AmbassadorPage"));
const JoyRocksPage = lazy(() => import("./pages/JoyRocksPage"));
const Partners = lazy(() => import("./pages/Partners"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const VideosPage = lazy(() => import("./pages/VideosPage"));
const SupportUs = lazy(() => import("./pages/SupportUs"));
const SponsorBestie = lazy(() => import("./pages/SponsorBestie"));
const SponsorshipSuccess = lazy(() => import("./pages/SponsorshipSuccess"));
const Discussions = lazy(() => import("./pages/Discussions"));
const WorkoutTracker = lazy(() => import("./pages/WorkoutTracker"));
const ModerationQueue = lazy(() => import("./pages/ModerationQueue"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const GuardianLinks = lazy(() => import("./pages/GuardianLinks"));
const GuardianApprovals = lazy(() => import("./pages/GuardianApprovals"));
const BestieMessages = lazy(() => import("./pages/BestieMessages"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard"));
const VendorAuth = lazy(() => import("./pages/VendorAuth"));
const VendorProfile = lazy(() => import("./pages/VendorProfile"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MemoryMatchPage = lazy(() => import("./pages/MemoryMatchPage"));
const Match3Page = lazy(() => import("./pages/Match3Page"));
const UnsubscribeSuccess = lazy(() => import("./pages/UnsubscribeSuccess"));
const UnsubscribeError = lazy(() => import("./pages/UnsubscribeError"));
const VirtualPetPage = lazy(() => import("./pages/VirtualPetPage"));
const StorePage = lazy(() => import("./pages/Store"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const StickerAlbumPage = lazy(() => import("./pages/StickerAlbumPage"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const DrinkCreator = lazy(() => import("./pages/DrinkCreator"));
const RecipeMaker = lazy(() => import("./pages/RecipeMaker"));
const RecipeGallery = lazy(() => import("./pages/RecipeGallery"));
const WordleGame = lazy(() => import("./pages/WordleGame"));
const ChoreChart = lazy(() => import("./pages/ChoreChart"));
const DonationHistoryPage = lazy(() => import("./pages/DonationHistoryPage"));
const PictureLogin = lazy(() => import("./pages/PictureLogin"));
const BeatPad = lazy(() => import("./pages/BeatPad"));
const MoneyCounting = lazy(() => import("./pages/MoneyCounting"));
const JokeGenerator = lazy(() => import("./pages/JokeGenerator"));
const CardCreator = lazy(() => import("./pages/CardCreator"));
const GuardianResources = lazy(() => import("./pages/GuardianResources"));
const GuardianResourceDetail = lazy(() => import("./pages/GuardianResourceDetail"));
const JoyHouseStores = lazy(() => import("./pages/JoyHouseStores"));
const PrayerRequests = lazy(() => import("./pages/PrayerRequests"));
const DailyCheckin = lazy(() => import("./pages/DailyCheckin"));
const MyFortunes = lazy(() => import("./pages/MyFortunes"));
const CoffeeProductDetail = lazy(() => import("./pages/CoffeeProductDetail"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

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
    if (tourId) {
      loadTour(tourId);
    } else {
      setTour(null);
    }
  }, [tourId]);

  const loadTour = async (id: string) => {
    const { data } = await supabase
      .from('help_tours')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      const tourData = {
        ...data,
        steps: Array.isArray(data.steps) ? data.steps : []
      };
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

// Component to track page visits
function PageTracker() {
  usePageTracking();
  return null;
}

// Coffee shop domains that should NOT be redirected to primary domain
const COFFEE_SHOP_DOMAINS = [
  'bestdayevercoffeeandcrepes.com',
  'www.bestdayevercoffeeandcrepes.com'
];

// In production, enforce the primary public domain for all traffic.
// This ensures email links that land on the .lovable.app domain immediately redirect to the custom domain.
// EXCEPTION: Coffee shop domain should serve coffee shop page directly, not redirect.
function PrimaryDomainEnforcer() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const hostname = window.location.hostname;
    
    // Don't redirect if on coffee shop domain - let it serve the coffee shop page
    if (COFFEE_SHOP_DOMAINS.includes(hostname)) {
      return;
    }

    const targetOrigin = getPublicSiteUrl();
    if (targetOrigin !== window.location.origin) {
      window.location.replace(
        `${targetOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`
      );
    }
  }, []);

  return null;
}

// Some auth verify links can redirect to "/" with recovery tokens or errors in the hash/query.
// Catch those and route to the Auth page so users see the reset UI.
function AuthVerifyRedirectCatcher() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const markers = `${location.search}${location.hash}`;
    const looksAuthRelated = /access_token=|type=recovery|error_code=|error=|code=/.test(markers);

    if (location.pathname === "/" && looksAuthRelated) {
      navigate(`/auth${location.search}${location.hash}`, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}

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
            <SkipLink />
            <PrimaryDomainEnforcer />
            <AuthVerifyRedirectCatcher />
            <ScrollToTop />
          <FaviconManager />
          <ImpersonationBanner />
          <PWAInstallBanner />
          <TourManager />
          <WelcomeRedirectModal />
          <PicturePasswordNotificationManager />
          <DailyLoginRewardManager />
          <PageTracker />
          <TermsAcceptanceGuard>
            <main id="main-content" className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<DomainRouter />} />
              <Route path="/coffee-shop" element={<CoffeeShopHome />} />
              <Route path="/joy-house-stores" element={<JoyHouseStores />} />
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
              <Route path="/prayer-requests" element={<PrayerRequests />} />
              <Route path="/moderation" element={<ModerationQueue />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="/guardian-links" element={<GuardianLinks />} />
              <Route path="/guardian-approvals" element={<GuardianApprovals />} />
              <Route path="/guardian-resources" element={<GuardianResources />} />
              <Route path="/guardian-resources/:id" element={<GuardianResourceDetail />} />
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
            <Route path="/games/daily-five" element={<WordleGame />} />
            <Route path="/games/emotion-journal" element={<EmotionJournal />} />
            <Route path="/daily-checkin" element={<DailyCheckin />} />
            <Route path="/my-fortunes" element={<MyFortunes />} />
            <Route path="/games/beat-pad" element={<BeatPad />} />
            <Route path="/games/cash-register" element={<MoneyCounting />} />
            <Route path="/games/jokes" element={<JokeGenerator />} />
            <Route path="/games/card-creator" element={<CardCreator />} />
            <Route path="/chore-chart" element={<ChoreChart />} />
            <Route path="/virtual-pet" element={<VirtualPetPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/product/:productId" element={<ProductDetail />} />
            <Route path="/store/coffee/:productId" element={<CoffeeProductDetail />} />
            <Route path="/sticker-album" element={<StickerAlbumPage />} />
            <Route path="/install" element={<InstallApp />} />
            <Route path="/workout-tracker" element={<WorkoutTracker />} />
            <Route path="/checkout-success" element={<CheckoutSuccess />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </main>
          </TermsAcceptanceGuard>
        </BrowserRouter>
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
