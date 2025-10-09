import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePet } from "@/hooks/usePet";
import { Heart, Utensils, Zap, Bed } from "lucide-react";

export function VirtualPet() {
  const { pet, feedPet, playWithPet, restPet } = usePet();

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

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{pet.pet_name}</span>
          <span className="text-sm text-muted-foreground">{pet.pet_types.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pet Display */}
        <div className="flex justify-center">
          {pet.pet_types.image_url ? (
            <img 
              src={pet.pet_types.image_url} 
              alt={pet.pet_name}
              className="w-48 h-48 object-contain rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 bg-gradient-warm rounded-lg flex items-center justify-center">
              <span className="text-6xl">🐾</span>
            </div>
          )}
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
            onClick={feedPet}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1"
          >
            <Utensils className="h-5 w-5" />
            <span className="text-xs">Feed</span>
            <span className="text-xs text-muted-foreground">5 coins</span>
          </Button>

          <Button
            onClick={playWithPet}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1"
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs">Play</span>
            <span className="text-xs text-muted-foreground">10 coins</span>
          </Button>

          <Button
            onClick={restPet}
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1"
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
