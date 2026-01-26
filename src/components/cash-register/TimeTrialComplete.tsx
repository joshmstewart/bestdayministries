import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Trophy, Star, RotateCcw, ArrowLeft, Sparkles } from "lucide-react";
import { TimeTrialDuration } from "./CashRegisterModeSelect";

interface TimeTrialCompleteProps {
  duration: TimeTrialDuration;
  levelsCompleted: number;
  score: number;
  previousBest: number | null;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onChangeDuration: () => void;
  onBackToModeSelect: () => void;
}

const DURATION_LABELS: Record<TimeTrialDuration, string> = {
  60: "1 Minute",
  120: "2 Minute",
  300: "5 Minute",
};

export function TimeTrialComplete({
  duration,
  levelsCompleted,
  score,
  previousBest,
  isNewRecord,
  onPlayAgain,
  onChangeDuration,
  onBackToModeSelect,
}: TimeTrialCompleteProps) {
  return (
    <div className="max-w-xl mx-auto">
      <Card className={`border-2 ${isNewRecord ? "border-yellow-500" : "border-primary"}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {isNewRecord ? (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-pulse">
                <Star className="h-10 w-10 text-white fill-white" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Timer className="h-10 w-10 text-white" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl">
            {isNewRecord ? "New Record! 🏆" : "Time's Up! ⏰"}
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            {DURATION_LABELS[duration]} Time Trial Complete
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Levels Completed</p>
              <p className="text-4xl font-bold text-primary">{levelsCompleted}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Score</p>
              <p className="text-4xl font-bold">{score}</p>
            </div>
          </div>

          {/* Record comparison */}
          {previousBest !== null && (
            <div className={`p-4 rounded-lg ${isNewRecord ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-muted"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Previous Best:</span>
                <Badge variant="outline" className="text-lg">
                  {previousBest} levels
                </Badge>
              </div>
              {isNewRecord && (
                <div className="flex items-center justify-center gap-2 pt-3 text-yellow-600">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-semibold">+{levelsCompleted - previousBest} levels improvement!</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={onPlayAgain} className="w-full" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again ({DURATION_LABELS[duration]})
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onChangeDuration}>
                <Timer className="h-4 w-4 mr-2" />
                Change Duration
              </Button>
              <Button variant="outline" onClick={onBackToModeSelect}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Menu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
