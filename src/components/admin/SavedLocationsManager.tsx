import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";
import { Plus, Trash2, Edit, MapPin, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SavedLocation {
  id: string;
  name: string;
  address: string;
  hours: string | null;
  hours_vary_seasonally: boolean;
  is_active: boolean;
  created_at: string;
}

export const SavedLocationsManager = () => {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [hoursVarySeasonally, setHoursVarySeasonally] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_locations")
      .select("*")
      .order("name");

    if (error) {
      showErrorToastWithCopy("Loading saved locations", error);
      console.error(error);
    } else {
      setLocations(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setAddress("");
    setHours("");
    setHoursVarySeasonally(false);
    setEditingLocation(null);
    setShowDialog(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim()) {
      showErrorToast("Please fill in all fields");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const locationData = {
      name: name.trim(),
      address: address.trim(),
      hours: hours.trim() || null,
      hours_vary_seasonally: hoursVarySeasonally,
      created_by: user.id,
    };

    if (editingLocation) {
      const { error } = await supabase
        .from("saved_locations")
        .update(locationData)
        .eq("id", editingLocation.id);

      if (error) {
        showErrorToastWithCopy("Updating location", error);
        console.error(error);
      } else {
        toast.success("Location updated successfully");
        resetForm();
        loadLocations();
      }
    } else {
      const { error } = await supabase
        .from("saved_locations")
        .insert(locationData);

      if (error) {
        showErrorToastWithCopy("Creating location", error);
        console.error(error);
      } else {
        toast.success("Location created successfully");
        resetForm();
        loadLocations();
      }
    }
  };

  const handleEdit = (location: SavedLocation) => {
    setEditingLocation(location);
    setName(location.name);
    setAddress(location.address);
    setHours(location.hours || "");
    setHoursVarySeasonally(location.hours_vary_seasonally || false);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    const { error } = await supabase
      .from("saved_locations")
      .delete()
      .eq("id", id);

    if (error) {
      showErrorToastWithCopy("Deleting location", error);
      console.error(error);
    } else {
      toast.success("Location deleted successfully");
      loadLocations();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("saved_locations")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      showErrorToastWithCopy("Toggling location", error);
      console.error(error);
    } else {
      toast.success(isActive ? "Location activated" : "Location deactivated");
      loadLocations();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading locations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Saved Locations</CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? "Edit Location" : "Add New Location"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Best Day Ever Coffee and Crepes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-3pm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hoursVarySeasonally"
                    checked={hoursVarySeasonally}
                    onChange={(e) => setHoursVarySeasonally(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="hoursVarySeasonally" className="text-sm font-normal cursor-pointer">
                    Hours may vary seasonally
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingLocation ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No saved locations yet. Add your first location to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{location.name}</h3>
                  <p className="text-sm text-muted-foreground break-words">
                    {location.address}
                  </p>
                  {location.hours && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Hours:</span> {location.hours}
                      {location.hours_vary_seasonally && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Hours vary seasonally
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleToggleActive(location.id, !location.is_active)}
                    title={location.is_active ? "Deactivate" : "Activate"}
                    className={location.is_active ? 
                      "bg-green-100 hover:bg-green-200 border-green-300" : 
                      "bg-red-100 hover:bg-red-200 border-red-300"}
                  >
                    {location.is_active ? (
                      <Eye className="w-4 h-4 text-green-700" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-red-700" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(location)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
