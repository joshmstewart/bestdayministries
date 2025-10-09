import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePet } from "@/hooks/usePet";
import { Heart, Utensils, Zap, Bed, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import catIdle from "@/assets/pets/cat-idle.png";
import catWalking from "@/assets/pets/cat-walking.png";
import catEating from "@/assets/pets/cat-eating.png";
import catSleeping from "@/assets/pets/cat-sleeping.png";
import catPlaying from "@/assets/pets/cat-playing.png";
import roomBackground from "@/assets/pets/room-background.png";
import foodBowl from "@/assets/pets/food-bowl.png";
import toyBall from "@/assets/pets/toy-ball.png";

export function VirtualPet() {
  const { pet, feedPet, playWithPet, restPet } = usePet();
  const [animation, setAnimation] = useState<'idle' | 'eating' | 'playing' | 'sleeping' | 'walking'>('idle');
  const [particles, setParticles] = useState<Array<{ id: number; type: string }>>([]);
  const [catPosition, setCatPosition] = useState({ x: 40, y: 60 });
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    // Random walking animation
    const walkInterval = setInterval(() => {
      if (animation === 'idle' && !isMoving) {
        const shouldWalk = Math.random() > 0.7;
        if (shouldWalk) {
          setIsMoving(true);
          setAnimation('walking');
          const newX = Math.random() * 70 + 10; // Keep within 10-80% of width
          const newY = Math.random() * 50 + 40; // Keep within 40-90% of height
          setCatPosition({ x: newX, y: newY });
          
          setTimeout(() => {
            setAnimation('idle');
            setIsMoving(false);
          }, 2000);
        }
      }
    }, 4000);

    return () => clearInterval(walkInterval);
  }, [animation, isMoving]);

  if (!pet) {
    return null;
  }

  const getCatImage = () => {
    switch (animation) {
      case 'walking':
        return catWalking;
      case 'eating':
        return catEating;
      case 'sleeping':
        return catSleeping;
      case 'playing':
        return catPlaying;
      default:
        return catIdle;
    }
  };

  const getStatColor = (value: number) => {
    if (value >= 70) return "text-green-600";
    if (value >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (value: number) => {
    if (value >= 70) return "bg-green-500";
    if (value >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleFeed = async () => {
    setAnimation('eating');
    setCatPosition({ x: 20, y: 70 }); // Move to food bowl position
    showParticles('food');
    const success = await feedPet();
    setTimeout(() => {
      setAnimation('idle');
    }, 3000);
  };

  const handlePlay = async () => {
    setAnimation('playing');
    setCatPosition({ x: 60, y: 50 }); // Move to play area
    showParticles('hearts');
    const success = await playWithPet();
    setTimeout(() => {
      setAnimation('idle');
    }, 3000);
  };

  const handleRest = async () => {
    setAnimation('sleeping');
    setCatPosition({ x: 30, y: 35 }); // Move to bed position
    const success = await restPet();
    setTimeout(() => {
      setAnimation('idle');
    }, 4000);
  };

  const showParticles = (type: string) => {
    const newParticles = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      type
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  };

  return (
    <Card className="max-w-4xl mx-auto relative overflow-hidden">
      <CardHeader className="relative z-10 bg-card/80 backdrop-blur-sm">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {pet.pet_name}
            {animation === 'playing' && <Sparkles className="h-4 w-4 text-primary animate-pulse" />}
          </span>
          <span className="text-sm text-muted-foreground">{pet.pet_types.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative p-0">
        {/* Room Environment */}
        <div className="relative w-full aspect-video overflow-hidden rounded-lg">
          {/* Background Image */}
          <img 
            src={roomBackground} 
            alt="Pet room" 
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Food Bowl - Fixed position */}
          <div className="absolute" style={{ left: '15%', bottom: '25%' }}>
            <img 
              src={foodBowl} 
              alt="Food bowl" 
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* Toy Ball - Fixed position */}
          <div className="absolute" style={{ right: '25%', bottom: '45%' }}>
            <img 
              src={toyBall} 
              alt="Toy" 
              className="w-12 h-12 object-contain"
            />
          </div>

          {/* Particle Effects */}
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute pointer-events-none z-20"
              style={{
                left: `${catPosition.x}%`,
                top: `${catPosition.y}%`,
                animation: 'float-particle 1s ease-out forwards'
              }}
            >
              {particle.type === 'hearts' ? '💖' : particle.type === 'food' ? '🍖' : '✨'}
            </div>
          ))}

          {/* Animated Cat */}
          <div 
            className="absolute transition-all duration-2000 ease-in-out z-10"
            style={{ 
              left: `${catPosition.x}%`, 
              top: `${catPosition.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <img 
              src={getCatImage()} 
              alt={pet.pet_name}
              className={`w-32 h-32 object-contain drop-shadow-lg ${
                animation === 'idle' ? 'animate-[float_3s_ease-in-out_infinite]' :
                animation === 'walking' ? '' :
                animation === 'eating' ? 'animate-[bounce_0.5s_ease-in-out_2]' :
                animation === 'playing' ? 'animate-[bounce_0.3s_ease-in-out_4]' :
                ''
              }`}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4 px-6 pb-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Heart className={`h-4 w-4 ${getStatColor(pet.happiness)}`} />
                <span className="text-sm font-medium">Happiness</span>
              </div>
              <span className={`text-sm font-bold ${getStatColor(pet.happiness)}`}>
                {pet.happiness}%
              </span>
            </div>
            <Progress value={pet.happiness} className="h-2">
              <div className={`h-full ${getProgressColor(pet.happiness)}`} style={{ width: `${pet.happiness}%` }} />
            </Progress>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Utensils className={`h-4 w-4 ${getStatColor(pet.hunger)}`} />
                <span className="text-sm font-medium">Hunger</span>
              </div>
              <span className={`text-sm font-bold ${getStatColor(pet.hunger)}`}>
                {pet.hunger}%
              </span>
            </div>
            <Progress value={pet.hunger} className="h-2">
              <div className={`h-full ${getProgressColor(pet.hunger)}`} style={{ width: `${pet.hunger}%` }} />
            </Progress>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${getStatColor(pet.energy)}`} />
                <span className="text-sm font-medium">Energy</span>
              </div>
              <span className={`text-sm font-bold ${getStatColor(pet.energy)}`}>
                {pet.energy}%
              </span>
            </div>
            <Progress value={pet.energy} className="h-2">
              <div className={`h-full ${getProgressColor(pet.energy)}`} style={{ width: `${pet.energy}%` }} />
            </Progress>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleFeed}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1 hover-scale transition-all duration-200 hover:bg-primary/5"
            disabled={animation !== 'idle' && animation !== 'walking'}
          >
            <Utensils className="h-5 w-5" />
            <span className="text-xs">Feed</span>
            <span className="text-xs text-muted-foreground">5 coins</span>
          </Button>

          <Button
            onClick={handlePlay}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1 hover-scale transition-all duration-200 hover:bg-primary/5"
            disabled={animation !== 'idle' && animation !== 'walking'}
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs">Play</span>
            <span className="text-xs text-muted-foreground">10 coins</span>
          </Button>

          <Button
            onClick={handleRest}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1 hover-scale transition-all duration-200 hover:bg-primary/5"
            disabled={animation !== 'idle' && animation !== 'walking'}
          >
            <Bed className="h-5 w-5" />
            <span className="text-xs">Rest</span>
            <span className="text-xs text-muted-foreground">Free</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
