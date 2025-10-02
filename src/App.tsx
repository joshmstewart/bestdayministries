import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAppManifest } from "@/hooks/useAppManifest";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Community from "./pages/Community";
import Admin from "./pages/Admin";
import AvatarManagement from "./pages/AvatarManagement";
import EventManagement from "./pages/EventManagement";
import AlbumManagement from "./pages/AlbumManagement";
import EventsPage from "./pages/EventsPage";
import AboutPage from "./pages/AboutPage";
import JoyRocksPage from "./pages/JoyRocksPage";
import GalleryPage from "./pages/GalleryPage";
import DonatePage from "./pages/DonatePage";
import SponsorBestie from "./pages/SponsorBestie";
import SponsorshipSuccess from "./pages/SponsorshipSuccess";
import Discussions from "./pages/Discussions";
import ModerationQueue from "./pages/ModerationQueue";
import ProfileSettings from "./pages/ProfileSettings";
import GuardianLinks from "./pages/GuardianLinks";
import GuardianApprovals from "./pages/GuardianApprovals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Update app manifest dynamically based on database settings
  useAppManifest();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ImpersonationBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/community" element={<Community />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/avatars" element={<AvatarManagement />} />
            <Route path="/admin/events" element={<EventManagement />} />
            <Route path="/admin/albums" element={<AlbumManagement />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/joy-rocks" element={<JoyRocksPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/sponsor-bestie" element={<SponsorBestie />} />
            <Route path="/sponsorship-success" element={<SponsorshipSuccess />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route path="/moderation" element={<ModerationQueue />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/guardian-links" element={<GuardianLinks />} />
            <Route path="/guardian-approvals" element={<GuardianApprovals />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
