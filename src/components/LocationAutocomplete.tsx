import { useEffect, useRef, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const libraries: ("places")[] = ["places"];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  label = "Location",
  placeholder = "Search for a location...",
  required = false
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [fetchingKey, setFetchingKey] = useState(true);

  // Fetch API key from edge function
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        console.log('Fetching Google Places API key...');
        const { data, error } = await supabase.functions.invoke('get-google-places-key');
        
        if (error) {
          console.error('Error from edge function:', error);
          throw error;
        }
        
        if (data?.apiKey) {
          console.log('API key fetched successfully');
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

  // Load Google Maps script with Places library - only when we have the API key
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !apiKey) return;

    // Initialize autocomplete
    const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["establishment", "geocode"],
      fields: ["formatted_address", "name", "geometry"],
    });

    // Listen for place selection
    autocompleteInstance.addListener("place_changed", () => {
      const place = autocompleteInstance.getPlace();
      
      if (place.formatted_address) {
        onChange(place.formatted_address);
      } else if (place.name) {
        onChange(place.name);
      }
    });

    setAutocomplete(autocompleteInstance);

    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [isLoaded, onChange, apiKey]);

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

  if (fetchingKey || (!isLoaded && apiKey)) {
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
      <div className="relative">
        <Input
          ref={inputRef}
          id="location"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="pl-9"
        />
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">
        Start typing to search for a location
      </p>
    </div>
  );
}
