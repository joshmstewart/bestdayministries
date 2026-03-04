import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

interface SavedLocation {
  id: string;
  name: string;
  address: string;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  label = "Location",
  placeholder = "Search for a location...",
  required = false
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [fetchingKey, setFetchingKey] = useState(true);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  
  // Store onChange in a ref to avoid dependency issues
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Fetch saved locations
  useEffect(() => {
    const fetchSavedLocations = async () => {
      const { data, error } = await supabase
        .from("saved_locations")
        .select("id, name, address")
        .eq("is_active", true)
        .order("name");

      if (!error && data) {
        setSavedLocations(data);
      }
    };

    fetchSavedLocations();
  }, []);

  // Reset selected location ID when value changes externally (e.g., when editing an event)
  useEffect(() => {
    if (value) {
      // Check if current value matches a saved location
      const matchingLocation = savedLocations.find(l => l.address === value);
      setSelectedLocationId(matchingLocation?.id || "");
    } else {
      setSelectedLocationId("");
    }
  }, [value, savedLocations]);

  // Fetch API key from edge function
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-places-key');
        
        if (error) {
          console.error('Error from edge function:', error);
          throw error;
        }
        
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else {
          console.error('No API key in response:', data);
        }
      } catch (error) {
        console.error('Error fetching Google Places API key:', error);
      } finally {
        setFetchingKey(false);
      }
    };
    
    fetchApiKey();
  }, []);

  // Load Google Maps script with our custom hook
  const { isLoaded, loadError } = useGoogleMapsScript(apiKey);

  const hasValidKey = apiKey && apiKey !== "PLACEHOLDER";

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !hasValidKey) {
      return;
    }

    // Prevent re-initialization if autocomplete already exists
    if (autocompleteRef.current || isInitialized) {
      return;
    }

    // Initialize autocomplete
    const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["establishment", "geocode"],
      fields: ["formatted_address", "name", "geometry"],
    });

    // Listen for place selection - use ref to avoid stale closure
    // CRITICAL: Only update state if the user actually selected a suggestion.
    // Google fires place_changed even when the user just clicks away without
    // selecting anything — in that case getPlace() returns an object WITHOUT
    // place_id. We must NOT overwrite manual input in that scenario.
    autocompleteInstance.addListener("place_changed", () => {
      const place = autocompleteInstance.getPlace();
      
      // place_id is ONLY present when the user clicked a suggestion.
      // Without it, this is a spurious fire — preserve the current value.
      if (!place.place_id) {
        return;
      }
      
      if (place.formatted_address) {
        onChangeRef.current(place.formatted_address);
      } else if (place.name) {
        onChangeRef.current(place.name);
      }
    });

    autocompleteRef.current = autocompleteInstance;
    setIsInitialized(true);

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, hasValidKey, isInitialized]);

  if (loadError) {
    console.error("Error loading Google Maps:", loadError);
    return (
      <div className="space-y-2">
        {label && <Label htmlFor="location">{label}</Label>}
        <Input
          id="location"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
        <p className="text-xs text-muted-foreground">
          Location autocomplete unavailable. You can still enter locations manually.
        </p>
      </div>
    );
  }

  if (fetchingKey || (!isLoaded && hasValidKey)) {
    return (
      <div className="space-y-2">
        {label && <Label htmlFor="location">{label}</Label>}
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <MapPin className="w-4 h-4 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            {fetchingKey ? 'Fetching API key...' : 'Loading location search...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="location">{label}</Label>}
      
      {savedLocations.length > 0 && (
        <div className="space-y-2">
          <Select
            value={selectedLocationId}
            onValueChange={(locationId) => {
              const location = savedLocations.find(l => l.id === locationId);
              if (location) {
                setSelectedLocationId(locationId);
                onChange(location.address);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a saved location...">
                {selectedLocationId && (() => {
                  const location = savedLocations.find(l => l.id === selectedLocationId);
                  return location ? (
                    <div className="flex items-start gap-2 text-left">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium">{location.name}</span>
                        <span className="text-xs text-muted-foreground">{location.address}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {savedLocations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium">{location.name}</span>
                      <span className="text-xs text-muted-foreground">{location.address}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="location"
          value={value}
          onChange={(e) => {
            // Clear saved location selection when manually typing
            setSelectedLocationId("");
            onChange(e.target.value);
          }}
          onBlur={(e) => {
            // On blur, sync whatever is in the actual DOM input to React state
            // This catches cases where Google Autocomplete modified the input value
            // without triggering React's onChange
            const currentInputValue = e.target.value;
            if (currentInputValue && currentInputValue !== value) {
              onChange(currentInputValue);
            }
          }}
          onKeyDown={(e) => {
            // Prevent Google Autocomplete from eating the Enter key
            // when the user wants to submit the form with a manual address
            if (e.key === 'Enter') {
              // If the pac-container (autocomplete dropdown) is NOT visible,
              // let the form submit normally with the manual value
              const pacContainer = document.querySelector('.pac-container');
              const isDropdownVisible = pacContainer && 
                window.getComputedStyle(pacContainer).display !== 'none' &&
                pacContainer.querySelectorAll('.pac-item').length > 0;
              
              if (!isDropdownVisible) {
                // Sync the current input value to React state
                const currentInputValue = inputRef.current?.value;
                if (currentInputValue && currentInputValue !== value) {
                  onChange(currentInputValue);
                }
              }
            }
          }}
          placeholder={placeholder}
          required={required}
          className="pl-9"
        />
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      {!value && (
        <p className="text-xs text-muted-foreground">
          {savedLocations.length > 0 
            ? "Select a saved location above or search for a new one"
            : "Start typing to search for a location"}
        </p>
      )}
    </div>
  );
}
