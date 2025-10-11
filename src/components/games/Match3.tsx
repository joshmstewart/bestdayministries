import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Target, Zap, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCoins } from "@/hooks/useCoins";
import { Progress } from "@/components/ui/progress";

type ItemType = "☕" | "☀️" | "🌧️" | "🌙";

interface Cell {
  id: string;
  type: ItemType;
  matched: boolean;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  targetIcons: number;
  maxMoves: number;
  coinsReward: number;
}

const GRID_SIZE = 8;
const ITEMS: ItemType[] = ["☕", "☀️", "🌧️", "🌙"];
const POINTS_PER_MATCH = 10;
const COINS_PER_GAME = 5;

const CHALLENGES: Challenge[] = [
  { id: "easy", name: "Warm Up", description: "Destroy 30 icons", targetIcons: 30, maxMoves: 20, coinsReward: 10 },
  { id: "medium", name: "Getting Hot", description: "Destroy 50 icons", targetIcons: 50, maxMoves: 25, coinsReward: 20 },
  { id: "hard", name: "On Fire", description: "Destroy 80 icons", targetIcons: 80, maxMoves: 30, coinsReward: 35 },
  { id: "expert", name: "Scorching", description: "Destroy 120 icons", targetIcons: 120, maxMoves: 40, coinsReward: 50 },
];

