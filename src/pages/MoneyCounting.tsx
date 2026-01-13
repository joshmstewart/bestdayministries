import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Trophy, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { CashDrawer } from "@/components/money-counting/CashDrawer";
import { CustomerPayment } from "@/components/money-counting/CustomerPayment";
import { ChangeTracker } from "@/components/money-counting/ChangeTracker";
import { ReceiptDisplay } from "@/components/money-counting/ReceiptDisplay";
import { LevelComplete } from "@/components/money-counting/LevelComplete";
import { generateOrder, calculateOptimalChange, DENOMINATIONS } from "@/lib/moneyCountingUtils";

export interface OrderItem {
  name: string;
  price: number;
}

export interface GameState {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerPayment: number;
  changeNeeded: number;
  changeGiven: { [key: string]: number };
  drawerContents: { [key: string]: number };
  customerCash: { [key: string]: number };
  cashCollected: boolean;
  level: number;
  score: number;
  step: "receipt" | "payment" | "change"; // Sequential flow
}

const INITIAL_DRAWER: { [key: string]: number } = {
  "100": 2,
  "50": 2,
  "20": 5,
  "10": 5,
  "5": 10,
  "1": 20,
  "0.25": 40,
  "0.10": 50,
  "0.05": 40,
  "0.01": 100,
};

const TAX_RATE = 0.08; // 8% tax

