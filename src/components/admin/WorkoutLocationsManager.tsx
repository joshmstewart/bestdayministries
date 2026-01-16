import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Edit, Trash2, MapPin, Package, Coins, Eye, EyeOff, Wand2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ImageLightbox from "@/components/ImageLightbox";

interface LocationPack {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_coins: number;
  is_free: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface WorkoutLocation {
  id: string;
  pack_id: string | null;
  name: string;
  description: string | null;
  prompt_text: string;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export const WorkoutLocationsManager = () => {
  const queryClient = useQueryClient();
  
  // Pack state
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<LocationPack | null>(null);
  const [packForm, setPackForm] = useState({
    name: "",
    description: "",
    image_url: "",
    price_coins: 0,
    is_free: false,
    is_active: true,
  });
  const [deletePackId, setDeletePackId] = useState<string | null>(null);
  const [generatingPackImage, setGeneratingPackImage] = useState<string | null>(null);

  // Location state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkoutLocation | null>(null);
  const [locationForm, setLocationForm] = useState({
    pack_id: "",
    name: "",
    description: "",
    prompt_text: "",
    image_url: "",
    is_active: true,
  });
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [addingLocationToPackId, setAddingLocationToPackId] = useState<string | null>(null);
  const [newLocationName, setNewLocationName] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [generatingLocationImage, setGeneratingLocationImage] = useState<string | null>(null);

  // AI prompt state for pack dialog
  const [packImagePrompt, setPackImagePrompt] = useState("");
  const [generatingDialogImage, setGeneratingDialogImage] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<{ image_url: string; caption?: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch packs
  const { data: packs = [], isLoading: packsLoading } = useQuery({
    queryKey: ["workout-location-packs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_location_packs")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as LocationPack[];
    },
  });

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["workout-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_locations")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as WorkoutLocation[];
    },
  });

  // Group locations by pack
  const locationsByPack: Record<string, WorkoutLocation[]> = {};
  locations.forEach((loc) => {
    const packId = loc.pack_id || "unassigned";
    if (!locationsByPack[packId]) {
      locationsByPack[packId] = [];
    }
    locationsByPack[packId].push(loc);
  });

  // Pack mutations
  const savePack = useMutation({
    mutationFn: async (data: typeof packForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("workout_location_packs")
          .update({
            name: data.name,
            description: data.description || null,
            image_url: data.image_url || null,
            price_coins: data.price_coins,
            is_free: data.is_free,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workout_location_packs")
          .insert({
            name: data.name,
            description: data.description || null,
            image_url: data.image_url || null,
            price_coins: data.price_coins,
            is_free: data.is_free,
            is_active: data.is_active,
            display_order: packs.length,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-location-packs"] });
      setPackDialogOpen(false);
      setEditingPack(null);
      resetPackForm();
      toast.success(editingPack ? "Pack updated" : "Pack created");
    },
    onError: (error) => {
      toast.error("Failed to save pack: " + error.message);
    },
  });

  const deletePack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workout_location_packs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-location-packs"] });
      queryClient.invalidateQueries({ queryKey: ["workout-locations"] });
      setDeletePackId(null);
      toast.success("Pack deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete pack: " + error.message);
    },
  });

  const togglePackActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("workout_location_packs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-location-packs"] });
    },
  });

  // Location mutations
  const saveLocation = useMutation({
    mutationFn: async (data: typeof locationForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("workout_locations")
          .update({
            pack_id: data.pack_id || null,
            name: data.name,
            description: data.description || null,
            prompt_text: data.prompt_text,
            image_url: data.image_url || null,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workout_locations")
          .insert({
            pack_id: data.pack_id || null,
            name: data.name,
            description: data.description || null,
            prompt_text: data.prompt_text,
            image_url: data.image_url || null,
            is_active: data.is_active,
            display_order: locations.length,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-locations"] });
      setLocationDialogOpen(false);
      setEditingLocation(null);
      resetLocationForm();
      toast.success(editingLocation ? "Location updated" : "Location created");
    },
    onError: (error) => {
      toast.error("Failed to save location: " + error.message);
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workout_locations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-locations"] });
      setDeleteLocationId(null);
      toast.success("Location deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete location: " + error.message);
    },
  });

  const toggleLocationActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("workout_locations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-locations"] });
    },
  });

  const resetPackForm = () => {
    setPackForm({
      name: "",
      description: "",
      image_url: "",
      price_coins: 0,
      is_free: false,
      is_active: true,
    });
    setPackImagePrompt("");
  };

  const resetLocationForm = () => {
    setLocationForm({
      pack_id: "",
      name: "",
      description: "",
      prompt_text: "",
      image_url: "",
      is_active: true,
    });
  };

  const openEditPack = (pack: LocationPack) => {
    setEditingPack(pack);
    setPackForm({
      name: pack.name,
      description: pack.description || "",
      image_url: pack.image_url || "",
      price_coins: pack.price_coins,
      is_free: pack.is_free,
      is_active: pack.is_active,
    });
    setPackImagePrompt(pack.name);
    setPackDialogOpen(true);
  };

  const openEditLocation = (location: WorkoutLocation) => {
    setEditingLocation(location);
    setLocationForm({
      pack_id: location.pack_id || "",
      name: location.name,
      description: location.description || "",
      prompt_text: location.prompt_text,
      image_url: location.image_url || "",
      is_active: location.is_active,
    });
    setLocationDialogOpen(true);
  };

  // Quick add location to a pack
  const handleQuickAddLocation = async (packId: string) => {
    if (!newLocationName.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    setAddingLocation(true);
    try {
      const packLocations = locationsByPack[packId] || [];
      const pack = packs.find(p => p.id === packId);
      
      const { error } = await supabase
        .from("workout_locations")
        .insert({
          pack_id: packId,
          name: newLocationName.trim(),
          prompt_text: `${newLocationName.trim()}${pack ? ` in ${pack.name}` : ""}, beautiful scenic workout location, photorealistic, warm lighting`,
          is_active: true,
          display_order: packLocations.length,
        });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["workout-locations"] });
      setNewLocationName("");
      setAddingLocationToPackId(null);
      toast.success(`Added ${newLocationName}`);
    } catch (error: any) {
      toast.error("Failed to add location: " + error.message);
    } finally {
      setAddingLocation(false);
    }
  };

  // Generate pack image using AI - uses locations within the pack for context
  const generatePackImage = async (packId: string, packName: string) => {
    setGeneratingPackImage(packId);
    try {
      // Get the locations in this pack to provide context
      const packLocations = locationsByPack[packId] || [];
      const locationNames = packLocations.map(l => l.name).slice(0, 5).join(", ");
      
      const prompt = locationNames 
        ? `${packName} featuring places like: ${locationNames}`
        : packName;
      
      const { data, error } = await supabase.functions.invoke("generate-workout-location-image", {
        body: { prompt, packId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["workout-location-packs"] });
      toast.success("Pack image generated!");
    } catch (error: any) {
      console.error("Failed to generate pack image:", error);
      toast.error("Failed to generate image: " + (error.message || "Unknown error"));
    } finally {
      setGeneratingPackImage(null);
    }
  };

  // Generate location image using AI
  const generateLocationImage = async (locationId: string, locationName: string, promptText: string) => {
    setGeneratingLocationImage(locationId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workout-location-image", {
        body: { 
          prompt: promptText || locationName,
          locationId 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update the location with the new image URL
      if (data?.imageUrl) {
        await supabase
          .from("workout_locations")
          .update({ image_url: data.imageUrl })
          .eq("id", locationId);
      }

      queryClient.invalidateQueries({ queryKey: ["workout-locations"] });
      toast.success("Location image generated!");
    } catch (error: any) {
      console.error("Failed to generate location image:", error);
      toast.error("Failed to generate image: " + (error.message || "Unknown error"));
    } finally {
      setGeneratingLocationImage(null);
    }
  };

  // Open lightbox with image
  const openLightbox = (imageUrl: string, caption?: string) => {
    setLightboxImages([{ image_url: imageUrl, caption }]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  // Generate pack image in dialog
  const handleGenerateDialogImage = async () => {
    if (!packImagePrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setGeneratingDialogImage(true);
    try {
      const prompt = `A beautiful promotional image for a workout location pack: "${packImagePrompt}". Show a scenic collage or overview representing this destination. Photorealistic, vibrant colors, inspiring travel photography style. Square format, high quality.`;
      
      const { data, error } = await supabase.functions.invoke("generate-workout-location-image", {
        body: { prompt },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.imageUrl) {
        setPackForm(prev => ({ ...prev, image_url: data.imageUrl }));
        toast.success("Image generated!");
      }
    } catch (error: any) {
      console.error("Failed to generate image:", error);
      toast.error("Failed to generate image: " + (error.message || "Unknown error"));
    } finally {
      setGeneratingDialogImage(false);
    }
  };

  const getLocationCount = (packId: string) => {
    return (locationsByPack[packId] || []).length;
  };

  if (packsLoading || locationsLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Workout Location Packs</h3>
          <p className="text-sm text-muted-foreground">
            Click on a pack to view and manage its locations
          </p>
        </div>
        <Button onClick={() => { resetPackForm(); setEditingPack(null); setPackDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pack
        </Button>
      </div>

      {/* Packs Accordion */}
      {packs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No location packs yet. Create your first pack to get started.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {packs.map((pack) => {
            const packLocations = locationsByPack[pack.id] || [];
            const isGenerating = generatingPackImage === pack.id;
            
            return (
              <AccordionItem key={pack.id} value={pack.id} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Pack Image - clickable to expand */}
                    <div 
                      className={`relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 ${pack.image_url ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : ""}`}
                      onClick={(e) => {
                        if (pack.image_url) {
                          e.stopPropagation();
                          openLightbox(pack.image_url, pack.name);
                        }
                      }}
                    >
                      {pack.image_url ? (
                        <img 
                          src={pack.image_url} 
                          alt={pack.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      {isGenerating && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    {/* Pack Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${!pack.is_active ? "text-muted-foreground" : ""}`}>
                          {pack.name}
                        </span>
                        {!pack.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {packLocations.length} locations
                        <span className="mx-1">•</span>
                        {pack.is_free ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            {pack.price_coins}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pack Actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => generatePackImage(pack.id, pack.name)}
                        disabled={isGenerating}
                        title={pack.image_url ? "Regenerate pack image" : "Generate pack image"}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => togglePackActive.mutate({ id: pack.id, is_active: !pack.is_active })}
                        title={pack.is_active ? "Deactivate" : "Activate"}
                      >
                        {pack.is_active ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEditPack(pack)} title="Edit pack">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeletePackId(pack.id)} title="Delete pack">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  {pack.description && (
                    <p className="text-sm text-muted-foreground mb-4">{pack.description}</p>
                  )}

                  {/* Quick Add Location */}
                  <div className="flex gap-2 mb-4">
                    {addingLocationToPackId === pack.id ? (
                      <>
                        <Input
                          placeholder="Location name (e.g., Waikiki Beach)"
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleQuickAddLocation(pack.id);
                            } else if (e.key === "Escape") {
                              setAddingLocationToPackId(null);
                              setNewLocationName("");
                            }
                          }}
                          autoFocus
                        />
                        <Button 
                          onClick={() => handleQuickAddLocation(pack.id)}
                          disabled={addingLocation}
                        >
                          {addingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setAddingLocationToPackId(null);
                            setNewLocationName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddingLocationToPackId(pack.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    )}
                  </div>

                  {/* Locations List */}
                  {packLocations.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                      No locations in this pack yet
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {packLocations.map((location) => (
                        <div 
                          key={location.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${!location.is_active ? "opacity-60 bg-muted/30" : "bg-card"}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Location Image - clickable to expand */}
                            <div 
                              className={`relative w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden ${location.image_url ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : ""}`}
                              onClick={() => {
                                if (location.image_url) {
                                  openLightbox(location.image_url, location.name);
                                }
                              }}
                            >
                              {location.image_url ? (
                                <img 
                                  src={location.image_url} 
                                  alt={location.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              {generatingLocationImage === location.id && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{location.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{location.prompt_text}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            {/* Generate location image button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => generateLocationImage(location.id, location.name, location.prompt_text)}
                              disabled={generatingLocationImage === location.id}
                              title={location.image_url ? "Regenerate image" : "Generate image"}
                            >
                              {generatingLocationImage === location.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleLocationActive.mutate({ id: location.id, is_active: !location.is_active })}
                              title={location.is_active ? "Deactivate" : "Activate"}
                            >
                              {location.is_active ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEditLocation(location)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteLocationId(location.id)} title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Unassigned Locations */}
      {locationsByPack["unassigned"] && locationsByPack["unassigned"].length > 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Unassigned Locations ({locationsByPack["unassigned"].length})
            </h4>
            <div className="grid gap-2">
              {locationsByPack["unassigned"].map((location) => (
                <div 
                  key={location.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${!location.is_active ? "opacity-60" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{location.prompt_text}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button size="icon" variant="ghost" onClick={() => openEditLocation(location)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteLocationId(location.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pack Dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPack ? "Edit Pack" : "Create Pack"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); savePack.mutate({ ...packForm, id: editingPack?.id }); }} className="space-y-4">
            <div>
              <Label>Pack Name</Label>
              <Input
                value={packForm.name}
                onChange={(e) => {
                  setPackForm({ ...packForm, name: e.target.value });
                  if (!packImagePrompt) setPackImagePrompt(e.target.value);
                }}
                placeholder="e.g., Hawaii Adventure"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={packForm.description}
                onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                placeholder="Describe this location pack..."
                rows={2}
              />
            </div>

            {/* AI Image Generation */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Generate Pack Image with AI
              </Label>
              <div className="flex gap-2">
                <Input
                  value={packImagePrompt}
                  onChange={(e) => setPackImagePrompt(e.target.value)}
                  placeholder="Describe the pack image..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleGenerateDialogImage}
                  disabled={generatingDialogImage || !packImagePrompt.trim()}
                  variant="secondary"
                >
                  {generatingDialogImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {packForm.image_url && (
                <div className="relative">
                  <img 
                    src={packForm.image_url} 
                    alt="Pack preview" 
                    className="w-full max-w-xs mx-auto rounded border"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Image URL (or use AI above)</Label>
              <Input
                value={packForm.image_url}
                onChange={(e) => setPackForm({ ...packForm, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Pricing */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Free Pack
                </Label>
                <Switch
                  checked={packForm.is_free}
                  onCheckedChange={(checked) => setPackForm({ ...packForm, is_free: checked })}
                />
              </div>
              {!packForm.is_free && (
                <div>
                  <Label>Price (coins)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={packForm.price_coins}
                    onChange={(e) => setPackForm({ ...packForm, price_coins: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={packForm.is_active}
                onCheckedChange={(checked) => setPackForm({ ...packForm, is_active: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPackDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savePack.isPending}>
                {savePack.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingPack ? "Save Changes" : "Create Pack"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Create Location"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveLocation.mutate({ ...locationForm, id: editingLocation?.id }); }} className="space-y-4">
            <div>
              <Label>Pack</Label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={locationForm.pack_id}
                onChange={(e) => setLocationForm({ ...locationForm, pack_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>{pack.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Location Name</Label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="e.g., Waikiki Beach"
                required
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={locationForm.description}
                onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                placeholder="A brief description..."
                rows={2}
              />
            </div>

            <div>
              <Label>Prompt Text (for AI image generation)</Label>
              <Textarea
                value={locationForm.prompt_text}
                onChange={(e) => setLocationForm({ ...locationForm, prompt_text: e.target.value })}
                placeholder="Describe this location for AI image generation..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This text is used when generating workout images at this location.
              </p>
            </div>

            <div>
              <Label>Image URL (optional)</Label>
              <Input
                value={locationForm.image_url}
                onChange={(e) => setLocationForm({ ...locationForm, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={locationForm.is_active}
                onCheckedChange={(checked) => setLocationForm({ ...locationForm, is_active: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLocationDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveLocation.isPending}>
                {saveLocation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingLocation ? "Save Changes" : "Create Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Pack Confirmation */}
      <AlertDialog open={!!deletePackId} onOpenChange={() => setDeletePackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pack?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the pack and unassign all its locations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePackId && deletePack.mutate(deletePackId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Location Confirmation */}
      <AlertDialog open={!!deleteLocationId} onOpenChange={() => setDeleteLocationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteLocationId && deleteLocation.mutate(deleteLocationId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={() => setLightboxIndex((i) => Math.max(0, i - 1))}
        onNext={() => setLightboxIndex((i) => Math.min(lightboxImages.length - 1, i + 1))}
      />
    </div>
  );
};
