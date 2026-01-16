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
import { Plus, Edit, Trash2, MapPin, Package, Coins, Eye, EyeOff, Wand2, Loader2, Sparkles, Shuffle } from "lucide-react";
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

// Predefined location pack themes for randomization with keywords for similarity matching
const packThemes = [
  { name: "Beach Paradise", description: "Sun-soaked beaches and coastal workouts", locations: ["Malibu Beach", "Caribbean Shore", "Tropical Lagoon", "Sunset Pier", "Sandy Cove", "Driftwood Bay", "Surf Break Point", "Tidal Pool Cove"], keywords: ["beach", "ocean", "coastal", "shore", "sand", "waves", "seaside", "surf"] },
  { name: "Mountain Adventures", description: "Epic mountain peaks and alpine trails", locations: ["Rocky Summit", "Alpine Meadow", "Forest Trail", "Misty Peaks", "Valley View", "Eagle's Nest Lookout", "Granite Ridge", "Wildflower Plateau"], keywords: ["mountain", "peak", "alpine", "summit", "hiking", "trail", "climb", "rocky"] },
  { name: "Urban Fitness", description: "City rooftops and urban workout spots", locations: ["Rooftop Gym", "City Park", "Downtown Plaza", "Industrial Loft", "Street Corner", "Skyline Terrace", "Neon Alley", "Parking Deck Sunrise"], keywords: ["city", "urban", "rooftop", "downtown", "street", "metro", "skyline", "industrial"] },
  { name: "Forest Retreat", description: "Peaceful woodland and nature settings", locations: ["Enchanted Forest", "Woodland Clearing", "Riverside Path", "Bamboo Grove", "Oak Sanctuary", "Fern Hollow", "Mossy Glen", "Ancient Redwoods"], keywords: ["forest", "woodland", "trees", "woods", "grove", "nature", "green", "foliage"] },
  { name: "Desert Oasis", description: "Stunning desert landscapes and sunsets", locations: ["Red Rock Canyon", "Desert Dunes", "Cactus Garden", "Sunrise Mesa", "Sand Valley", "Mirage Springs", "Pueblo Ruins", "Joshua Tree Grove"], keywords: ["desert", "sand", "dunes", "cactus", "arid", "mesa", "canyon", "dry"] },
  { name: "Tropical Paradise", description: "Lush jungles and exotic destinations", locations: ["Jungle Waterfall", "Palm Beach", "Volcanic Island", "Rainforest Path", "Coconut Grove", "Hidden Lagoon", "Parrot Perch", "Orchid Cliff"], keywords: ["tropical", "jungle", "rainforest", "palm", "exotic", "island", "lush", "paradise"] },
  { name: "Winter Wonderland", description: "Snowy landscapes and cozy settings", locations: ["Frozen Lake", "Ski Lodge", "Snow Valley", "Ice Cave", "Mountain Cabin", "Snowdrift Trail", "Frost Pine Forest", "Aurora Overlook"], keywords: ["winter", "snow", "ice", "frozen", "cold", "ski", "arctic", "frost"] },
  { name: "Zen Gardens", description: "Peaceful Asian-inspired locations", locations: ["Japanese Garden", "Bamboo Temple", "Koi Pond", "Zen Courtyard", "Cherry Blossom Park", "Moon Bridge", "Rock Garden Sanctuary", "Pagoda Terrace"], keywords: ["zen", "japanese", "asian", "garden", "temple", "meditation", "peaceful", "bamboo"] },
  { name: "Space Station", description: "Futuristic space and sci-fi environments", locations: ["Orbital Gym", "Moon Base", "Space Deck", "Galaxy View", "Asteroid Platform", "Nebula Observation", "Zero-G Chamber", "Mars Colony Dome"], keywords: ["space", "galaxy", "moon", "orbit", "futuristic", "sci-fi", "cosmic", "stellar"] },
  { name: "Underwater World", description: "Ocean depths and aquatic scenes", locations: ["Coral Reef", "Deep Sea Trench", "Underwater Cave", "Kelp Forest", "Sunken Temple", "Bioluminescent Abyss", "Mermaid Grotto", "Shipwreck Garden"], keywords: ["underwater", "ocean", "reef", "deep", "aquatic", "marine", "sea", "diving"] },
  { name: "Safari Adventure", description: "African savanna and wildlife", locations: ["Savanna Sunrise", "Watering Hole", "Acacia Tree", "Safari Camp", "Lion Rock", "Elephant Trail", "Sunset Kopje", "Baobab Grove"], keywords: ["safari", "savanna", "africa", "wildlife", "serengeti", "animal", "wild", "plains"] },
  { name: "Mediterranean Coast", description: "Greek islands and coastal villages", locations: ["Santorini Terrace", "Greek Temple", "Olive Grove", "Coastal Cliff", "Harbor Town", "Whitewashed Chapel", "Vineyard Vista", "Azure Cove"], keywords: ["mediterranean", "greek", "santorini", "european", "coastal", "villa", "harbor", "aegean"] },
  { name: "Ancient Temples", description: "Historic ruins and sacred monuments", locations: ["Mayan Pyramid", "Egyptian Temple", "Roman Colosseum", "Angkor Wat", "Stonehenge", "Petra Canyon", "Machu Picchu", "Parthenon Steps"], keywords: ["ancient", "temple", "ruins", "historic", "monument", "pyramid", "archaeological", "sacred"] },
  { name: "Nordic Fjords", description: "Scandinavian landscapes and aurora views", locations: ["Fjord Vista", "Viking Village", "Aurora Lake", "Glacier Bay", "Nordic Forest", "Stave Church", "Midnight Sun Cliff", "Reindeer Meadow"], keywords: ["nordic", "scandinavian", "fjord", "aurora", "viking", "norway", "sweden", "finland"] },
  { name: "Countryside Farm", description: "Rural landscapes and pastoral scenes", locations: ["Rolling Hills", "Vineyard Path", "Barn Sunrise", "Meadow Stream", "Harvest Field", "Sunflower Valley", "Apple Orchard", "Stone Wall Trail"], keywords: ["farm", "rural", "countryside", "pastoral", "barn", "vineyard", "meadow", "agriculture"] },
  { name: "Volcano Islands", description: "Dramatic volcanic landscapes", locations: ["Lava Fields", "Crater Lake", "Volcanic Beach", "Magma Glow", "Sulfur Springs", "Obsidian Cliffs", "Steam Vents", "Ash Plateau"], keywords: ["volcano", "lava", "volcanic", "crater", "magma", "eruption", "geothermal", "hot springs"] },
  { name: "Crystal Caves", description: "Underground caverns and crystal formations", locations: ["Crystal Chamber", "Underground Lake", "Glowing Grotto", "Stalactite Hall", "Gem Cavern", "Amethyst Cathedral", "Echo Pool", "Diamond Corridor"], keywords: ["cave", "crystal", "underground", "cavern", "grotto", "stalactite", "gem", "subterranean"] },
  { name: "Floating Islands", description: "Fantasy floating landscapes in the sky", locations: ["Sky Garden", "Cloud Platform", "Floating Temple", "Aerial Falls", "Sky Bridge", "Rainbow Archipelago", "Wind Dancer Peak", "Celestial Spire"], keywords: ["floating", "sky", "aerial", "fantasy", "cloud", "flying", "levitating", "airborne"] },
  { name: "Enchanted Meadow", description: "Magical flower fields and fairy gardens", locations: ["Flower Sea", "Butterfly Garden", "Rainbow Field", "Fairy Ring", "Blossom Valley", "Lavender Dreams", "Dewdrop Glade", "Moonflower Hollow"], keywords: ["meadow", "flower", "fairy", "magical", "enchanted", "butterfly", "blossom", "whimsical"] },
  { name: "Sunset Cliffs", description: "Dramatic coastal cliffs at golden hour", locations: ["Golden Bluff", "Sunset Point", "Coastal Edge", "Twilight Terrace", "Horizon View", "Amber Crest", "Dusk Overlook", "Crimson Bay"], keywords: ["cliff", "sunset", "golden", "bluff", "horizon", "twilight", "dramatic", "edge"] },
  { name: "Bamboo Paradise", description: "Serene bamboo forests of Asia", locations: ["Bamboo Cathedral", "Panda Trail", "Green Tunnel", "Misty Bamboo", "Jade Forest", "Silent Path", "Bamboo Bridge", "Dragon's Den"], keywords: ["bamboo", "panda", "china", "green", "jade", "oriental", "tranquil", "serene"] },
  { name: "Rainforest Canopy", description: "Elevated platforms in dense jungle", locations: ["Canopy Walk", "Treehouse Gym", "Rope Bridge", "Jungle Platform", "Treetop Vista", "Monkey Lookout", "Vine Swing Station", "Emerald Perch"], keywords: ["rainforest", "canopy", "treehouse", "jungle", "elevated", "treetop", "amazon", "dense"] },
  { name: "Glacial Peaks", description: "Icy mountain summits and glaciers", locations: ["Ice Peak", "Glacier Trail", "Frozen Summit", "Snow Cap", "Crystal Peak", "Crevasse Bridge", "Icefall Vista", "Polar Ridge"], keywords: ["glacier", "icy", "frozen", "peak", "ice cap", "permafrost", "glacial", "frigid"] },
  { name: "Bioluminescent Bay", description: "Glowing waters and magical nights", locations: ["Glowing Beach", "Light Waters", "Phosphor Cove", "Star Bay", "Neon Shore", "Firefly Lagoon", "Luminous Cave", "Starlight Dock"], keywords: ["bioluminescent", "glow", "phosphorescent", "neon", "luminous", "night", "glowing", "radiant"] },
  { name: "Scottish Highlands", description: "Misty moors and rugged castles", locations: ["Highland Moor", "Castle Ruins", "Loch View", "Misty Glen", "Heather Field", "Stone Circle", "Croft Cottage", "Whisky Trail"], keywords: ["scottish", "highlands", "moor", "castle", "loch", "celtic", "heather", "rugged"] },
  { name: "Tropical Reef", description: "Vibrant underwater coral ecosystems", locations: ["Rainbow Reef", "Fish School", "Sea Turtle Cove", "Anemone Garden", "Coral Canyon", "Dolphin Passage", "Stingray Flats", "Seahorse Meadow"], keywords: ["reef", "coral", "tropical", "fish", "snorkel", "marine", "aquarium", "ecosystem"] },
  { name: "Autumn Forest", description: "Fall foliage and harvest colors", locations: ["Maple Grove", "Golden Path", "Leaf Stream", "Autumn Cabin", "Harvest Trail", "Pumpkin Patch", "Crimson Canopy", "Amber Falls"], keywords: ["autumn", "fall", "foliage", "maple", "harvest", "leaves", "orange", "seasonal"] },
  { name: "Mystic Swamp", description: "Mysterious wetlands with Spanish moss", locations: ["Bayou Trail", "Cypress Grove", "Misty Marsh", "Mangrove Maze", "Swamp Sunset", "Heron Hollow", "Gator Bank", "Moonlit Bog"], keywords: ["swamp", "bayou", "marsh", "wetland", "cypress", "moss", "mysterious", "murky"] },
];