export default function MoneyCounting() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [levelResult, setLevelResult] = useState<{
    success: boolean;
    piecesUsed: number;
    optimalPieces: number;
    optimalBreakdown: { [key: string]: number };
  } | null>(null);

  const startNewGame = useCallback(() => {
    const order = generateOrder(1);
    const subtotal = order.reduce((sum, item) => sum + item.price, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    
    // Generate realistic customer payment (round up to convenient amount)
    const { payment, cash } = generateCustomerPayment(total);
    const changeNeeded = Math.round((payment - total) * 100) / 100;

    setGameState({
      items: order,
      subtotal,
      tax,
      total,
      customerPayment: payment,
      changeNeeded,
      changeGiven: {},
      drawerContents: { ...INITIAL_DRAWER },
      customerCash: cash,
      cashCollected: false,
      level: 1,
      score: 0,
      step: "receipt",
    });
    setShowComplete(false);
    setLevelResult(null);
  }, []);

  const startNextLevel = useCallback(() => {
    if (!gameState) return;
    
    const newLevel = gameState.level + 1;
    const order = generateOrder(newLevel);
    const subtotal = order.reduce((sum, item) => sum + item.price, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    
    const { payment, cash } = generateCustomerPayment(total);
    const changeNeeded = Math.round((payment - total) * 100) / 100;

    setGameState({
      ...gameState,
      items: order,
      subtotal,
      tax,
      total,
      customerPayment: payment,
      changeNeeded,
      changeGiven: {},
      customerCash: cash,
      cashCollected: false,
      level: newLevel,
      step: "receipt",
    });
    setShowComplete(false);
    setLevelResult(null);
  }, [gameState]);

  const goToNextStep = useCallback(() => {
    if (!gameState) return;
    
    if (gameState.step === "receipt") {
      setGameState({ ...gameState, step: "payment" });
    } else if (gameState.step === "payment") {
      // Collect cash and move to change step
      const newDrawer = { ...gameState.drawerContents };
      Object.entries(gameState.customerCash).forEach(([denom, count]) => {
        newDrawer[denom] = (newDrawer[denom] || 0) + count;
      });
      setGameState({
        ...gameState,
        drawerContents: newDrawer,
        cashCollected: true,
        step: "change",
      });
      toast.success("Cash collected! Now make change.");
    }
  }, [gameState]);

  const generateCustomerPayment = (total: number): { payment: number; cash: { [key: string]: number } } => {
    const cash: { [key: string]: number } = {};
    let payment = 0;

    // Customer pays with realistic amounts
    if (total <= 5) {
      // Pay with a $5 or $10
      const bill = Math.random() > 0.5 ? 5 : 10;
      cash[bill.toString()] = 1;
      payment = bill;
    } else if (total <= 10) {
      // Pay with $10 or $20
      const bill = Math.random() > 0.5 ? 10 : 20;
      cash[bill.toString()] = 1;
      payment = bill;
    } else if (total <= 20) {
      // Pay with $20 or exact-ish
      if (Math.random() > 0.3) {
        cash["20"] = 1;
        payment = 20;
      } else {
        // Try to pay closer to exact
        const twenties = Math.floor(total / 20);
        const remainder = total - twenties * 20;
        if (twenties > 0) {
          cash["20"] = twenties;
          payment += twenties * 20;
        }
        if (remainder > 0) {
          const tens = Math.ceil(remainder / 10);
          cash["10"] = tens;
          payment += tens * 10;
        }
      }
    } else if (total <= 50) {
      // Mix of bills
      if (Math.random() > 0.5) {
        cash["50"] = 1;
        payment = 50;
      } else {
        const twenties = Math.ceil(total / 20);
        cash["20"] = twenties;
        payment = twenties * 20;
      }
    } else {
      // Larger amounts
      const hundreds = Math.floor(total / 100);
      const remainder = total - hundreds * 100;
      
      if (hundreds > 0) {
        cash["100"] = hundreds;
        payment += hundreds * 100;
      }
      
      if (remainder > 0) {
        if (remainder <= 20) {
          cash["20"] = 1;
          payment += 20;
        } else if (remainder <= 50) {
          cash["50"] = 1;
          payment += 50;
        } else {
          cash["100"] = (cash["100"] || 0) + 1;
          payment += 100;
        }
      }
    }

    // Sometimes add coins for near-exact payment
    if (Math.random() > 0.7 && payment - total > 0.50) {
      const cents = Math.round((total % 1) * 100);
      if (cents > 0 && cents <= 99) {
        // Add some coins to reduce change needed
        if (cents >= 25) {
          const quarters = Math.floor(cents / 25);
          cash["0.25"] = quarters;
          payment += quarters * 0.25;
        }
      }
    }

    return { payment: Math.round(payment * 100) / 100, cash };
  };

  const giveMoney = useCallback((denomination: string) => {
    if (!gameState || !gameState.cashCollected) return;
    
    const denomValue = parseFloat(denomination);
    const currentGiven = Object.entries(gameState.changeGiven).reduce(
      (sum, [d, count]) => sum + parseFloat(d) * count,
      0
    );
    
    // Check if giving this would exceed what's needed
    if (currentGiven + denomValue > gameState.changeNeeded + 0.001) {
      toast.error("That's too much change!");
      return;
    }

    const newChangeGiven = { ...gameState.changeGiven };
    newChangeGiven[denomination] = (newChangeGiven[denomination] || 0) + 1;

    const newTotalGiven = Object.entries(newChangeGiven).reduce(
      (sum, [d, count]) => sum + parseFloat(d) * count,
      0
    );

    setGameState({
      ...gameState,
      changeGiven: newChangeGiven,
    });

    // Check if we've given exact change
    if (Math.abs(newTotalGiven - gameState.changeNeeded) < 0.001) {
      completeLevel(newChangeGiven);
    }
  }, [gameState]);

  const returnMoney = useCallback((denomination: string) => {
    if (!gameState) return;
    
    if ((gameState.changeGiven[denomination] || 0) <= 0) return;

    const newDrawer = { ...gameState.drawerContents };
    newDrawer[denomination] = (newDrawer[denomination] || 0) + 1;

    const newChangeGiven = { ...gameState.changeGiven };
    newChangeGiven[denomination] = (newChangeGiven[denomination] || 0) - 1;
    if (newChangeGiven[denomination] === 0) {
      delete newChangeGiven[denomination];
    }

    setGameState({
      ...gameState,
      drawerContents: newDrawer,
      changeGiven: newChangeGiven,
    });
  }, [gameState]);

  const completeLevel = (changeGiven: { [key: string]: number }) => {
    if (!gameState) return;

    const piecesUsed = Object.values(changeGiven).reduce((sum, count) => sum + count, 0);
    const optimal = calculateOptimalChange(gameState.changeNeeded);
    const optimalPieces = Object.values(optimal).reduce((sum, count) => sum + count, 0);

    const result = {
      success: true,
      piecesUsed,
      optimalPieces,
      optimalBreakdown: optimal,
    };

    setLevelResult(result);
    setShowComplete(true);

    // Calculate score bonus for efficiency
    const efficiencyBonus = piecesUsed <= optimalPieces ? 50 : 0;
    const levelBonus = gameState.level * 10;
    const newScore = gameState.score + 100 + efficiencyBonus + levelBonus;

    setGameState({
      ...gameState,
      score: newScore,
    });

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  useEffect(() => {
    startNewGame();
  }, []);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-24 pb-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/community">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">💵 Cash Register</h1>
              <p className="text-muted-foreground text-sm">Make correct change for customers!</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Level {gameState.level}
            </Badge>
            <Badge variant="default" className="text-lg px-3 py-1">
              <Trophy className="h-4 w-4 mr-1" />
              {gameState.score}
            </Badge>
            <Button variant="outline" size="sm" onClick={startNewGame}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Game
            </Button>
          </div>
        </div>

        {showComplete && levelResult ? (
          <LevelComplete
            result={levelResult}
            level={gameState.level}
            score={gameState.score}
            onNextLevel={startNextLevel}
            onNewGame={startNewGame}
          />
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Step 1: Receipt */}
            {gameState.step === "receipt" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Step 1: Review the Order
                  </Badge>
                </div>
                <ReceiptDisplay
                  items={gameState.items}
                  subtotal={gameState.subtotal}
                  tax={gameState.tax}
                  total={gameState.total}
                />
                <Button onClick={goToNextStep} size="lg" className="w-full">
                  Next: See Customer Payment →
                </Button>
              </div>
            )}

            {/* Step 2: Customer Payment */}
            {gameState.step === "payment" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Step 2: Collect Payment
                  </Badge>
                </div>
                <CustomerPayment
                  customerCash={gameState.customerCash}
                  totalPayment={gameState.customerPayment}
                  orderTotal={gameState.total}
                  cashCollected={gameState.cashCollected}
                  onCollect={goToNextStep}
                />
              </div>
            )}

            {/* Step 3: Make Change */}
            {gameState.step === "change" && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Step 3: Give Change
                  </Badge>
                </div>
                <ChangeTracker
                  changeNeeded={gameState.changeNeeded}
                  changeGiven={gameState.changeGiven}
                  cashCollected={gameState.cashCollected}
                  onReturnMoney={returnMoney}
                />
                <CashDrawer
                  onSelectMoney={giveMoney}
                  disabled={!gameState.cashCollected}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
