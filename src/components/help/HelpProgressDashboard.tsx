import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  PlayCircle, 
  BookOpen, 
  Star,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTourCompletions } from "@/hooks/useTourCompletions";

interface HelpProgressDashboardProps {
  totalTours: number;
  totalGuides: number;
}

export function HelpProgressDashboard({ totalTours, totalGuides }: HelpProgressDashboardProps) {
  const { completedTours, loading } = useTourCompletions();
  const [stats, setStats] = useState({
    toursCompleted: 0,
    guidesRead: 0,
  });

  useEffect(() => {
    // Load guides read from localStorage (simplified tracking)
    const readGuides = JSON.parse(localStorage.getItem("read_guides") || "[]");
    setStats(prev => ({
      ...prev,
      toursCompleted: completedTours.size,
      guidesRead: readGuides.length,
    }));
  }, [completedTours]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const tourProgress = totalTours > 0 ? (stats.toursCompleted / totalTours) * 100 : 0;
  const guideProgress = totalGuides > 0 ? (stats.guidesRead / totalGuides) * 100 : 0;
  const overallProgress = ((tourProgress + guideProgress) / 2);

  const getLevel = () => {
    if (overallProgress >= 80) return { name: "Expert", color: "text-yellow-500", bg: "bg-yellow-100" };
    if (overallProgress >= 50) return { name: "Intermediate", color: "text-blue-500", bg: "bg-blue-100" };
    if (overallProgress >= 20) return { name: "Learner", color: "text-green-500", bg: "bg-green-100" };
    return { name: "Newcomer", color: "text-gray-500", bg: "bg-gray-100" };
  };

  const level = getLevel();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Progress</CardTitle>
          </div>
          <Badge className={`${level.bg} ${level.color} gap-1`}>
            <Star className="h-3 w-3" />
            {level.name}
          </Badge>
        </div>
        <CardDescription>
          Track your learning journey through tours and guides
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <PlayCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.toursCompleted}</p>
              <p className="text-xs text-muted-foreground">
                of {totalTours} tours
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-secondary/10">
              <BookOpen className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.guidesRead}</p>
              <p className="text-xs text-muted-foreground">
                of {totalGuides} guides
              </p>
            </div>
          </div>
        </div>

        {/* Achievement hint */}
        {overallProgress < 100 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            {overallProgress < 50 
              ? "Complete more tours and guides to level up!"
              : "You're doing great! Keep exploring to become an Expert."
            }
          </p>
        )}
        
        {overallProgress === 100 && (
          <div className="flex items-center justify-center gap-2 pt-2 text-yellow-600">
            <Trophy className="h-5 w-5" />
            <span className="font-medium">You've completed everything! 🎉</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
