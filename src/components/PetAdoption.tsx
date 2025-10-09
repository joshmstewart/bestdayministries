import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePet } from "@/hooks/usePet";
import { Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PetAdoption() {
  const { petTypes, adoptPet } = usePet();
  const [selectedPetType, setSelectedPetType] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAdopt = async () => {
    if (!selectedPetType || !petName.trim()) return;

    const petType = petTypes.find(pt => pt.id === selectedPetType);
    if (!petType) return;

    const success = await adoptPet(selectedPetType, petName.trim(), petType.unlock_cost);
    if (success) {
      setDialogOpen(false);
      setPetName("");
      setSelectedPetType(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center">Adopt a Virtual Pet</h1>
        <p className="text-muted-foreground text-center mb-8">
          Choose your perfect companion and give them a name!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {petTypes.map((petType) => (
            <Card key={petType.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{petType.name}</CardTitle>
                <CardDescription>{petType.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  {petType.image_url ? (
                    <img 
                      src={petType.image_url} 
                      alt={petType.name}
                      className="w-32 h-32 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-warm rounded-lg flex items-center justify-center">
                      <span className="text-5xl">🐾</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-sm">
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold">
                    {petType.unlock_cost === 0 ? "Free" : `${petType.unlock_cost} coins`}
                  </span>
                </div>

                <Dialog open={dialogOpen && selectedPetType === petType.id} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) {
                    setSelectedPetType(null);
                    setPetName("");
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setSelectedPetType(petType.id);
                        setDialogOpen(true);
                      }}
                    >
                      Adopt {petType.name}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Name Your Pet</DialogTitle>
                      <DialogDescription>
                        Choose a special name for your {petType.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="petName">Pet Name</Label>
                        <Input
                          id="petName"
                          placeholder="Enter a name..."
                          value={petName}
                          onChange={(e) => setPetName(e.target.value)}
                          maxLength={30}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleAdopt}
                        disabled={!petName.trim()}
                        className="w-full"
                      >
                        Adopt for {petType.unlock_cost === 0 ? "Free" : `${petType.unlock_cost} coins`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