// Individual location ideas for randomization
const locationIdeas = [
  { name: "Sunrise Beach", prompt: "A beautiful beach at sunrise with golden light reflecting on calm waves, palm trees in the background" },
  { name: "Mountain Summit", prompt: "A breathtaking mountain peak with panoramic views, snow-capped peaks in the distance" },
  { name: "City Rooftop", prompt: "A modern rooftop terrace with city skyline views, sunset lighting" },
  { name: "Forest Clearing", prompt: "A peaceful forest clearing with dappled sunlight, surrounded by tall trees" },
  { name: "Desert Canyon", prompt: "A dramatic red rock canyon at golden hour, layered rock formations" },
  { name: "Tropical Waterfall", prompt: "A stunning tropical waterfall surrounded by lush greenery, mist rising" },
  { name: "Zen Garden", prompt: "A serene Japanese zen garden with raked sand, bonsai trees, and stone lanterns" },
  { name: "Alpine Meadow", prompt: "A colorful alpine meadow with wildflowers, snow-capped mountains in background" },
  { name: "Ocean Cliff", prompt: "A dramatic cliff overlooking the ocean, waves crashing below" },
  { name: "Bamboo Forest", prompt: "A mystical bamboo forest with tall green stalks, filtered sunlight" },
  { name: "Sunset Pier", prompt: "A wooden pier extending into calm water, vibrant sunset colors" },
  { name: "Volcano View", prompt: "A tropical location with an active volcano in the distance, dramatic sky" },
  { name: "Northern Lights", prompt: "An arctic landscape with aurora borealis dancing in the night sky" },
  { name: "Ancient Ruins", prompt: "Ancient Greek or Roman ruins at golden hour, columns and arches" },
  { name: "Coral Reef", prompt: "A vibrant underwater coral reef scene with colorful fish and sea life" },
  { name: "Rice Terraces", prompt: "Beautiful green rice terraces on hillside, traditional Asian landscape" },
  { name: "Safari Savanna", prompt: "African savanna at sunset with acacia trees, warm golden lighting" },
  { name: "Glacier Lake", prompt: "A turquoise glacier lake surrounded by mountains, crystal clear water" },
  { name: "Cherry Blossoms", prompt: "A path lined with cherry blossom trees in full bloom, pink petals floating" },
  { name: "Space Station", prompt: "A futuristic space station gym with Earth visible through large windows" },
];

