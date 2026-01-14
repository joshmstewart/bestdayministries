import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw, Shuffle, User, Eraser } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ImageLightbox from "@/components/ImageLightbox";

interface Customer {
  id: string;
  name: string;
  description: string | null;
  character_type: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

// Predefined diverse character types for random generation
const CHARACTER_TYPES = [
  // Age variety
  { type: "grandma", description: "Elderly grandmother with gray hair and warm smile, wearing cozy cardigan" },
  { type: "grandpa", description: "Elderly grandfather with glasses, maybe a cane or walking aid" },
  { type: "teenager", description: "Trendy teenager with colorful clothes and headphones" },
  { type: "toddler with parent", description: "Small child being held by or standing with a parent" },
  
  // Occupations/Hobbies
  { type: "soccer player", description: "Athletic person in soccer jersey and cleats, carrying a ball" },
  { type: "chef", description: "Professional chef in white coat and tall hat" },
  { type: "astronaut", description: "Person in colorful space suit" },
  { type: "firefighter", description: "Brave firefighter in full gear with helmet" },
  { type: "doctor", description: "Friendly doctor in white coat with stethoscope" },
  { type: "construction worker", description: "Worker in hard hat, tool belt, and safety vest" },
  { type: "artist", description: "Creative person with paint splatter on clothes, holding brushes" },
  { type: "musician", description: "Person with musical instrument like guitar or violin" },
  { type: "farmer", description: "Farmer in overalls and straw hat" },
  { type: "scientist", description: "Scientist in lab coat with safety goggles" },
  
  // Pop culture inspired (generic)
  { type: "pop star", description: "Glamorous performer in sparkly outfit with microphone" },
  { type: "superhero fan", description: "Person wearing a cape and superhero costume" },
  { type: "punk rocker", description: "Person with colorful mohawk and leather jacket" },
  { type: "disco dancer", description: "Person in 70s disco outfit with platform shoes" },
  { type: "hippie", description: "Person with tie-dye clothes, peace signs, and flowers" },
  { type: "cowboy", description: "Western cowboy with hat, boots, and bandana" },
  { type: "ninja", description: "Friendly ninja in colorful outfit" },
  { type: "pirate", description: "Fun pirate with eye patch and parrot" },
  { type: "princess", description: "Royal princess in beautiful gown and tiara" },
  { type: "knight", description: "Armored knight with shield" },
  
  // Diverse body types
  { type: "tall basketball player", description: "Very tall athletic person in basketball jersey" },
  { type: "bodybuilder", description: "Muscular person in workout clothes" },
  { type: "curvy fashionista", description: "Stylish plus-size person in trendy outfit" },
  { type: "petite dancer", description: "Small graceful person in dance attire" },
  
  // Ability diversity
  { type: "wheelchair user", description: "Person in colorful wheelchair, sporty or decorated" },
  { type: "person with prosthetic", description: "Person with cool decorated prosthetic limb" },
  { type: "person with service dog", description: "Person accompanied by a friendly service dog" },
  { type: "person with hearing aids", description: "Person with visible hearing aids, signing or smiling" },
  { type: "person with cane", description: "Person using a white cane, wearing sunglasses" },
  
  // Cultural diversity
  { type: "traditional dancer", description: "Person in colorful traditional cultural dance attire" },
  { type: "martial artist", description: "Person in karate or taekwondo uniform with belt" },
  { type: "yoga instructor", description: "Peaceful person in comfortable yoga clothes" },
  
  // Fun/Quirky
  { type: "magician", description: "Mysterious magician with top hat and wand" },
  { type: "clown", description: "Friendly colorful clown with big shoes" },
  { type: "robot enthusiast", description: "Person in robot-themed costume or with robot friend" },
  { type: "alien visitor", description: "Friendly green alien in earth clothes trying to fit in" },
  { type: "time traveler", description: "Person in mix of futuristic and vintage clothes" },
];

export const CashRegisterCustomersManager = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { toast } = useToast();

  // Form state
  const [formName, setFormName] = useState("");
  const [formCharacterType, setFormCharacterType] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("cash_register_customers")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const randomizeCharacter = () => {
    const randomChar = CHARACTER_TYPES[Math.floor(Math.random() * CHARACTER_TYPES.length)];
    setFormCharacterType(randomChar.type);
    setFormDescription(randomChar.description);
    setFormName(randomChar.type.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
  };

  const generateImage = async (characterType: string, description: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-customer-image", {
        body: { characterType, description },
      });

