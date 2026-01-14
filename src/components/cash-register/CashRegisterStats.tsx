import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Gamepad2, Star } from "lucide-react";

interface UserStats {
  high_score: number;
  total_games_played: number;
  total_levels_completed: number;
  best_level: number;
}

interface CashRegisterStatsProps {
  refreshKey?: number;
  currentScore?: number;
}

export function CashRegisterStats({ refreshKey = 0, currentScore = 0 }: CashRegisterStatsProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    high_score: 0,
    total_games_played: 0,
    total_levels_completed: 0,
    best_level: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("cash_register_user_stats")
          .select("high_score, total_games_played, total_levels_completed, best_level")
          .eq("user_id", user.id)
          .maybeSingle();

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
  }, [user, refreshKey]);

  if (loading) {
    return null;
  }

  const scoreToBeat = stats.high_score > 0 ? stats.high_score : null;
  const isNewHighScore = currentScore > 0 && currentScore > stats.high_score;

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-sm font-semibold mb-3 text-center">Your Stats</h3>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-yellow-500">
            <Trophy className="h-4 w-4" />
            <span className="text-lg font-bold">{stats.high_score}</span>
          </div>
          <span className="text-xs text-muted-foreground">High Score</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-purple-500">
            <Star className="h-4 w-4" />
            <span className="text-lg font-bold">{stats.best_level}</span>
          </div>
          <span className="text-xs text-muted-foreground">Best Level</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-green-500">
            <Target className="h-4 w-4" />
            <span className="text-lg font-bold">{stats.total_levels_completed}</span>
          </div>
          <span className="text-xs text-muted-foreground">Levels Done</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-blue-500">
            <Gamepad2 className="h-4 w-4" />
            <span className="text-lg font-bold">{stats.total_games_played}</span>
          </div>
          <span className="text-xs text-muted-foreground">Games</span>
        </div>
      </div>
      
      {scoreToBeat && currentScore > 0 && (
        <div className={`mt-3 text-center text-sm ${isNewHighScore ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
          {isNewHighScore 
            ? "🎉 New High Score!" 
            : `Score to beat: ${scoreToBeat}`}
        </div>
      )}
    </Card>
  );
}