export const Match3 = () => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [draggedCell, setDraggedCell] = useState<{ row: number; col: number } | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [iconsDestroyed, setIconsDestroyed] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameMode, setGameMode] = useState<"free" | "challenge">("free");
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [challengeFailed, setChallengeFailed] = useState(false);
  const { toast } = useToast();
  const { awardCoins } = useCoins();

  useEffect(() => {
    initializeGame();
    loadBestScore();
  }, []);

  const loadBestScore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("game_sessions")
      .select("score")
      .eq("user_id", user.id)
      .eq("game_type", "match3")
      .order("score", { ascending: false })
      .limit(1)
      .single();

    if (data) setBestScore(data.score);
  };

  const generateRandomItem = (): ItemType => {
    return ITEMS[Math.floor(Math.random() * ITEMS.length)];
  };

  const createCell = (row: number, col: number): Cell => ({
    id: `${row}-${col}`,
    type: generateRandomItem(),
    matched: false,
  });

  const initializeGame = () => {
    let newGrid: Cell[][] = [];
    
    // Create initial grid
    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        newGrid[row][col] = createCell(row, col);
      }
    }

    // Ensure no initial matches
    newGrid = removeInitialMatches(newGrid);
    
    setGrid(newGrid);
    setScore(0);
    setMoves(0);
    setIconsDestroyed(0);
    setSelectedCell(null);
    setChallengeComplete(false);
    setChallengeFailed(false);
  };

  const startChallenge = (challenge: Challenge) => {
    setCurrentChallenge(challenge);
    setGameMode("challenge");
    initializeGame();
  };

  const backToFreeMode = () => {
    setGameMode("free");
    setCurrentChallenge(null);
    initializeGame();
  };

  const removeInitialMatches = (grid: Cell[][]): Cell[][] => {
    let hasMatches = true;
    let newGrid = grid.map(row => [...row]);

    while (hasMatches) {
      hasMatches = false;
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          // Check horizontal
          if (col < GRID_SIZE - 2) {
            if (newGrid[row][col].type === newGrid[row][col + 1].type &&
                newGrid[row][col].type === newGrid[row][col + 2].type) {
              newGrid[row][col] = createCell(row, col);
              hasMatches = true;
            }
          }
          // Check vertical
          if (row < GRID_SIZE - 2) {
            if (newGrid[row][col].type === newGrid[row + 1][col].type &&
                newGrid[row][col].type === newGrid[row + 2][col].type) {
              newGrid[row][col] = createCell(row, col);
              hasMatches = true;
            }
          }
        }
      }
    }
    return newGrid;
  };

  const handleCellClick = (row: number, col: number) => {
    if (isAnimating) return;

    if (!selectedCell) {
      setSelectedCell({ row, col });
    } else {
      const rowDiff = Math.abs(selectedCell.row - row);
      const colDiff = Math.abs(selectedCell.col - col);
      
      // Check if cells are adjacent
      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        swapCells(selectedCell.row, selectedCell.col, row, col);
      }
      setSelectedCell(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, row: number, col: number) => {
    if (isAnimating) {
      e.preventDefault();
      return;
    }
    setDraggedCell({ row, col });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    
    if (!draggedCell || isAnimating) return;

    const rowDiff = Math.abs(draggedCell.row - row);
    const colDiff = Math.abs(draggedCell.col - col);
    
    // Check if cells are adjacent
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
      swapCells(draggedCell.row, draggedCell.col, row, col);
    }
    
    setDraggedCell(null);
  };

  const handleDragEnd = () => {
    setDraggedCell(null);
  };

  const swapCells = async (row1: number, col1: number, row2: number, col2: number) => {
    const newGrid = grid.map(row => [...row]);
    const temp = newGrid[row1][col1];
    newGrid[row1][col1] = newGrid[row2][col2];
    newGrid[row2][col2] = temp;

    setGrid(newGrid);
    const newMoves = moves + 1;
    setMoves(newMoves);

    // Check for matches
    await checkMatches(newGrid);

    // Check challenge fail condition
    if (gameMode === "challenge" && currentChallenge) {
      if (newMoves >= currentChallenge.maxMoves && iconsDestroyed < currentChallenge.targetIcons) {
        setChallengeFailed(true);
        toast({
          title: "Challenge Failed! 😔",
          description: "You ran out of moves. Try again!",
          variant: "destructive",
        });
      }
    }
  };

  const checkMatches = async (currentGrid: Cell[][]) => {
    setIsAnimating(true);
    let hasMatches = false;
    let matchCount = 0;
    let destroyedCount = 0;

    const newGrid = currentGrid.map(row => row.map(cell => ({ ...cell, matched: false })));

    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        if (newGrid[row][col].type === newGrid[row][col + 1].type &&
            newGrid[row][col].type === newGrid[row][col + 2].type) {
          if (!newGrid[row][col].matched) destroyedCount++;
          if (!newGrid[row][col + 1].matched) destroyedCount++;
          if (!newGrid[row][col + 2].matched) destroyedCount++;
          newGrid[row][col].matched = true;
          newGrid[row][col + 1].matched = true;
          newGrid[row][col + 2].matched = true;
          hasMatches = true;
          matchCount++;
        }
      }
    }

    // Check vertical matches
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (newGrid[row][col].type === newGrid[row + 1][col].type &&
            newGrid[row][col].type === newGrid[row + 2][col].type) {
          if (!newGrid[row][col].matched) destroyedCount++;
          if (!newGrid[row + 1][col].matched) destroyedCount++;
          if (!newGrid[row + 2][col].matched) destroyedCount++;
          newGrid[row][col].matched = true;
          newGrid[row + 1][col].matched = true;
          newGrid[row + 2][col].matched = true;
          hasMatches = true;
          matchCount++;
        }
      }
    }

    if (hasMatches) {
      setGrid(newGrid);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const pointsEarned = matchCount * POINTS_PER_MATCH;
      setScore(prev => prev + pointsEarned);
      
      const newIconsDestroyed = iconsDestroyed + destroyedCount;
      setIconsDestroyed(newIconsDestroyed);

      // Check challenge win condition
      if (gameMode === "challenge" && currentChallenge && !challengeComplete) {
        if (newIconsDestroyed >= currentChallenge.targetIcons) {
          setChallengeComplete(true);
          await awardCoins((await supabase.auth.getUser()).data.user!.id, currentChallenge.coinsReward, `${currentChallenge.name} challenge completed`);
          toast({
            title: "Challenge Complete! 🎉",
            description: `You destroyed ${newIconsDestroyed} icons! +${currentChallenge.coinsReward} JoyCoins`,
          });
        }
      }
      
      await dropCells(newGrid);
    }

    setIsAnimating(false);
  };

  const dropCells = async (currentGrid: Cell[][]) => {
    const newGrid = currentGrid.map(row => [...row]);

    // Remove matched cells and drop
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptySpaces = 0;
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (newGrid[row][col].matched) {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          newGrid[row + emptySpaces][col] = newGrid[row][col];
          newGrid[row][col] = { ...createCell(row, col), matched: true };
        }
      }
      
      // Fill from top
      for (let row = 0; row < emptySpaces; row++) {
        newGrid[row][col] = createCell(row, col);
      }
    }

    setGrid(newGrid);
    await new Promise(resolve => setTimeout(resolve, 300));
    await checkMatches(newGrid);
  };

  const saveGameSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("game_sessions").insert({
      user_id: user.id,
      game_type: "match3",
      difficulty: "standard",
      score,
      moves_count: moves,
      coins_earned: COINS_PER_GAME,
    });

    await awardCoins(user.id, COINS_PER_GAME, "Match-3 game completed");
    
    if (!bestScore || score > bestScore) {
      setBestScore(score);
      toast({
        title: "New High Score! 🎉",
        description: `${score} points! +${COINS_PER_GAME} JoyCoins`,
      });
    } else {
      toast({
        title: "Game Complete! ✨",
        description: `${score} points! +${COINS_PER_GAME} JoyCoins`,
      });
    }
  };

  if (gameMode === "free") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-warm bg-clip-text text-transparent">
            Match-3 Game
          </h1>
          <p className="text-muted-foreground mb-6">
            Choose a mode: Play freely or take on a challenge!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="cursor-pointer hover:border-primary transition-all" onClick={initializeGame}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Free Play
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Play without limits! Match coffee cups, suns, rain clouds, and moons.
              </p>
              <div className="flex justify-center gap-4 mb-4">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Score: {score}
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Moves: {moves}
                </Badge>
                {bestScore !== null && (
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    <Trophy className="h-4 w-4 mr-1" />
                    Best: {bestScore}
                  </Badge>
                )}
              </div>
              <div className="flex justify-center gap-4">
                <Button onClick={initializeGame} variant="outline" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Game
                </Button>
                <Button onClick={saveGameSession} disabled={score === 0} className="w-full">
                  Save Score
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Complete objectives to earn bonus JoyCoins!
              </p>
              <div className="space-y-2">
                {CHALLENGES.map((challenge) => (
                  <Button
                    key={challenge.id}
                    onClick={() => startChallenge(challenge)}
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <div className="text-left">
                      <div className="font-semibold">{challenge.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {challenge.description} in {challenge.maxMoves} moves
                      </div>
                    </div>
                    <Badge variant="secondary">+{challenge.coinsReward}</Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {grid.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <button
                      key={cell.id}
                      draggable={!isAnimating && !cell.matched}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                      onDragEnd={handleDragEnd}
                      className={`
                        aspect-square text-4xl flex items-center justify-center
                        rounded-lg transition-all duration-200 cursor-move
                        ${cell.matched ? "opacity-0 scale-50" : "opacity-100 scale-100"}
                        ${draggedCell?.row === rowIndex && draggedCell?.col === colIndex
                          ? "opacity-50 scale-90"
                          : ""
                        }
                        ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                          ? "ring-4 ring-primary scale-110"
                          : "hover:scale-105 hover:bg-accent/50"
                        }
                        ${isAnimating ? "pointer-events-none" : ""}
                        bg-accent/20
                      `}
                      disabled={isAnimating}
                    >
                      {cell.type}
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Challenge Mode
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-warm bg-clip-text text-transparent">
          {currentChallenge?.name}
        </h1>
        <p className="text-muted-foreground mb-4">
          {currentChallenge?.description} in {currentChallenge?.maxMoves} moves
        </p>

        <div className="space-y-4 mb-4">
          <div className="flex justify-center gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Target className="h-4 w-4 mr-1" />
              {iconsDestroyed} / {currentChallenge?.targetIcons}
            </Badge>
            <Badge variant={moves >= (currentChallenge?.maxMoves || 0) ? "destructive" : "secondary"} className="text-lg px-4 py-2">
              Moves: {moves} / {currentChallenge?.maxMoves}
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Score: {score}
            </Badge>
          </div>

          <div className="max-w-md mx-auto">
            <Progress 
              value={(iconsDestroyed / (currentChallenge?.targetIcons || 1)) * 100} 
              className="h-3"
            />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button onClick={backToFreeMode} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
          <Button onClick={() => startChallenge(currentChallenge!)} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>
      </div>

      <Card className={`${challengeComplete ? "border-green-500" : challengeFailed ? "border-red-500" : ""}`}>
        <CardContent className="p-4">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={cell.id}
                  draggable={!isAnimating && !cell.matched && !challengeComplete && !challengeFailed}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                  onDragEnd={handleDragEnd}
                  className={`
                    aspect-square text-4xl flex items-center justify-center
                    rounded-lg transition-all duration-200 cursor-move
                    ${cell.matched ? "opacity-0 scale-50" : "opacity-100 scale-100"}
                    ${draggedCell?.row === rowIndex && draggedCell?.col === colIndex
                      ? "opacity-50 scale-90"
                      : ""
                    }
                    ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                      ? "ring-4 ring-primary scale-110"
                      : "hover:scale-105 hover:bg-accent/50"
                    }
                    ${isAnimating || challengeComplete || challengeFailed ? "pointer-events-none" : ""}
                    bg-accent/20
                  `}
                  disabled={isAnimating || challengeComplete || challengeFailed}
                >
                  {cell.type}
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
