import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, MapPin, Package, Coins, Eye, EyeOff } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("packs");
  
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
  const [selectedPackFilter, setSelectedPackFilter] = useState<string>("all");

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

  const filteredLocations = selectedPackFilter === "all" 
    ? locations 
    : selectedPackFilter === "unassigned"
    ? locations.filter(l => !l.pack_id)
    : locations.filter(l => l.pack_id === selectedPackFilter);

  const getPackName = (packId: string | null) => {
    if (!packId) return "Unassigned";
    const pack = packs.find(p => p.id === packId);
    return pack?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="packs" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Location Packs
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            All Locations
          </TabsTrigger>
        </TabsList>

        {/* Location Packs Tab */}
        <TabsContent value="packs" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-muted-foreground">
              Create purchasable location packs like "Hawaii" or "City Adventures"
            </p>
            <Button onClick={() => { resetPackForm(); setEditingPack(null); setPackDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pack
            </Button>
          </div>

          {packsLoading ? (
            <p>Loading...</p>
          ) : packs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No location packs yet. Create your first pack to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => {
                const packLocations = locations.filter(l => l.pack_id === pack.id);
                return (
                  <Card key={pack.id} className={!pack.is_active ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{pack.name}</CardTitle>
                        <div className="flex items-center gap-2">
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
                          <Button size="icon" variant="outline" onClick={() => openEditPack(pack)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeletePackId(pack.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pack.description && (
                        <p className="text-sm text-muted-foreground mb-3">{pack.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          <MapPin className="h-3 w-3 mr-1" />
                          {packLocations.length} locations
                        </Badge>
                        {pack.is_free ? (
                          <Badge variant="outline" className="text-green-600">Free</Badge>
                        ) : (
                          <Badge variant="outline">
                            <Coins className="h-3 w-3 mr-1" />
                            {pack.price_coins} coins
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* All Locations Tab */}
        <TabsContent value="locations" className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Label>Filter by pack:</Label>
              <Select value={selectedPackFilter} onValueChange={setSelectedPackFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {packs.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { resetLocationForm(); setEditingLocation(null); setLocationDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>

          {locationsLoading ? (
            <p>Loading...</p>
          ) : filteredLocations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No locations found. Add locations to use in workout image generation.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredLocations.map((location) => (
                <Card key={location.id} className={!location.is_active ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{location.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {getPackName(location.pack_id)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{location.prompt_text}</p>
                        {location.description && (
                          <p className="text-xs text-muted-foreground mt-1">{location.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
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
                        <Button size="icon" variant="outline" onClick={() => openEditLocation(location)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteLocationId(location.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pack Dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPack ? "Edit Pack" : "Create Location Pack"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pack Name</Label>
              <Input
                value={packForm.name}
                onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                placeholder="e.g., Hawaii Adventure"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={packForm.description}
                onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                placeholder="Tropical beaches, volcanoes, and more..."
              />
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input
                value={packForm.image_url}
                onChange={(e) => setPackForm({ ...packForm, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={packForm.is_free}
                  onCheckedChange={(checked) => setPackForm({ ...packForm, is_free: checked })}
                />
                <Label>Free Pack</Label>
              </div>
              {!packForm.is_free && (
                <div className="flex-1">
                  <Label>Price (coins)</Label>
                  <Input
                    type="number"
                    value={packForm.price_coins}
                    onChange={(e) => setPackForm({ ...packForm, price_coins: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={packForm.is_active}
                onCheckedChange={(checked) => setPackForm({ ...packForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => savePack.mutate({ ...packForm, id: editingPack?.id })}
              disabled={!packForm.name || savePack.isPending}
            >
              {savePack.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Create Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location Pack (optional)</Label>
              <Select 
                value={locationForm.pack_id} 
                onValueChange={(value) => setLocationForm({ ...locationForm, pack_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pack..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Pack (Unassigned)</SelectItem>
                  {packs.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location Name</Label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="e.g., Waikiki Beach"
              />
            </div>
            <div>
              <Label>Prompt Text (used in AI generation)</Label>
              <Textarea
                value={locationForm.prompt_text}
                onChange={(e) => setLocationForm({ ...locationForm, prompt_text: e.target.value })}
                placeholder="e.g., on a sunny Hawaiian beach with palm trees and blue ocean waves"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This text is inserted into the AI prompt to describe where the character is exercising.
              </p>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={locationForm.description}
                onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                placeholder="Internal notes about this location"
              />
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input
                value={locationForm.image_url}
                onChange={(e) => setLocationForm({ ...locationForm, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={locationForm.is_active}
                onCheckedChange={(checked) => setLocationForm({ ...locationForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => saveLocation.mutate({ ...locationForm, id: editingLocation?.id })}
              disabled={!locationForm.name || !locationForm.prompt_text || saveLocation.isPending}
            >
              {saveLocation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pack Confirmation */}
      <AlertDialog open={!!deletePackId} onOpenChange={() => setDeletePackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location Pack?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete all locations within this pack. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePackId && deletePack.mutate(deletePackId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
            <AlertDialogAction
              onClick={() => deleteLocationId && deleteLocation.mutate(deleteLocationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
