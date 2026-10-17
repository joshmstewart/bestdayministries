import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface Suggestion {
  placeId: string;
  text: string;
  main: string;
  secondary: string;
}

/**
 * Event location box. The text input is plain and always editable; Google
 * suggestions come from the `places-autocomplete` backend function and are
 * purely optional — Google never touches the input element itself.
 */
export function LocationAutocomplete({
  value,
  onChange,
  label = "Location",
  placeholder = "Place name or address",
  required = false,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const requestIdRef = useRef(0);
  const suggestionsDisabledRef = useRef(false);

  useEffect(() => {
    supabase
      .from("saved_locations")
      .select("id, name, address")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setSavedLocations(data);
      });
  }, []);

  useEffect(() => {
    if (value) {
      const match = savedLocations.find((l) => l.address === value);
      setSelectedLocationId(match?.id || "");
    } else {
      setSelectedLocationId("");
    }
  }, [value, savedLocations]);

  // Debounced backend suggestions; only for text the user typed.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3 || suggestionsDisabledRef.current) {
      setSuggestions([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("places-autocomplete", {
          body: { action: "autocomplete", input: text, sessionToken: sessionTokenRef.current },
        });
        if (requestId !== requestIdRef.current) return; // stale
        if (error) {
          // Stop asking for the rest of this visit on auth/config failures.
          const status = (error as { context?: { status?: number } })?.context?.status;
          if (status === 401 || status === 403 || status === 503) suggestionsDisabledRef.current = true;
          console.warn("Place suggestions unavailable:", error.message);
          setSuggestions([]);
          return;
        }
        setSuggestions(data?.suggestions ?? []);
        setActiveIndex(-1);
        setOpen(true);
      } catch (e) {
        console.warn("Place suggestions unavailable:", e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const pickSuggestion = async (s: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    setQuery("");
    requestIdRef.current++;
    // Show the suggestion text immediately; upgrade to full address if available.
    onChange(s.text);
    try {
      const { data } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "details", placeId: s.placeId, sessionToken: sessionTokenRef.current },
      });
      if (data?.value && inputRef.current?.value === s.text) onChange(data.value);
    } catch {
      // keep the suggestion text
    } finally {
      sessionTokenRef.current = crypto.randomUUID();
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="location">{label}</Label>}

      {savedLocations.length > 0 && (
        <Select
          value={selectedLocationId || (value ? "other" : "")}
          onValueChange={(locationId) => {
            if (locationId === "other") {
              setSelectedLocationId("");
              if (selectedLocationId) onChange("");
              inputRef.current?.focus();
              return;
            }
            const location = savedLocations.find((l) => l.id === locationId);
            if (location) {
              setSelectedLocationId(locationId);
              setOpen(false);
              onChange(location.address);
            }
          }}
        >
          <SelectTrigger aria-label="Saved location">
            <SelectValue placeholder="Select a saved location...">
              {selectedLocationId &&
                (() => {
                  const location = savedLocations.find((l) => l.id === selectedLocationId);
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
              {!selectedLocationId && value ? "Other place" : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="other">Other place</SelectItem>
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
      )}

      <div className="relative">
        <Input
          ref={inputRef}
          id="location"
          value={value}
          autoComplete="off"
          role="textbox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls="location-suggestions"
          onChange={(e) => {
            setSelectedLocationId("");
            onChange(e.target.value);
            setQuery(e.target.value);
          }}
          onBlur={(e) => {
            const current = e.target.value;
            if (current && current !== value) onChange(current);
            // Delay so a click on a suggestion still registers.
            setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, -1));
            } else if (e.key === "Enter" && activeIndex >= 0) {
              e.preventDefault();
              pickSuggestion(suggestions[activeIndex]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          required={required}
          className="pl-9"
        />
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        {showList && (
          <ul
            id="location-suggestions"
            role="listbox"
            aria-label="Place suggestions"
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md overflow-hidden"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.placeId}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(s);
                }}
                className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-sm ${
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{s.main}</span>
                  {s.secondary && <span className="text-xs text-muted-foreground">{s.secondary}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
