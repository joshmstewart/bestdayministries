import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Target, Zap, ArrowLeft, Volume2, VolumeX, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCoins } from "@/hooks/useCoins";
import { Progress } from "@/components/ui/progress";
import explosionImage from "@/assets/games/explosion.png";

type ItemType = "☕" | "☀️" | "🌧️" | "🌙" | "⭐" | "🎵";
type Difficulty = "easy" | "medium" | "hard";
type SpecialType = "horizontal" | "vertical" | "bomb" | "area" | null;

interface Cell {
  id: string;
  type: ItemType;
  matched: boolean;
  special?: SpecialType;
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
const ALL_ITEMS: ItemType[] = ["☕", "☀️", "🌧️", "🌙", "⭐", "🎵"];

const DIFFICULTY_CONFIG = {
  easy: { icons: 4, pointsPerMatch: 10, coinsPerGame: 5, multiplier: 1 },
  medium: { icons: 5, pointsPerMatch: 15, coinsPerGame: 8, multiplier: 1.5 },
  hard: { icons: 6, pointsPerMatch: 20, coinsPerGame: 12, multiplier: 2 },
};

const CHALLENGES: Record<Difficulty, Challenge[]> = {
  easy: [
    { id: "easy1", name: "Warm Up", description: "Destroy 30 icons", targetIcons: 30, maxMoves: 20, coinsReward: 10 },
    { id: "easy2", name: "Getting Hot", description: "Destroy 50 icons", targetIcons: 50, maxMoves: 25, coinsReward: 20 },
  ],
  medium: [
    { id: "medium1", name: "Rising Heat", description: "Destroy 60 icons", targetIcons: 60, maxMoves: 25, coinsReward: 30 },
    { id: "medium2", name: "On Fire", description: "Destroy 90 icons", targetIcons: 90, maxMoves: 30, coinsReward: 45 },
  ],
  hard: [
    { id: "hard1", name: "Scorching", description: "Destroy 80 icons", targetIcons: 80, maxMoves: 25, coinsReward: 50 },
    { id: "hard2", name: "Inferno", description: "Destroy 120 icons", targetIcons: 120, maxMoves: 35, coinsReward: 75 },
  ],
};

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
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [challengeFailed, setChallengeFailed] = useState(false);
  const [explosions, setExplosions] = useState<{ row: number; col: number; id: string }[]>([]);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();
  const { awardCoins } = useCoins();

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Play sound effect
  const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  const playSoundEffect = (effect: 'match' | 'special' | 'win' | 'fail') => {
    switch (effect) {
      case 'match':
        playSound(523.25, 0.1, 'sine'); // C5
        setTimeout(() => playSound(659.25, 0.1, 'sine'), 50); // E5
        break;
      case 'special':
        playSound(783.99, 0.15, 'square'); // G5
        setTimeout(() => playSound(1046.5, 0.15, 'square'), 75); // C6
        setTimeout(() => playSound(1318.5, 0.2, 'square'), 150); // E6
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          setTimeout(() => playSound(freq, 0.2, 'sine'), i * 100);
        });
        break;
      case 'fail':
        playSound(220, 0.3, 'sawtooth');
        setTimeout(() => playSound(196, 0.4, 'sawtooth'), 150);
        break;
    }
  };

  useEffect(() => {
    if (grid.length > 0) {
      initializeGame(difficulty);
    }
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

  const generateRandomItem = (diff: Difficulty): ItemType => {
    const items = ALL_ITEMS.slice(0, DIFFICULTY_CONFIG[diff].icons);
    return items[Math.floor(Math.random() * items.length)];
  };

  const createCell = (row: number, col: number, diff: Difficulty): Cell => ({
    id: `${row}-${col}`,
    type: generateRandomItem(diff),
    matched: false,
  });

  const initializeGame = (diff: Difficulty = difficulty) => {
    let newGrid: Cell[][] = [];
    
    // Create initial grid
    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        newGrid[row][col] = createCell(row, col, diff);
      }
    }

    // Ensure no initial matches
    newGrid = removeInitialMatches(newGrid, diff);
    
    setGrid(newGrid);
    setScore(0);
    setMoves(0);
    setIconsDestroyed(0);
    setSelectedCell(null);
    setChallengeComplete(false);
    setChallengeFailed(false);
  };

  const startChallenge = (challenge: Challenge, diff: Difficulty) => {
    setDifficulty(diff);
    setCurrentChallenge(challenge);
    setGameMode("challenge");
    initializeGame(diff);
  };

  const startFreePlay = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameMode("free");
    initializeGame(diff);
  };

  const backToFreeMode = () => {
    setGameMode("free");
    setCurrentChallenge(null);
    setGrid([]);
    setScore(0);
    setMoves(0);
    setIconsDestroyed(0);
    setSelectedCell(null);
    setChallengeComplete(false);
    setChallengeFailed(false);
  };

  const removeInitialMatches = (grid: Cell[][], diff: Difficulty): Cell[][] => {
    let hasMatches = true;
    let newGrid = grid.map(row => [...row]);

    while (hasMatches) {
      hasMatches = false;
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          // Check for 2x2 squares first (to prevent special patterns)
          if (row < GRID_SIZE - 1 && col < GRID_SIZE - 1) {
            if (newGrid[row][col].type === newGrid[row][col + 1].type &&
                newGrid[row][col].type === newGrid[row + 1][col].type &&
                newGrid[row][col].type === newGrid[row + 1][col + 1].type) {
              newGrid[row][col] = createCell(row, col, diff);
              hasMatches = true;
              continue;
            }
          }
          
          // Check horizontal
          if (col < GRID_SIZE - 2) {
            if (newGrid[row][col].type === newGrid[row][col + 1].type &&
                newGrid[row][col].type === newGrid[row][col + 2].type) {
              newGrid[row][col] = createCell(row, col, diff);
              hasMatches = true;
            }
          }
          // Check vertical
          if (row < GRID_SIZE - 2) {
            if (newGrid[row][col].type === newGrid[row + 1][col].type &&
                newGrid[row][col].type === newGrid[row + 2][col].type) {
              newGrid[row][col] = createCell(row, col, diff);
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

    // If clicking a special item, activate it directly
    if (grid[row][col].special) {
      activateSpecialDirectly(row, col);
      return;
    }

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

  const activateSpecialDirectly = async (row: number, col: number) => {
    setIsAnimating(true);
    const newGrid = grid.map(r => [...r]);
    const special = newGrid[row][col].special;
    
    if (special) {
      const destroyedCount = activateSpecial(row, col, special, newGrid);
      playSoundEffect('special');
      
      const newMoves = moves + 1;
      setMoves(newMoves);
      setGrid(newGrid);
      
      const pointsEarned = destroyedCount * DIFFICULTY_CONFIG[difficulty].pointsPerMatch * 2;
      setScore(prev => prev + pointsEarned);
      setIconsDestroyed(prev => prev + destroyedCount);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      await dropCells(newGrid);
      
      // Check challenge fail condition
      if (gameMode === "challenge" && currentChallenge) {
        if (newMoves >= currentChallenge.maxMoves && iconsDestroyed + destroyedCount < currentChallenge.targetIcons) {
          setChallengeFailed(true);
          playSoundEffect('fail');
          toast({
            title: "Challenge Failed! 😔",
            description: "You ran out of moves. Try again!",
            variant: "destructive",
          });
        }
      }
    }
    
    setIsAnimating(false);
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
    
    // Check if either cell is a special item
    const cell1Special = newGrid[row1][col1].special;
    const cell2Special = newGrid[row2][col2].special;
    
    // If swapping with special item, activate it
    if (cell1Special || cell2Special) {
      setIsAnimating(true);
      let totalDestroyed = 0;
      
      if (cell1Special) {
        totalDestroyed += activateSpecial(row1, col1, cell1Special, newGrid);
        playSoundEffect('special');
      }
      
      if (cell2Special) {
        totalDestroyed += activateSpecial(row2, col2, cell2Special, newGrid);
        playSoundEffect('special');
      }
      
      const newMoves = moves + 1;
      setMoves(newMoves);
      setGrid(newGrid);
      
      const pointsEarned = totalDestroyed * DIFFICULTY_CONFIG[difficulty].pointsPerMatch * 2;
      setScore(prev => prev + pointsEarned);
      setIconsDestroyed(prev => prev + totalDestroyed);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      await dropCells(newGrid);
      setIsAnimating(false);
      return;
    }
    
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
        playSoundEffect('fail');
        toast({
          title: "Challenge Failed! 😔",
          description: "You ran out of moves. Try again!",
          variant: "destructive",
        });
      }
    }
  };

  const activateSpecial = (row: number, col: number, special: SpecialType, newGrid: Cell[][]): number => {
    let destroyedCount = 0;
    const newExplosions: { row: number; col: number; id: string }[] = [];
    
    switch (special) {
      case "horizontal":
        // Clear entire row
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!newGrid[row][c].matched) {
            destroyedCount++;
            newExplosions.push({ row, col: c, id: `explosion-${row}-${c}-${Date.now()}` });
          }
          newGrid[row][c].matched = true;
        }
        break;
        
      case "vertical":
        // Clear entire column
        for (let r = 0; r < GRID_SIZE; r++) {
          if (!newGrid[r][col].matched) {
            destroyedCount++;
            newExplosions.push({ row: r, col, id: `explosion-${r}-${col}-${Date.now()}` });
          }
          newGrid[r][col].matched = true;
        }
        break;
        
      case "bomb":
        // Clear both row and column
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!newGrid[row][c].matched) {
            destroyedCount++;
            newExplosions.push({ row, col: c, id: `explosion-${row}-${c}-${Date.now()}` });
          }
          newGrid[row][c].matched = true;
        }
        for (let r = 0; r < GRID_SIZE; r++) {
          if (!newGrid[r][col].matched) {
            destroyedCount++;
            newExplosions.push({ row: r, col, id: `explosion-${r}-${col}-${Date.now()}` });
          }
          newGrid[r][col].matched = true;
        }
        break;
        
      case "area":
        // Clear 3x3 area
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID_SIZE - 1, row + 1); r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(GRID_SIZE - 1, col + 1); c++) {
            if (!newGrid[r][c].matched) {
              destroyedCount++;
              newExplosions.push({ row: r, col: c, id: `explosion-${r}-${c}-${Date.now()}` });
            }
            newGrid[r][c].matched = true;
          }
        }
        break;
    }
    
    // Trigger explosions
    setExplosions(prev => [...prev, ...newExplosions]);
    setTimeout(() => {
      setExplosions(prev => prev.filter(e => !newExplosions.find(ne => ne.id === e.id)));
    }, 600);
    
    return destroyedCount;
  };

  const detectSpecialPattern = (matches: { row: number; col: number }[], type: ItemType): { row: number; col: number; special: SpecialType } | null => {
    // Check for 5 in a row (bomb)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 4; col++) {
        const horizontal = matches.filter(m => m.row === row && m.col >= col && m.col <= col + 4);
        if (horizontal.length === 5) {
          return { row, col: col + 2, special: "bomb" };
        }
      }
    }
    
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 4; row++) {
        const vertical = matches.filter(m => m.col === col && m.row >= row && m.row <= row + 4);
        if (vertical.length === 5) {
          return { row: row + 2, col, special: "bomb" };
        }
      }
    }
    
    // Check for 2x2 square (area blast)
    for (let row = 0; row < GRID_SIZE - 1; row++) {
      for (let col = 0; col < GRID_SIZE - 1; col++) {
        const square = [
          matches.find(m => m.row === row && m.col === col),
          matches.find(m => m.row === row && m.col === col + 1),
          matches.find(m => m.row === row + 1 && m.col === col),
          matches.find(m => m.row === row + 1 && m.col === col + 1)
        ];
        if (square.every(m => m !== undefined)) {
          return { row, col, special: "area" };
        }
      }
    }
    
    // Check for L-shape patterns (bomb)
    for (let row = 1; row < GRID_SIZE - 1; row++) {
      for (let col = 1; col < GRID_SIZE - 1; col++) {
        const center = matches.find(m => m.row === row && m.col === col);
        if (!center) continue;
        
        const patterns = [
          [{ r: row - 1, c: col }, { r: row + 1, c: col }, { r: row, c: col + 1 }],
          [{ r: row - 1, c: col }, { r: row + 1, c: col }, { r: row, c: col - 1 }],
          [{ r: row, c: col - 1 }, { r: row, c: col + 1 }, { r: row + 1, c: col }],
          [{ r: row, c: col - 1 }, { r: row, c: col + 1 }, { r: row - 1, c: col }],
        ];
        
        for (const pattern of patterns) {
          if (pattern.every(p => matches.find(m => m.row === p.r && m.col === p.c))) {
            return { row, col, special: "bomb" };
          }
        }
      }
    }
    
    // Check for 4 in a row (line blaster)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 3; col++) {
        const horizontal = matches.filter(m => m.row === row && m.col >= col && m.col <= col + 3);
        if (horizontal.length === 4) {
          return { row, col: col + 1, special: "horizontal" };
        }
      }
    }
    
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 3; row++) {
        const vertical = matches.filter(m => m.col === col && m.row >= row && m.row <= row + 3);
        if (vertical.length === 4) {
          return { row: row + 1, col, special: "vertical" };
        }
      }
    }
    
    return null;
  };

  const checkMatches = async (currentGrid: Cell[][]) => {
    setIsAnimating(true);
    let hasMatches = false;
    let matchCount = 0;
    let destroyedCount = 0;

    const newGrid = currentGrid.map(row => row.map(cell => ({ ...cell, matched: false })));
    const allMatches: { row: number; col: number; type: ItemType }[] = [];

    // Check for 2x2 squares FIRST (to create area blast special items)
    for (let row = 0; row < GRID_SIZE - 1; row++) {
      for (let col = 0; col < GRID_SIZE - 1; col++) {
        if (!newGrid[row][col].special &&
            newGrid[row][col].type === newGrid[row][col + 1].type &&
            newGrid[row][col].type === newGrid[row + 1][col].type &&
            newGrid[row][col].type === newGrid[row + 1][col + 1].type) {
          const type = newGrid[row][col].type;
          
          // Add all 4 cells to matches
          const squareMatches = [
            { row, col },
            { row, col: col + 1 },
            { row: row + 1, col },
            { row: row + 1, col: col + 1 }
          ];
          
          squareMatches.forEach(match => {
            if (!allMatches.find(m => m.row === match.row && m.col === match.col)) {
              allMatches.push({ row: match.row, col: match.col, type });
            }
          });
        }
      }
    }

    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        if (!newGrid[row][col].special &&
            newGrid[row][col].type === newGrid[row][col + 1].type &&
            newGrid[row][col].type === newGrid[row][col + 2].type) {
          const type = newGrid[row][col].type;
          const matches: { row: number; col: number }[] = [];
          
          // Extend match as far as possible
          for (let c = col; c < GRID_SIZE && newGrid[row][c].type === type && !newGrid[row][c].special; c++) {
            matches.push({ row, col: c });
            if (!allMatches.find(m => m.row === row && m.col === c)) {
              allMatches.push({ row, col: c, type });
            }
          }
          
          // Skip already counted cells
          col += matches.length - 1;
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        if (!newGrid[row][col].special &&
            newGrid[row][col].type === newGrid[row + 1][col].type &&
            newGrid[row][col].type === newGrid[row + 2][col].type) {
          const type = newGrid[row][col].type;
          const matches: { row: number; col: number }[] = [];
          
          // Extend match as far as possible
          for (let r = row; r < GRID_SIZE && newGrid[r][col].type === type && !newGrid[r][col].special; r++) {
            matches.push({ row: r, col });
            if (!allMatches.find(m => m.row === r && m.col === col)) {
              allMatches.push({ row: r, col, type });
            }
          }
          
          // Skip already counted cells
          row += matches.length - 1;
        }
      }
    }

    if (allMatches.length > 0) {
      hasMatches = true;
      
      // Group matches by type to check for special patterns
      const matchesByType = new Map<ItemType, { row: number; col: number }[]>();
      allMatches.forEach(match => {
        const existing = matchesByType.get(match.type) || [];
        existing.push({ row: match.row, col: match.col });
        matchesByType.set(match.type, existing);
      });
      
      // Check for special patterns
      let specialCreated: { row: number; col: number; special: SpecialType; type: ItemType } | null = null;
      
      for (const [type, matches] of matchesByType.entries()) {
        const special = detectSpecialPattern(matches, type);
        if (special) {
          specialCreated = { ...special, type };
          break;
        }
      }
      
      // Mark cells for destruction and create explosions
      const newExplosions: { row: number; col: number; id: string }[] = [];
      allMatches.forEach(match => {
        if (!specialCreated || match.row !== specialCreated.row || match.col !== specialCreated.col) {
          if (!newGrid[match.row][match.col].matched) {
            destroyedCount++;
            newExplosions.push({ 
              row: match.row, 
              col: match.col, 
              id: `explosion-${match.row}-${match.col}-${Date.now()}-${Math.random()}` 
            });
          }
          newGrid[match.row][match.col].matched = true;
        }
      });
      
      // Trigger explosions
      if (newExplosions.length > 0) {
        setExplosions(prev => [...prev, ...newExplosions]);
        setTimeout(() => {
          setExplosions(prev => prev.filter(e => !newExplosions.find(ne => ne.id === e.id)));
        }, 600);
      }
      
      // Create special cell if detected
      if (specialCreated) {
        newGrid[specialCreated.row][specialCreated.col] = {
          ...newGrid[specialCreated.row][specialCreated.col],
          special: specialCreated.special,
          matched: false,
          type: specialCreated.type
        };
      }
      
      matchCount = Math.ceil(allMatches.length / 3);
    }

    if (hasMatches) {
      setGrid(newGrid);
      playSoundEffect('match');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const pointsEarned = matchCount * DIFFICULTY_CONFIG[difficulty].pointsPerMatch;
      setScore(prev => prev + pointsEarned);
      
      const newIconsDestroyed = iconsDestroyed + destroyedCount;
      setIconsDestroyed(newIconsDestroyed);

      // Check challenge win condition
      if (gameMode === "challenge" && currentChallenge && !challengeComplete) {
        if (newIconsDestroyed >= currentChallenge.targetIcons) {
          setChallengeComplete(true);
          playSoundEffect('win');
          const bonusCoins = Math.floor(currentChallenge.coinsReward * DIFFICULTY_CONFIG[difficulty].multiplier);
          await awardCoins((await supabase.auth.getUser()).data.user!.id, bonusCoins, `${currentChallenge.name} challenge completed (${difficulty})`);
          toast({
            title: "Challenge Complete! 🎉",
            description: `You destroyed ${newIconsDestroyed} icons! +${bonusCoins} JoyCoins`,
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
          newGrid[row][col] = createCell(row, col, difficulty);
        }
      }
      
      // Fill from top with new cells
      for (let row = 0; row < emptySpaces; row++) {
        newGrid[row][col] = createCell(row, col, difficulty);
      }
    }

    setGrid(newGrid);
    await new Promise(resolve => setTimeout(resolve, 300));
    await checkMatches(newGrid);
  };

  const saveGameSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const coinsEarned = DIFFICULTY_CONFIG[difficulty].coinsPerGame;
    
    await supabase.from("game_sessions").insert({
      user_id: user.id,
      game_type: "match3",
      difficulty,
      score,
      moves_count: moves,
      coins_earned: coinsEarned,
    });

    await awardCoins(user.id, coinsEarned, `Brew Blast game completed (${difficulty})`);
    playSoundEffect('win');
    
    if (!bestScore || score > bestScore) {
      setBestScore(score);
      toast({
        title: "New High Score! 🎉",
        description: `${score} points! +${coinsEarned} JoyCoins`,
      });
    } else {
      toast({
        title: "Game Complete! ✨",
        description: `${score} points! +${coinsEarned} JoyCoins`,
      });
    }
  };

  if (gameMode === "free" && grid.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-warm bg-clip-text text-transparent">
            ☕ Brew Blast
          </h1>
          <p className="text-muted-foreground mb-6">
            Choose a mode and difficulty!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Free Play
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Play without limits! Match icons and score points.
              </p>
              <div className="space-y-2">
                <Button onClick={() => startFreePlay("easy")} variant="outline" className="w-full justify-between">
                  <div className="text-left">
                    <div className="font-semibold">Easy Mode</div>
                    <div className="text-xs text-muted-foreground">4 icon types • 10 pts/match</div>
                  </div>
                  <Badge variant="secondary">+5 coins</Badge>
                </Button>
                <Button onClick={() => startFreePlay("medium")} variant="outline" className="w-full justify-between">
                  <div className="text-left">
                    <div className="font-semibold">Medium Mode</div>
                    <div className="text-xs text-muted-foreground">5 icon types • 15 pts/match</div>
                  </div>
                  <Badge variant="secondary">+8 coins</Badge>
                </Button>
                <Button onClick={() => startFreePlay("hard")} variant="outline" className="w-full justify-between">
                  <div className="text-left">
                    <div className="font-semibold">Hard Mode</div>
                    <div className="text-xs text-muted-foreground">6 icon types • 20 pts/match</div>
                  </div>
                  <Badge variant="secondary">+12 coins</Badge>
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
              {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                <div key={diff} className="mb-4">
                  <div className="text-sm font-semibold mb-2 capitalize">{diff} Mode</div>
                  <div className="space-y-2">
                    {CHALLENGES[diff].map((challenge) => (
                      <Button
                        key={challenge.id}
                        onClick={() => startChallenge(challenge, diff)}
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <div className="text-left">
                          <div className="font-semibold">{challenge.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {challenge.description} in {challenge.maxMoves} moves
                          </div>
                        </div>
                        <Badge variant="secondary">+{Math.floor(challenge.coinsReward * DIFFICULTY_CONFIG[diff].multiplier)}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameMode === "free") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-warm bg-clip-text text-transparent">
            ☕ Brew Blast
          </h1>
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              size="icon"
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex justify-center gap-4 mb-4 flex-wrap">
            <Badge variant="secondary" className="text-lg px-4 py-2 capitalize">
              {difficulty} Mode
            </Badge>
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
          <div className="flex justify-center gap-4 mb-4">
            <Button onClick={backToFreeMode} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Menu
            </Button>
            <Button onClick={() => initializeGame(difficulty)} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              New Game
            </Button>
            <Button onClick={saveGameSession} disabled={score === 0}>
              Save Score
            </Button>
          </div>
        </div>

        {grid.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="relative">
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
                          aspect-square text-3xl flex items-center justify-center relative
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
                          ${cell.special ? "ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse" : ""}
                          bg-accent/20
                        `}
                        disabled={isAnimating}
                      >
                        {cell.type}
                        {cell.special && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {cell.special === "horizontal" && (
                              <div className="absolute w-full h-0.5 bg-yellow-400" />
                            )}
                            {cell.special === "vertical" && (
                              <div className="absolute h-full w-0.5 bg-yellow-400" />
                            )}
                            {cell.special === "bomb" && (
                              <>
                                <div className="absolute w-full h-0.5 bg-yellow-400" />
                                <div className="absolute h-full w-0.5 bg-yellow-400" />
                              </>
                            )}
                            {cell.special === "area" && (
                              <div className="absolute inset-2 border-2 border-yellow-400 rounded" />
                            )}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
                {/* Explosion effects */}
                {explosions.map(explosion => (
                  <div
                    key={explosion.id}
                    className="absolute pointer-events-none z-10"
                    style={{
                      gridColumn: explosion.col + 1,
                      gridRow: explosion.row + 1,
                      left: `${(explosion.col * 100) / GRID_SIZE}%`,
                      top: `${(explosion.row * 100) / GRID_SIZE}%`,
                      width: `${100 / GRID_SIZE}%`,
                      height: `${100 / GRID_SIZE}%`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img 
                        src={explosionImage} 
                        alt="explosion" 
                        className="w-full h-full object-contain animate-ping"
                        style={{ 
                          filter: 'drop-shadow(0 0 10px rgba(255, 165, 0, 0.8))',
                          animationDuration: '0.4s'
                        }}
                      />
                    </div>
                  </div>
                ))}
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

        <div className="flex justify-center gap-2 mb-4">
          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="outline"
            size="icon"
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex justify-center gap-4">
          <Button onClick={backToFreeMode} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
          <Button onClick={() => startChallenge(currentChallenge!, difficulty)} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>
      </div>

      <Card className={`${challengeComplete ? "border-green-500" : challengeFailed ? "border-red-500" : ""}`}>
        <CardContent className="p-4">
          <div className="relative">
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
                      aspect-square text-3xl flex items-center justify-center relative
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
                      ${cell.special ? "ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse" : ""}
                      bg-accent/20
                    `}
                    disabled={isAnimating || challengeComplete || challengeFailed}
                  >
                    {cell.type}
                    {cell.special && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {cell.special === "horizontal" && (
                          <div className="absolute w-full h-0.5 bg-yellow-400" />
                        )}
                        {cell.special === "vertical" && (
                          <div className="absolute h-full w-0.5 bg-yellow-400" />
                        )}
                        {cell.special === "bomb" && (
                          <>
                            <div className="absolute w-full h-0.5 bg-yellow-400" />
                            <div className="absolute h-full w-0.5 bg-yellow-400" />
                          </>
                        )}
                        {cell.special === "area" && (
                          <div className="absolute inset-2 border-2 border-yellow-400 rounded" />
                        )}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
            {/* Explosion effects */}
            {explosions.map(explosion => (
              <div
                key={explosion.id}
                className="absolute pointer-events-none z-10"
                style={{
                  gridColumn: explosion.col + 1,
                  gridRow: explosion.row + 1,
                  left: `${(explosion.col * 100) / GRID_SIZE}%`,
                  top: `${(explosion.row * 100) / GRID_SIZE}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src={explosionImage} 
                    alt="explosion" 
                    className="w-full h-full object-contain animate-ping"
                    style={{ 
                      filter: 'drop-shadow(0 0 10px rgba(255, 165, 0, 0.8))',
                      animationDuration: '0.4s'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
