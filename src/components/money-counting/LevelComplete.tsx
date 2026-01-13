import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lightbulb, ArrowRight, RotateCcw, Star, Sparkles } from "lucide-react";
import { getDenominationLabel } from "@/lib/moneyCountingUtils";

interface LevelCompleteProps {
  result: {
    success: boolean;
    piecesUsed: number;
    optimalPieces: number;
    optimalBreakdown: { [key: string]: number };
  };
  level: number;
  score: number;
  onNextLevel: () => void;
  onNewGame: () => void;
}

export function LevelComplete({
  result,
  level,
  score,
  onNextLevel,
  onNewGame,
}: LevelCompleteProps) {
  const isOptimal = result.piecesUsed <= result.optimalPieces;

  // Sort optimal breakdown by denomination descending
  const sortedOptimal = Object.entries(result.optimalBreakdown)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));

  return (
    <div className="max-w-xl mx-auto">
      <Card className="border-2 border-primary">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {isOptimal ? (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Star className="h-10 w-10 text-white fill-white" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-white" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl">
            {isOptimal ? "Perfect! ⭐" : "Level Complete! 🎉"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-3xl font-bold">{level}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-3xl font-bold">{score}</p>
            </div>
          </div>

          {/* Pieces used comparison */}
          <div className="p-4 bg-primary/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span>Pieces you used:</span>
              <Badge variant={isOptimal ? "default" : "secondary"} className="text-lg">
                {result.piecesUsed}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Minimum possible:</span>
              <Badge variant="outline" className="text-lg">
                {result.optimalPieces}
              </Badge>
            </div>
            {isOptimal && (
              <div className="flex items-center justify-center gap-2 pt-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">+50 Efficiency Bonus!</span>
              </div>
            )}
          </div>

          {/* Optimal solution hint */}
          {!isOptimal && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">Most Efficient Way:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedOptimal.map(([denom, count]) => (
                  <Badge key={denom} variant="outline" className="text-sm">
                    {count}× {getDenominationLabel(denom)}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Using fewer pieces makes transactions faster!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onNewGame} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              New Game
            </Button>
            <Button onClick={onNextLevel} className="flex-1">
              Next Level
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