      if (error) throw error;
      return data?.imageUrl || null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formCharacterType.trim()) {
      toast({
        title: "Error",
        description: "Name and character type are required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Generate image first
      const imageUrl = await generateImage(formCharacterType, formDescription);

      const { error } = await supabase
        .from("cash_register_customers")
        .insert({
          name: formName.trim(),
          character_type: formCharacterType.trim(),
          description: formDescription.trim() || null,
          image_url: imageUrl,
          display_order: customers.length,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Customer "${formName}" created${imageUrl ? " with image" : ""}!`,
      });

      setFormName("");
      setFormCharacterType("");
      setFormDescription("");
      setDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRegenerateImage = async (customer: Customer) => {
    setGeneratingId(customer.id);

    try {
      const imageUrl = await generateImage(customer.character_type, customer.description || "");

      if (!imageUrl) {
        throw new Error("Failed to generate image");
      }

      const { error } = await supabase
        .from("cash_register_customers")
        .update({ image_url: imageUrl })
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Image regenerated!",
      });

      fetchCustomers();
    } catch (error) {
      console.error("Error regenerating image:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate image",
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleRemoveBackground = async (customer: Customer) => {
    if (!customer.image_url) {
      toast({
        title: "Error",
        description: "No image to process",
        variant: "destructive",
      });
      return;
    }

    setRemovingBgId(customer.id);

    try {
      const { data, error } = await supabase.functions.invoke("remove-customer-background", {
        body: { imageUrl: customer.image_url },
      });

      if (error) throw error;

      if (!data?.imageUrl) {
        throw new Error("Failed to remove background");
      }

      const { error: updateError } = await supabase
        .from("cash_register_customers")
        .update({ image_url: data.imageUrl })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Background removed!",
      });

      fetchCustomers();
    } catch (error) {
      console.error("Error removing background:", error);
      toast({
        title: "Error",
        description: "Failed to remove background",
        variant: "destructive",
      });
    } finally {
      setRemovingBgId(null);
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from("cash_register_customers")
        .update({ is_active: !customer.is_active })
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Customer ${customer.is_active ? "hidden" : "visible"}`,
      });

      fetchCustomers();
    } catch (error) {
      console.error("Error toggling customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete "${customer.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("cash_register_customers")
        .delete()
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer deleted",
      });

      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxImages = customers
    .filter(c => c.image_url)
    .map(c => ({
      image_url: c.image_url!,
      caption: c.name,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customers ({customers.length})</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={randomizeCharacter}
                  className="w-full"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Randomize Character
                </Button>

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Grandma Rose"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Character Type</Label>
                  <Input
                    value={formCharacterType}
                    onChange={(e) => setFormCharacterType(e.target.value)}
                    placeholder="e.g., grandma, soccer player, astronaut"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Additional details for image generation"
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating & Generating Image...
                    </>
                  ) : (
                    "Create Customer"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {customers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No customers yet. Add some diverse characters!
            </p>
          ) : (
            customers.map((customer, index) => {
              const imageIndex = customers
                .filter(c => c.image_url)
                .findIndex(c => c.id === customer.id);

              return (
                <div
                  key={customer.id}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  {/* Thumbnail */}
                  <button
                    onClick={() => customer.image_url && imageIndex >= 0 && openLightbox(imageIndex)}
                    disabled={!customer.image_url}
                    className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 hover:ring-2 hover:ring-primary transition-all cursor-pointer disabled:cursor-default disabled:hover:ring-0"
                  >
                    {customer.image_url ? (
                      <img
                        src={customer.image_url}
                        alt={customer.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{customer.name}</span>
                      {!customer.is_active && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {customer.character_type}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleRegenerateImage(customer)}
                      disabled={generatingId === customer.id || removingBgId === customer.id}
                      title="Regenerate image"
                    >
                      {generatingId === customer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleRemoveBackground(customer)}
                      disabled={!customer.image_url || removingBgId === customer.id || generatingId === customer.id}
                      title="Remove background"
                    >
                      {removingBgId === customer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eraser className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleToggleActive(customer)}
                      title={customer.is_active ? "Hide" : "Show"}
                    >
                      {customer.is_active ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDelete(customer)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={() => setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
        onNext={() => setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)}
      />
    </>
  );
};
