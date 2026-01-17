import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LocationPickerProps {
  userId: string;
}

interface WorkoutLocation {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export const LocationPicker = ({ userId }: LocationPickerProps) => {
  const queryClient = useQueryClient();

  // Fetch all active locations
  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ["workout-locations-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_locations")
        .select("id, name, description, image_url, is_active")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as WorkoutLocation[];
    },
  });

  // Fetch user's enabled locations
  const { data: userLocations = [], isLoading: loadingUserLocations } = useQuery({
    queryKey: ["user-workout-locations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_locations")
        .select("location_id, is_enabled")
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Create a map of enabled locations
  const enabledLocationsMap = new Map(
    userLocations.map((ul) => [ul.location_id, ul.is_enabled])
  );

  // Toggle location
  const toggleMutation = useMutation({
    mutationFn: async ({ locationId, enabled }: { locationId: string; enabled: boolean }) => {
      // Check if user already has a record for this location
      const existingRecord = userLocations.find((ul) => ul.location_id === locationId);

      if (existingRecord) {
        const { error } = await supabase
          .from("user_workout_locations")
          .update({ is_enabled: enabled })
          .eq("user_id", userId)
          .eq("location_id", locationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_workout_locations")
          .insert({
            user_id: userId,
            location_id: locationId,
            is_enabled: enabled,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-workout-locations"] });
    },
    onError: () => {
      toast.error("Failed to update location preference");
    },
  });

  const isLocationEnabled = (locationId: string) => {
    // If user has a preference, use it
    if (enabledLocationsMap.has(locationId)) {
      return enabledLocationsMap.get(locationId);
    }
    // Default to enabled
    return true;
  };

  const enabledCount = locations.filter((loc) => isLocationEnabled(loc.id)).length;

  if (loadingLocations || loadingUserLocations) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Workout Locations
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {enabledCount} enabled
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Choose where your avatar can appear in generated images
        </p>
        
        <div className="space-y-3">
          {locations.map((location) => {
            const isEnabled = isLocationEnabled(location.id);
            
            return (
              <div
                key={location.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isEnabled ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
                )}
              >
                {/* Location Image */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {location.image_url ? (
                    <img
                      src={location.image_url}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Location Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{location.name}</p>
                  {location.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {location.description}
                    </p>
                  )}
                </div>

                {/* Toggle */}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => 
                    toggleMutation.mutate({ locationId: location.id, enabled: checked })
                  }
                  disabled={toggleMutation.isPending}
                />
              </div>
            );
          })}
        </div>

        {locations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No locations available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};