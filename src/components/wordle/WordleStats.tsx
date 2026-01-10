import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, Target, Gamepad2 } from "lucide-react";

interface UserStats {
  total_games_played: number;
  total_wins: number;
  current_streak: number;
  best_streak: number;
}

export function WordleStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("wordle_user_stats")
          .select("total_games_played, total_wins, current_streak, best_streak")
          .eq("user_id", user.id)
          .single();

        if (!error && data) {
          setStats(data);
        }
      } catch (err) {
        console.error("Error loading stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  if (loading || !stats) {
    return null;
  }

  const winRate = stats.total_games_played > 0 
    ? Math.round((stats.total_wins / stats.total_games_played) * 100) 
    : 0;

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-sm font-semibold mb-3 text-center">Your Stats</h3>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-4 w-4" />
            <span className="text-lg font-bold">{stats.current_streak}</span>
          </div>
          <span className="text-xs text-muted-foreground">Streak</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-yellow-500">
            <Trophy className="h-4 w-4" />
            <span className="text-lg font-bold">{stats.best_streak}</span>
          </div>
          <span className="text-xs text-muted-foreground">Best</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-green-500">
            <Target className="h-4 w-4" />
            <span className="text-lg font-bold">{winRate}%</span>
          </div>
          <span className="text-xs text-muted-foreground">Win Rate</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-blue-500">
            <Gamepad2 className="h-4 w-4" />
            <span className="text-lg font-bold">{stats.total_games_played}</span>
          </div>
          <span className="text-xs text-muted-foreground">Played</span>
        </div>
      </div>
    </Card>
  );
}
