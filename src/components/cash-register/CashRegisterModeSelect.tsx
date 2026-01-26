import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Timer, Trophy, Flame, Star } from "lucide-react";

export type GameMode = "free_play" | "time_trial";
export type TimeTrialDuration = 60 | 120 | 300;

interface TimeTrialBest {
  duration_seconds: number;
  best_levels: number;
  best_score: number;
}

interface CashRegisterModeSelectProps {
  onSelectMode: (mode: GameMode, duration?: TimeTrialDuration) => void;
  freePlayBestLevel?: number;
  timeTrialBests?: Map<number, TimeTrialBest>;
}

const DURATIONS: { value: TimeTrialDuration; label: string; description: string }[] = [
  { value: 60, label: "1 Minute", description: "Quick challenge" },
  { value: 120, label: "2 Minutes", description: "Standard round" },
  { value: 300, label: "5 Minutes", description: "Extended session" },
];

export function CashRegisterModeSelect({ onSelectMode, freePlayBestLevel, timeTrialBests }: CashRegisterModeSelectProps) {
  const getTimeTrialBest = (duration: TimeTrialDuration) => {
    return timeTrialBests?.get(duration);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose Your Mode</h2>
        <p className="text-muted-foreground">How would you like to play today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free Play Mode */}
        <Card 
          className="cursor-pointer hover:border-primary transition-colors hover:shadow-lg group"
          onClick={() => onSelectMode("free_play")}
        >
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Just Play</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground text-sm">
              Practice at your own pace. No time limit - complete as many levels as you want!
            </p>
            {freePlayBestLevel && freePlayBestLevel > 0 && (
              <Badge variant="outline" className="mt-3 gap-1.5 text-primary border-primary/30 bg-primary/5">
                <Star className="h-3.5 w-3.5 fill-primary" />
                Best: Level {freePlayBestLevel}
              </Badge>
            )}
            <Button className="mt-4 w-full" variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Start Playing
            </Button>
          </CardContent>
        </Card>

        {/* Time Trial Mode */}
        <Card className="border-2 border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Timer className="h-8 w-8 text-orange-500" />
            </div>
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Time Trial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              Race against the clock! Complete as many levels as you can before time runs out.
            </p>
            <div className="space-y-2">
              {DURATIONS.map((duration) => {
                const best = getTimeTrialBest(duration.value);
                return (
                  <Button
                    key={duration.value}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMode("time_trial", duration.value);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-orange-500" />
                      {duration.label}
                    </span>
                    <span className="flex items-center gap-2">
                      {best ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Trophy className="h-3 w-3 text-primary" />
                          {best.best_levels} levels
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{duration.description}</span>
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats teaser */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span>Compete on leaderboards</span>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <span>Beat your best</span>
        </div>
      </div>
    </div>
  );
}
