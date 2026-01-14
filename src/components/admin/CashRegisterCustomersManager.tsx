import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, EyeOff, Loader2, Upload, Download, User, Edit, RefreshCw, Shuffle } from "lucide-react";
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

export const CashRegisterCustomersManager = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { toast } = useToast();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Form state for create
  const [formName, setFormName] = useState("");
  const [formCharacterType, setFormCharacterType] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Form state for edit
  const [editName, setEditName] = useState("");
  const [editCharacterType, setEditCharacterType] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Character types for randomization - includes diverse abilities representation
  const characterTypes = [
    "grandma", "grandpa", "soccer player", "astronaut", "chef", "doctor", 
    "nurse", "teacher", "firefighter", "police officer", "construction worker", 
    "artist", "musician", "scientist", "farmer", "mail carrier", "superhero", 
    "princess", "knight", "pirate", "cowboy", "ninja", "robot enthusiast", 
    "alien visitor", "ballet dancer", "skateboarder", "surfer", "rock climber", 
    "magician", "baker", "librarian", "zookeeper", "pilot", "race car driver", 
    "yoga instructor", "basketball player", "ice cream vendor", "park ranger", 
    "lifeguard", "DJ", "photographer", "veterinarian", "clown", "mime", 
    "explorer", "archaeologist", "weather reporter", "game show host",
    "disco dancer", "punk rocker", "hippie", "goth", "cheerleader", "wrestler",
    "ballerina", "opera singer", "mime artist", "circus performer", "fortune teller",
    // Characters with disabilities - inclusive representation
    "wheelchair user", "person with Down syndrome", "blind person with guide dog",
    "deaf person", "person with autism", "Paralympic athlete", "person with cerebral palsy",
    "little person", "person with prosthetic leg", "person with hearing aids",
    "person using a walker", "person with service dog", "person with arm prosthetic",
    "wheelchair basketball player", "Special Olympics athlete", "sign language user"
  ];

  // Capitalize first letter of each word
  const toTitleCase = (str: string) => 
    str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const randomizeCharacter = () => {
    // Filter out character types already used by active customers
    const activeCustomerTypes = customers
      .filter(c => c.is_active)
      .map(c => c.character_type.toLowerCase());
    
    const availableTypes = characterTypes.filter(
      type => !activeCustomerTypes.includes(type.toLowerCase())
    );
    
    // Use available types, or fall back to all types if all are taken
    const typePool = availableTypes.length > 0 ? availableTypes : characterTypes;
    const randomType = typePool[Math.floor(Math.random() * typePool.length)];
    
    setFormCharacterType(randomType);
    setFormName(toTitleCase(randomType)); // Name matches type
    setFormDescription("");
  };

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

  const handleUploadImage = async (customer: Customer, file: File) => {
    setUploadingId(customer.id);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${customer.id}-${Date.now()}.${fileExt}`;
      const filePath = `customers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("cash_register_customers")
        .update({ image_url: urlData.publicUrl })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Image uploaded!",
      });

      fetchCustomers();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDownloadImage = async (customer: Customer) => {
    if (!customer.image_url) return;

    try {
      const response = await fetch(customer.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${customer.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateImage = async (customer: Customer) => {
    setRegeneratingId(customer.id);

    try {
      const { data, error } = await supabase.functions.invoke("generate-customer-image", {
        body: {
          characterType: customer.character_type,
          description: customer.description || "",
          customerId: customer.id,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const { error: updateError } = await supabase
          .from("cash_register_customers")
          .update({ image_url: data.imageUrl })
          .eq("id", customer.id);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Image regenerated!",
        });

        fetchCustomers();
      }
    } catch (error) {
      console.error("Error regenerating image:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate image",
        variant: "destructive",
      });
    } finally {
      setRegeneratingId(null);
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
      // First create the customer record
      const { data: newCustomer, error } = await supabase
        .from("cash_register_customers")
        .insert({
          name: formName.trim(),
          character_type: formCharacterType.trim(),
          description: formDescription.trim() || null,
          image_url: null,
          display_order: customers.length,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Customer Created",
        description: "Generating image...",
      });

      // Now generate the image
      const { data: imageData, error: imageError } = await supabase.functions.invoke("generate-customer-image", {
        body: {
          characterType: formCharacterType.trim(),
          description: formDescription.trim() || "",
          customerId: newCustomer.id,
        },
      });

      if (imageError) {
        console.error("Image generation error:", imageError);
        toast({
          title: "Warning",
          description: "Customer created but image generation failed. You can regenerate it later.",
          variant: "destructive",
        });
      } else if (imageData?.imageUrl) {
        await supabase
          .from("cash_register_customers")
          .update({ image_url: imageData.imageUrl })
          .eq("id", newCustomer.id);

        toast({
          title: "Success",
          description: `Customer "${formName}" created with image!`,
        });
      }

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

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditCharacterType(customer.character_type);
    setEditDescription(customer.description || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;

    if (!editName.trim() || !editCharacterType.trim()) {
      toast({
        title: "Error",
        description: "Name and character type are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("cash_register_customers")
        .update({
          name: editName.trim(),
          character_type: editCharacterType.trim(),
          description: editDescription.trim() || null,
        })
        .eq("id", editingCustomer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer updated!",
      });

      setEditDialogOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
                  <Shuffle className="w-4 h-4 mr-2" />
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
                    placeholder="Notes about the character"
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
                      Creating...
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
                    {/* Hidden file input for upload */}
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => (fileInputRefs.current[customer.id] = el)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(customer, file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleOpenEdit(customer)}
                      title="Edit customer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fileInputRefs.current[customer.id]?.click()}
                      disabled={uploadingId === customer.id}
                      title="Upload image"
                    >
                      {uploadingId === customer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDownloadImage(customer)}
                      disabled={!customer.image_url}
                      title="Download image"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleRegenerateImage(customer)}
                      disabled={regeneratingId === customer.id}
                      title="Regenerate image"
                    >
                      {regeneratingId === customer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Grandma Rose"
              />
            </div>

            <div className="space-y-2">
              <Label>Character Type</Label>
              <Input
                value={editCharacterType}
                onChange={(e) => setEditCharacterType(e.target.value)}
                placeholder="e.g., grandma, soccer player, astronaut"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Additional details for image generation"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
