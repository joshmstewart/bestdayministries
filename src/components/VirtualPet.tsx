import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePet } from "@/hooks/usePet";
import { Heart, Utensils, Zap, Bed, Sparkles } from "lucide-react";
import { useState } from "react";

export function VirtualPet() {
  const { pet, feedPet, playWithPet, restPet } = usePet();
  const [animation, setAnimation] = useState<'idle' | 'eating' | 'playing' | 'sleeping'>('idle');
  const [particles, setParticles] = useState<Array<{ id: number; type: string }>>([]);

  if (!pet) {
    return null;
  }

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
    showParticles('food');
    const success = await feedPet();
    setTimeout(() => setAnimation('idle'), 2000);
  };

  const handlePlay = async () => {
    setAnimation('playing');
    showParticles('hearts');
    const success = await playWithPet();
    setTimeout(() => setAnimation('idle'), 2000);
  };

  const handleRest = async () => {
    setAnimation('sleeping');
    const success = await restPet();
    setTimeout(() => setAnimation('idle'), 3000);
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
    <Card className="max-w-md mx-auto relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/3 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <CardHeader className="relative">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {pet.pet_name}
            {animation === 'playing' && <Sparkles className="h-4 w-4 text-primary animate-pulse" />}
          </span>
          <span className="text-sm text-muted-foreground">{pet.pet_types.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        {/* Particle Effects */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute top-1/3 left-1/2 pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px)`,
              animation: 'float-particle 1s ease-out forwards'
            }}
          >
            {particle.type === 'hearts' ? '💖' : particle.type === 'food' ? '🍖' : '✨'}
          </div>
        ))}

        {/* Pet Display */}
        <div className="flex justify-center relative">
          <div className={`relative transition-all duration-300 ${
            animation === 'idle' ? 'animate-[float_3s_ease-in-out_infinite]' :
            animation === 'eating' ? 'animate-[bounce_0.5s_ease-in-out_3]' :
            animation === 'playing' ? 'animate-[bounce_0.3s_ease-in-out_6] scale-110' :
            'animate-pulse opacity-70'
          }`}>
            {pet.pet_types.image_url ? (
              <img 
                src={pet.pet_types.image_url} 
                alt={pet.pet_name}
                className="w-48 h-48 object-contain rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-gradient-warm rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-6xl">{animation === 'sleeping' ? '😴' : '🐾'}</span>
              </div>
            )}
            
            {/* Status Indicator */}
            {animation === 'eating' && (
              <div className="absolute -top-2 -right-2 text-4xl animate-[bounce_0.5s_ease-in-out_infinite]">
                🍖
              </div>
            )}
            {animation === 'playing' && (
              <div className="absolute -top-2 -right-2 text-4xl animate-spin">
                ⚡
              </div>
            )}
            {animation === 'sleeping' && (
              <div className="absolute -top-2 -right-2 text-2xl animate-[float_2s_ease-in-out_infinite]">
                💤
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
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
            disabled={animation !== 'idle'}
          >
            <Utensils className="h-5 w-5" />
            <span className="text-xs">Feed</span>
            <span className="text-xs text-muted-foreground">5 coins</span>
          </Button>

          <Button
            onClick={handlePlay}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1 hover-scale transition-all duration-200 hover:bg-primary/5"
            disabled={animation !== 'idle'}
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs">Play</span>
            <span className="text-xs text-muted-foreground">10 coins</span>
          </Button>

          <Button
            onClick={handleRest}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1 hover-scale transition-all duration-200 hover:bg-primary/5"
            disabled={animation !== 'idle'}
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