// Helper function to check if a theme is similar to existing packs
const isThemeSimilarToExisting = (theme: typeof packThemes[0], existingPacks: LocationPack[]): boolean => {
  const existingNamesLower = existingPacks.map(p => p.name.toLowerCase());
  const existingDescLower = existingPacks.map(p => (p.description || "").toLowerCase());
  const allExistingText = [...existingNamesLower, ...existingDescLower].join(" ");
  
  // Check exact name match
  if (existingNamesLower.includes(theme.name.toLowerCase())) {
    return true;
  }
  
  // Check keyword overlap - if any existing pack contains 2+ keywords from this theme
  const matchingKeywords = theme.keywords.filter(keyword => 
    allExistingText.includes(keyword.toLowerCase())
  );
  
  if (matchingKeywords.length >= 2) {
    return true;
  }
  
  // Check if theme name words appear in existing packs
  const themeWords = theme.name.toLowerCase().split(/\s+/);
  const significantMatches = themeWords.filter(word => 
    word.length > 3 && allExistingText.includes(word)
  );
  
  if (significantMatches.length > 0) {
    return true;
  }
  
  return false;
};

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
  
  // Complete pack generation state
  const [generatingCompletePack, setGeneratingCompletePack] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ step: "", current: 0, total: 0 });
  const [selectedPackTheme, setSelectedPackTheme] = useState<typeof packThemes[0] | null>(null);

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
    setSelectedPackTheme(null);
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

  // Randomize pack form with a theme that's dissimilar to existing packs
  const handleRandomizePack = () => {
    // Filter out themes that are similar to existing packs
    const dissimilarThemes = packThemes.filter(theme => !isThemeSimilarToExisting(theme, packs));
    
    if (dissimilarThemes.length === 0) {
      toast.info("All unique themes have been used!", {
        description: "Consider creating custom pack themes or the list will cycle through existing ones.",
      });
      // Fall back to any theme if all are similar
      const randomTheme = packThemes[Math.floor(Math.random() * packThemes.length)];
      setPackForm(prev => ({
        ...prev,
        name: randomTheme.name,
        description: randomTheme.description,
        is_active: true,
      }));
      setPackImagePrompt(randomTheme.name);
      setSelectedPackTheme(randomTheme);
      return;
    }
    
    const randomTheme = dissimilarThemes[Math.floor(Math.random() * dissimilarThemes.length)];
    
    setPackForm(prev => ({
      ...prev,
      name: randomTheme.name,
      description: randomTheme.description,
      is_active: true,
    }));
    setPackImagePrompt(randomTheme.name);
    setSelectedPackTheme(randomTheme);
    
    toast.success(`Randomized: ${randomTheme.name}`, {
      description: `${randomTheme.locations.length} locations • ${dissimilarThemes.length - 1} more unique themes available`,
    });
  };

  // Randomize location form with a location idea
  const handleRandomizeLocation = () => {
    const usedNames = new Set(locations.map(l => l.name.toLowerCase()));
    const availableLocations = locationIdeas.filter(l => !usedNames.has(l.name.toLowerCase()));
    const pool = availableLocations.length > 0 ? availableLocations : locationIdeas;
    
    const randomLoc = pool[Math.floor(Math.random() * pool.length)];
    
    setLocationForm(prev => ({
      ...prev,
      name: randomLoc.name,
      prompt_text: randomLoc.prompt,
      description: "",
      is_active: true,
    }));
    
    toast.success(`Randomized: ${randomLoc.name}`);
  };

  // Generate a complete pack with locations and all images using the selected theme from the dialog
  const handleGenerateCompletePack = async () => {
    if (!selectedPackTheme) {
      toast.error("Please click 'Randomize Pack' first to select a theme");
      return;
    }
    
    if (!packForm.name.trim()) {
      toast.error("Pack name is required");
      return;
    }
    
    setGeneratingCompletePack(true);
    setPackDialogOpen(false);
    
    try {
      const theme = selectedPackTheme;
      const locationCount = theme.locations.length;
      
      // Step 1: Create the pack
      setGenerationProgress({ step: `Creating pack: ${packForm.name}...`, current: 0, total: locationCount + 2 });
      
      const { data: newPack, error: packError } = await supabase
        .from("workout_location_packs")
        .insert({
          name: packForm.name,
          description: packForm.description || null,
          image_url: packForm.image_url || null,
          is_free: packForm.is_free,
          is_active: packForm.is_active,
          display_order: packs.length,
          price_coins: packForm.price_coins,
        })
        .select()
        .single();
      
      if (packError) throw packError;
      
      // Step 2: Generate pack image if not already set
      if (!packForm.image_url) {
        setGenerationProgress({ step: "Generating pack cover image...", current: 1, total: locationCount + 2 });
        
        const packImagePromptText = `A beautiful promotional image for a workout location pack: "${packForm.name}". ${packForm.description || theme.description}. Show a scenic collage or overview representing this destination. Photorealistic, vibrant colors, inspiring travel photography style. Square format, high quality.`;
        
        const { data: packImageData, error: packImageError } = await supabase.functions.invoke("generate-workout-location-image", {
          body: { prompt: packImagePromptText, packId: newPack.id },
        });
        
        if (packImageError || packImageData?.error) {
          console.error("Pack image generation failed:", packImageError || packImageData?.error);
          // Continue without pack image
        }
      }
      
      // Step 3: Create locations with images
      for (let i = 0; i < locationCount; i++) {
        const locationName = theme.locations[i];
        setGenerationProgress({ 
          step: `Creating location ${i + 1}/${locationCount}: ${locationName}...`, 
          current: 2 + i, 
          total: locationCount + 2 
        });
        
        // Create the location
        const locationPrompt = `${locationName} in ${packForm.name}, beautiful scenic workout location, photorealistic, warm lighting, inspiring fitness environment`;
        
        const { data: newLocation, error: locError } = await supabase
          .from("workout_locations")
          .insert({
            pack_id: newPack.id,
            name: locationName,
            prompt_text: locationPrompt,
            is_active: true,
            display_order: i,
          })
          .select()
          .single();
        
        if (locError) {
          console.error(`Failed to create location ${locationName}:`, locError);
          continue;
        }
        
        // Generate image for this location
        setGenerationProgress({ 
          step: `Generating image for ${locationName}...`, 
          current: 2 + i, 
          total: locationCount + 2 
        });
        
        try {
          const { data: locImageData, error: locImageError } = await supabase.functions.invoke("generate-workout-location-image", {
            body: { prompt: locationPrompt, locationId: newLocation.id },
          });
          
          if (locImageData?.imageUrl && !locImageError) {
            await supabase
              .from("workout_locations")
              .update({ image_url: locImageData.imageUrl })
              .eq("id", newLocation.id);
          }
        } catch (imgError) {
          console.error(`Failed to generate image for ${locationName}:`, imgError);
          // Continue with next location
        }
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["workout-location-packs"] });
      queryClient.invalidateQueries({ queryKey: ["workout-locations"] });
      
      // Reset form state
      resetPackForm();
      setSelectedPackTheme(null);
      
      toast.success(`Created "${packForm.name}" with ${locationCount} locations!`, {
        description: "Pack and all location images generated successfully.",
      });
      
    } catch (error: any) {
      console.error("Failed to generate complete pack:", error);
      toast.error("Failed to generate pack: " + (error.message || "Unknown error"));
    } finally {
      setGeneratingCompletePack(false);
      setGenerationProgress({ step: "", current: 0, total: 0 });
    }
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
      {/* Generation Progress Banner */}
      {generatingCompletePack && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium text-primary">{generationProgress.step}</p>
                {generationProgress.total > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Step {generationProgress.current + 1} of {generationProgress.total}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          
          {/* Randomize Pack Button - only show for new packs */}
          {!editingPack && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRandomizePack}
              className="w-full"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Randomize Theme
            </Button>
          )}
          
          {/* Selected Theme Preview */}
          {selectedPackTheme && !editingPack && (
            <div className="border rounded-lg p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm text-primary">Theme Selected</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                This pack will include {selectedPackTheme.locations.length} locations:
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedPackTheme.locations.map((loc, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {loc}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setPackDialogOpen(false)}>
                Cancel
              </Button>
              {selectedPackTheme && !editingPack && (
                <Button 
                  type="button" 
                  onClick={handleGenerateCompletePack}
                  disabled={!packForm.name.trim()}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Complete Pack ({selectedPackTheme.locations.length} locations)
                </Button>
              )}
              <Button type="submit" disabled={savePack.isPending}>
                {savePack.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingPack ? "Save Changes" : "Create Pack Only"}
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
          
          {/* Randomize Location Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleRandomizeLocation}
            className="w-full"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Randomize Location (Fill All Details)
          </Button>
          
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
