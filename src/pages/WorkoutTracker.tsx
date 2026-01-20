import { useAuth } from "@/contexts/AuthContext";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StreakDisplay } from "@/components/workout/StreakDisplay";
import { WeeklyGoalCard } from "@/components/workout/WeeklyGoalCard";
import { QuickLogGrid } from "@/components/workout/QuickLogGrid";
import { FeaturedVideo } from "@/components/workout/FeaturedVideo";
import { FitnessAvatarPicker } from "@/components/workout/FitnessAvatarPicker";
import { WorkoutImageGallery } from "@/components/workout/WorkoutImageGallery";
import { CurrentAvatarDisplay } from "@/components/workout/CurrentAvatarDisplay";
import { LocationPackPicker } from "@/components/workout/LocationPackPicker";
import { AvatarNewsFeed } from "@/components/workout/AvatarNewsFeed";
import { Dumbbell, Video, Sparkles, Image as ImageIcon, MapPin, Package, Info } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WorkoutTracker = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("workout");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [locationsDialogOpen, setLocationsDialogOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  return (
    <>
      <SEOHead
        title="Fitness Center"
        description="Watch workout videos and log your activities to reach your weekly fitness goals!"
      />
      <UnifiedHeader />
      <main className="min-h-screen bg-background pt-24 pb-8">
        <div className="container max-w-lg mx-auto px-4">
          <BackButton to="/community" />
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Dumbbell className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">Fitness Center</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Stay active and earn coins!
            </p>
          </div>

          {user ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="workout" className="flex-1 gap-1.5">
                  <Dumbbell className="h-4 w-4" />
                  Workout
                </TabsTrigger>
                <TabsTrigger value="avatar" className="flex-1 gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Avatar
                </TabsTrigger>
                <TabsTrigger value="gallery" className="flex-1 gap-1.5">
                  <ImageIcon className="h-4 w-4" />
                  Community
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workout" className="space-y-4 mt-0">
                {/* Current Avatar Display - Shows today's image or prompt to pick avatar */}
                <CurrentAvatarDisplay 
                  userId={user.id} 
                  isGenerating={isGeneratingImage}
                  onSelectAvatarClick={() => setAvatarDialogOpen(true)}
                />

                {/* Streak & Goal Row */}
                <div className="grid gap-4 grid-cols-2">
                  <StreakDisplay userId={user.id} />
                  <WeeklyGoalCard userId={user.id} />
                </div>

                {/* Videos Button */}
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 bg-soft-ribbon hover:bg-soft-ribbon/80 border-2 border-primary/30 shadow-md hover:shadow-lg transition-all text-foreground font-semibold py-6"
                  onClick={() => {
                    const videoSection = document.getElementById('video-section');
                    videoSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Video className="h-6 w-6 text-primary" />
                  Browse Workout Videos
                </Button>

                {/* Quick Log Grid - now with submit button */}
                <QuickLogGrid 
                  userId={user.id} 
                  onGeneratingChange={setIsGeneratingImage}
                />

                {/* Featured Video Section */}
                <div id="video-section">
                  <FeaturedVideo userId={user.id} />
                </div>
              </TabsContent>

              <TabsContent value="avatar" className="space-y-4 mt-0">
                {/* Action Buttons */}
                <div className="flex gap-2 justify-center items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5"
                    onClick={() => setAvatarDialogOpen(true)}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    Select Avatar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5"
                    onClick={() => setLocationsDialogOpen(true)}
                  >
                    <Package className="h-4 w-4 text-primary" />
                    Location Packs
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select an avatar and enable location packs to customize your workout images!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Avatar News Feed - Previous images grouped by day */}
                <AvatarNewsFeed userId={user.id} userName={profile?.display_name} />
              </TabsContent>

              <TabsContent value="gallery" className="mt-0">
                <WorkoutImageGallery userId={user.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Log in to track your workouts</h2>
                <p className="text-muted-foreground">
                  Sign in to log activities, watch videos, and earn coins!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />

      {/* Avatar Selection Dialog */}
      {user && (
        <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Choose Your Avatar
              </DialogTitle>
            </DialogHeader>
            <FitnessAvatarPicker 
              userId={user.id} 
              onAvatarSelected={() => setAvatarDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Locations Dialog */}
      {user && (
        <Dialog open={locationsDialogOpen} onOpenChange={setLocationsDialogOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Location Packs
              </DialogTitle>
            </DialogHeader>
            <LocationPackPicker userId={user.id} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default WorkoutTracker;
