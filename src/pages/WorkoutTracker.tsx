import { useState } from "react";
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
import { Dumbbell, Video } from "lucide-react";

const WorkoutTracker = () => {
  const { user } = useAuth();

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
            <div className="space-y-4">
              {/* Streak & Goal Row */}
              <div className="grid gap-4 grid-cols-2">
                <StreakDisplay userId={user.id} />
                <WeeklyGoalCard userId={user.id} />
              </div>

              {/* Videos Button */}
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => {
                  const videoSection = document.getElementById('video-section');
                  videoSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Video className="h-5 w-5" />
                Browse Workout Videos
              </Button>

              {/* Quick Log Grid */}
              <QuickLogGrid userId={user.id} />

              {/* Featured Video Section */}
              <div id="video-section">
                <FeaturedVideo userId={user.id} />
              </div>
            </div>
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
