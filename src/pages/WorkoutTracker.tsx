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
import { LocationPicker } from "@/components/workout/LocationPicker";
import { AvatarNewsFeed } from "@/components/workout/AvatarNewsFeed";
import { Dumbbell, Video, Sparkles, Image as ImageIcon, MapPin } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WorkoutTracker = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("workout");

  return (
    <>
      <SEOHead
        title="Fitness Center"
        description="Watch workout videos and log your activities to reach your weekly fitness goals!"
      />
      <UnifiedHeader />
      <main className="min-h-screen bg-background pt-24 pb-8">
        <div className="container max-w-lg mx-auto px-4">
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
                  Gallery
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workout" className="space-y-4 mt-0">
                {/* Current Avatar Display - Shows today's image or default */}
                <CurrentAvatarDisplay userId={user.id} />

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
                <QuickLogGrid userId={user.id} />

                {/* Featured Video Section */}
                <div id="video-section">
                  <FeaturedVideo userId={user.id} />
                </div>
              </TabsContent>

              <TabsContent value="avatar" className="space-y-4 mt-0">
                {/* Avatar Picker */}
                <FitnessAvatarPicker userId={user.id} />
                
                {/* Location Picker */}
                <LocationPicker userId={user.id} />
                
                <p className="text-xs text-muted-foreground text-center">
                  Select an avatar and enable locations to customize your workout images!
                </p>

                {/* Avatar News Feed - Previous images grouped by day */}
                <AvatarNewsFeed userId={user.id} />
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
    </>
  );
};

export default WorkoutTracker;