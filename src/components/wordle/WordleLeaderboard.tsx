import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  user_id: string;
  current_month_wins: number;
  current_streak: number;
  display_name: string;
  avatar_number: number;
}

const COLLAPSED_COUNT = 5;
const EXPANDED_COUNT = 20;

export function WordleLeaderboard() {
  const { user } = useAuth();
  const [streakEntries, setStreakEntries] = useState<LeaderboardEntry[]>([]);
  const [winsEntries, setWinsEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaksExpanded, setStreaksExpanded] = useState(false);
  const [winsExpanded, setWinsExpanded] = useState(false);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const currentMonthYear = new Date().toISOString().slice(0, 7);
      
      const { data, error } = await supabase
        .from("wordle_user_stats")
        .select(`
          user_id,
          current_month_wins,
          current_streak,
          current_month_year
        `)
        .eq("current_month_year", currentMonthYear);

      if (error) throw error;

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

        const topStreaks = [...entriesWithProfiles]
          .filter(e => e.current_streak > 0)
          .sort((a, b) => b.current_streak - a.current_streak)
          .slice(0, EXPANDED_COUNT);
        setStreakEntries(topStreaks);

        const topWins = [...entriesWithProfiles]
          .filter(e => e.current_month_wins > 0)
          .sort((a, b) => b.current_month_wins - a.current_month_wins)
          .slice(0, EXPANDED_COUNT);
        setWinsEntries(topWins);
      }
    } catch (error) {
      console.error("Error loading leaderboards:", error);
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

  const renderEntry = (entry: LeaderboardEntry, index: number, showStreak: boolean) => (
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
      <div className="flex items-center gap-1 text-sm">
        {showStreak ? (
          <>
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold">{entry.current_streak}</span>
          </>
        ) : (
          <>
            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
            <span className="font-semibold">{entry.current_month_wins}</span>
          </>
        )}
      </div>
    </div>
  );

  const renderExpandButton = (
    entries: LeaderboardEntry[],
    expanded: boolean,
    setExpanded: (v: boolean) => void
  ) => {
    if (entries.length <= COLLAPSED_COUNT) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 text-xs text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>Show Less <ChevronUp className="h-3 w-3 ml-1" /></>
        ) : (
          <>Show All ({entries.length}) <ChevronDown className="h-3 w-3 ml-1" /></>
        )}
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Top Current Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground py-4">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleStreaks = streaksExpanded ? streakEntries : streakEntries.slice(0, COLLAPSED_COUNT);
  const visibleWins = winsExpanded ? winsEntries : winsEntries.slice(0, COLLAPSED_COUNT);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Top Current Streaks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {streakEntries.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No active streaks yet. Start one today!
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleStreaks.map((entry, index) => renderEntry(entry, index, true))}
              </div>
              {renderExpandButton(streakEntries, streaksExpanded, setStreaksExpanded)}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {currentMonth} Wins
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {winsEntries.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No wins yet this month. Be the first!
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleWins.map((entry, index) => renderEntry(entry, index, false))}
              </div>
              {renderExpandButton(winsEntries, winsExpanded, setWinsExpanded)}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
