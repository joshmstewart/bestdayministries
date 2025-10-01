import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Community from "./pages/Community";
import Admin from "./pages/Admin";
import AboutPage from "./pages/AboutPage";
import JoyRocksPage from "./pages/JoyRocksPage";
import GalleryPage from "./pages/GalleryPage";
import DonatePage from "./pages/DonatePage";
import Discussions from "./pages/Discussions";
import ModerationQueue from "./pages/ModerationQueue";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/community" element={<Community />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/joy-rocks" element={<JoyRocksPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/discussions" element={<Discussions />} />
          <Route path="/moderation" element={<ModerationQueue />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
