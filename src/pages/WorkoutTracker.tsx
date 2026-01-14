import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutVideos } from "@/components/workout/WorkoutVideos";
import { QuickActivities } from "@/components/workout/QuickActivities";
import { WorkoutProgress } from "@/components/workout/WorkoutProgress";
import { Dumbbell, Play, TrendingUp } from "lucide-react";

const WorkoutTracker = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("videos");

  return (
    <>
      <SEOHead
        title="Workout Tracker"
        description="Watch workout videos and log your activities to reach your weekly fitness goals!"
      />
      <UnifiedHeader />
      <main className="min-h-screen bg-background pt-24 pb-8">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Dumbbell className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Workout Tracker</h1>
            </div>
            <p className="text-muted-foreground">
              Watch videos or log activities to hit your weekly goal!
            </p>
          </div>

          {user && <WorkoutProgress userId={user.id} className="mb-6" />}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                <span>Videos</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Quick Log</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos">
              <WorkoutVideos userId={user?.id} />
            </TabsContent>

            <TabsContent value="activities">
              <QuickActivities userId={user?.id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default WorkoutTracker;
