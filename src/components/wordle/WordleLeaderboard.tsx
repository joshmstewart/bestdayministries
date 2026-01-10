import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Flame } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  current_month_wins: number;
  current_streak: number;
  display_name: string;
  avatar_number: number;
}

export function WordleLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const currentMonthYear = new Date().toISOString().slice(0, 7);
      
      // Fetch top monthly wins with profile data
      const { data, error } = await supabase
        .from("wordle_user_stats")
        .select(`
          user_id,
          current_month_wins,
          current_streak,
          current_month_year
        `)
        .eq("current_month_year", currentMonthYear)
        .gt("current_month_wins", 0)
        .order("current_month_wins", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch profiles for the users
      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_number")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const entriesWithProfiles = data.map(d => ({
          ...d,
          display_name: profileMap.get(d.user_id)?.display_name || "Anonymous",
          avatar_number: profileMap.get(d.user_id)?.avatar_number || 1
        }));

        setEntries(entriesWithProfiles);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">{rank}</span>;
    }
  };

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Monthly Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          {currentMonth} Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No wins yet this month. Be the first!
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  entry.user_id === user?.id ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                }`}
              >
                <div className="flex-shrink-0 w-6 flex justify-center">
                  {getRankIcon(index + 1)}
                </div>
                <img
                  src={`/avatars/composite-${entry.avatar_number}.png`}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.display_name}
                    {entry.user_id === user?.id && (
                      <span className="text-xs text-primary ml-1">(You)</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1" title="Monthly Wins">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="font-semibold">{entry.current_month_wins}</span>
                  </div>
                  {entry.current_streak > 0 && (
                    <div className="flex items-center gap-1" title="Current Streak">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-muted-foreground">{entry.current_streak}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
