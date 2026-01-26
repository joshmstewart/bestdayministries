import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Award, Star } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";

interface LeaderboardEntry {
  user_id: string;
  current_month_score: number;
  best_level: number;
  display_name: string;
  avatar_number: number;
}

export function CashRegisterLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const currentMonthYear = new Date().toISOString().slice(0, 7);
      
      // Fetch top monthly scores with profile data
      const { data, error } = await supabase
        .from("cash_register_user_stats")
        .select(`
          user_id,
          current_month_score,
          best_level,
          current_month_year
        `)
        .eq("current_month_year", currentMonthYear)
        .gt("current_month_score", 0)
        .order("current_month_score", { ascending: false })
        .limit(20);

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
            No scores yet this month. Be the first!
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
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
                  <AvatarDisplay
                    avatarNumber={entry.avatar_number}
                    displayName={entry.display_name}
                    size="sm"
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
                    <div className="flex items-center gap-1" title="Monthly Score">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="font-semibold">{entry.current_month_score}</span>
                    </div>
                    {entry.best_level > 0 && (
                      <div className="flex items-center gap-1" title="Best Level">
                        <Star className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-muted-foreground">{entry.best_level}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
