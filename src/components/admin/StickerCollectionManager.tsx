import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Upload, Eye, EyeOff, Sparkles, GripVertical, X, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { removeBackground as removeBg, loadImage } from "@/lib/removeBackground";
import { ScratchCardDialog } from "@/components/ScratchCardDialog";
import { PackOpeningDialog } from "@/components/PackOpeningDialog";
import { DefaultRaritySettings } from "./DefaultRaritySettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type UserRole = "supporter" | "bestie" | "caregiver" | "moderator" | "admin" | "owner";

const USER_ROLES = [
  { value: "supporter" as UserRole, label: "Supporter" },
  { value: "bestie" as UserRole, label: "Bestie" },
  { value: "caregiver" as UserRole, label: "Caregiver" },
  { value: "admin" as UserRole, label: "Admin" },
  { value: "owner" as UserRole, label: "Owner" },
];

// Import all Halloween stickers
import pumpkin from "@/assets/stickers/halloween/01-smiling-pumpkin.png";
import ghost from "@/assets/stickers/halloween/02-friendly-ghost.png";
import candyCorn from "@/assets/stickers/halloween/03-candy-corn.png";
import bat from "@/assets/stickers/halloween/04-happy-bat.png";
import cat from "@/assets/stickers/halloween/05-kawaii-cat.png";
import witchHat from "@/assets/stickers/halloween/06-witch-hat.png";
import spider from "@/assets/stickers/halloween/07-friendly-spider.png";
import skeleton from "@/assets/stickers/halloween/08-sweet-skeleton.png";
import mummy from "@/assets/stickers/halloween/09-adorable-mummy.png";
import cauldron from "@/assets/stickers/halloween/10-happy-cauldron.png";
import vampire from "@/assets/stickers/halloween/11-cute-vampire.png";
import monster from "@/assets/stickers/halloween/12-kawaii-monster.png";
import hauntedHouse from "@/assets/stickers/halloween/13-haunted-house.png";
import fullMoon from "@/assets/stickers/halloween/14-full-moon.png";
import spookyTree from "@/assets/stickers/halloween/15-spooky-tree.png";
import witch from "@/assets/stickers/halloween/16-classic-witch.png";
import graveyard from "@/assets/stickers/halloween/17-creepy-graveyard.png";
import castle from "@/assets/stickers/halloween/18-dark-castle.png";
import fog from "@/assets/stickers/halloween/19-mysterious-fog.png";
import glitteryGhost from "@/assets/stickers/halloween/20-glittery-ghost.png";
import sparklePumpkin from "@/assets/stickers/halloween/21-sparkle-pumpkin.png";
import shimmerCauldron from "@/assets/stickers/halloween/22-shimmer-cauldron.png";
import glitterBat from "@/assets/stickers/halloween/23-glitter-bat.png";
import dancingSkeleton from "@/assets/stickers/halloween/24-dancing-skeleton.png";
import joyHouse from "@/assets/stickers/halloween/25-joy-house-halloween.png";

// Import V2 kawaii stickers (regenerated with proper rarities and transparent backgrounds)
import hauntedHouseV2 from "@/assets/stickers/halloween/13-haunted-house-v2.png";
import fullMoonV2 from "@/assets/stickers/halloween/14-full-moon-v2.png";
import spookyTreeV2 from "@/assets/stickers/halloween/15-spooky-tree-v2.png";
import witchV2 from "@/assets/stickers/halloween/16-classic-witch-v2.png";
import graveyardV2 from "@/assets/stickers/halloween/17-creepy-graveyard-v2.png";
import castleV2 from "@/assets/stickers/halloween/18-dark-castle-v2.png";
import fogV2 from "@/assets/stickers/halloween/19-mysterious-fog-v2.png";
import glitteryGhostV2 from "@/assets/stickers/halloween/20-glittery-ghost-v2.png";
import sparklePumpkinV2 from "@/assets/stickers/halloween/21-sparkle-pumpkin-v2.png";
import shimmerCauldronV2 from "@/assets/stickers/halloween/22-shimmer-cauldron-v2.png";
import glitterBatV2 from "@/assets/stickers/halloween/23-glitter-bat-v2.png";
import dancingSkeletonV2 from "@/assets/stickers/halloween/24-dancing-skeleton-v2.png";
import joyHouseV2 from "@/assets/stickers/halloween/25-joy-house-halloween-v2.png";

const halloweenStickers = [
  { path: pumpkin, name: "Smiling Pumpkin", description: "A cheerful pumpkin with rosy cheeks", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 1 },
  { path: ghost, name: "Friendly Ghost", description: "A sweet ghost with sparkly eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 2 },
  { path: candyCorn, name: "Candy Corn Pile", description: "Adorable candy corn with smiling faces", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 3 },
  { path: bat, name: "Happy Bat", description: "A friendly bat with big cute eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 4 },
  { path: cat, name: "Kawaii Black Cat", description: "A sweet black cat with sparkly eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 5 },
  { path: witchHat, name: "Cute Witch Hat", description: "A magical hat with stars and moons", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 6 },
  { path: spider, name: "Friendly Spider", description: "An adorable spider with big eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 7 },
  { path: skeleton, name: "Sweet Skeleton", description: "A cheerful skeleton with a happy smile", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 8 },
  { path: mummy, name: "Adorable Mummy", description: "A cute mummy peeking through bandages", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 9 },
  { path: cauldron, name: "Happy Cauldron", description: "A bubbling cauldron with a smiling face", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 10 },
  { path: vampire, name: "Cute Vampire", description: "An adorable vampire with tiny fangs", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 11 },
  { path: monster, name: "Kawaii Monster", description: "A friendly monster with colorful fur", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.16, sticker_number: 12 },
  { path: hauntedHouse, name: "Haunted House", description: "A spooky house with glowing windows", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 13 },
  { path: fullMoon, name: "Full Moon", description: "A glowing moon with bat silhouettes", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 14 },
  { path: spookyTree, name: "Spooky Tree", description: "A twisted tree with gnarled branches", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 15 },
  { path: witch, name: "Classic Witch", description: "A witch flying on her broomstick", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 16 },
  { path: graveyard, name: "Creepy Graveyard", description: "A misty graveyard with tombstones", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 17 },
  { path: castle, name: "Dark Castle", description: "A gothic castle on a hilltop", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.27, sticker_number: 18 },
  { path: fog, name: "Mysterious Fog", description: "Swirling ethereal mist", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.28, sticker_number: 19 },
  { path: glitteryGhost, name: "Glittery Ghost", description: "A sparkling ghost with magical shimmer", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 20 },
  { path: sparklePumpkin, name: "Sparkle Pumpkin", description: "A shimmering pumpkin with gold sparkles", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 21 },
  { path: shimmerCauldron, name: "Shimmering Cauldron", description: "A magical cauldron with glitter bubbles", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 22 },
  { path: glitterBat, name: "Glitter Bat", description: "A sparkling bat with shimmering wings", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 23 },
  { path: dancingSkeleton, name: "Dancing Skeleton", description: "A skeleton in dynamic dancing pose", rarity: "epic", visual_style: "animated", drop_rate: 4.00, sticker_number: 24 },
  { path: joyHouse, name: "Joy House Halloween", description: "Joy House community celebrating Halloween together", rarity: "legendary", visual_style: "joy_house", drop_rate: 1.00, sticker_number: 25 },
];

const rarityConfig = {
  common: { label: "Common", rate: 50, color: "bg-gray-500" },
  uncommon: { label: "Uncommon", rate: 30, color: "bg-green-500" },
  rare: { label: "Rare", rate: 15, color: "bg-blue-500" },
  epic: { label: "Epic", rate: 4, color: "bg-purple-500" },
  legendary: { label: "Legendary", rate: 1, color: "bg-yellow-500" },
};

interface SortableStickerItemProps {
  sticker: any;
  isPreview: boolean;
  onSetPreview: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onEdit: () => void;
}

const SortableStickerItem = ({ 
  sticker, 
  isPreview, 
  onSetPreview, 
  onToggleActive, 
  onDelete,
  onPreview,
  onEdit
}: SortableStickerItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sticker.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 rounded bg-background/80 cursor-grab active:cursor-grabbing touch-none z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onPreview}
        className="absolute top-2 right-2 p-1 rounded bg-background/80 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Preview full size"
      >
        <Eye className="h-4 w-4" />
      </Button>
      
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <img
          src={sticker.image_url}
          alt={sticker.name}
          className="w-32 h-32 object-contain"
        />
        
        <div className="w-full text-center space-y-2">
          <div className="flex flex-col items-center gap-1">
            <span className="font-medium text-sm">{sticker.name}</span>
            <div className="flex gap-1 flex-wrap justify-center">
              <Badge className={rarityConfig[sticker.rarity as keyof typeof rarityConfig].color}>
                {sticker.rarity}
              </Badge>
              {isPreview && (
                <Badge variant="default">Preview</Badge>
              )}
            </div>
          </div>
          {sticker.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{sticker.description}</p>
          )}
        </div>

        <div className="flex gap-1 w-full">
          <Button
            size="sm"
            variant={isPreview ? "default" : "outline"}
            onClick={onSetPreview}
            className="flex-1 text-xs"
            title="Set as featured sticker for collection preview"
          >
            Featured
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            title="Edit sticker"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleActive}
            className={sticker.is_active ? "bg-green-100 hover:bg-green-200 border-green-300" : "bg-red-100 hover:bg-red-200 border-red-300"}
            title={sticker.is_active ? "Hide sticker" : "Show sticker"}
          >
            {sticker.is_active ? <Eye className="h-4 w-4 text-green-700" /> : <EyeOff className="h-4 w-4 text-red-700" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const StickerCollectionManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [stickers, setStickers] = useState<any[]>([]);
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [editingRarityFor, setEditingRarityFor] = useState<string | null>(null);
  const [editingPackAssetsFor, setEditingPackAssetsFor] = useState<string | null>(null);
  const [editPackImage, setEditPackImage] = useState<File | null>(null);
  const [editPackImagePreview, setEditPackImagePreview] = useState<string>("");
  const [editPackAnimation, setEditPackAnimation] = useState<File | null>(null);
  const [editPackAnimationPreview, setEditPackAnimationPreview] = useState<string>("");
  const [stickersEnabled, setStickersEnabled] = useState(false);
  
  // Collection form
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    description: "",
    theme: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    visible_to_roles: ["admin", "owner"] as UserRole[],
    rarity_percentages: {
      common: 50,
      uncommon: 30,
      rare: 15,
      epic: 4,
      legendary: 1
    }
  });
  
  const [packImage, setPackImage] = useState<File | null>(null);
  const [packImagePreview, setPackImagePreview] = useState<string>("");
  const [packAnimation, setPackAnimation] = useState<File | null>(null);
  const [packAnimationPreview, setPackAnimationPreview] = useState<string>("");

  // Sticker form
  const [stickerForm, setStickerForm] = useState({
    name: "",
    description: "",
    rarity: "common" as keyof typeof rarityConfig,
    visual_style: "",
    sticker_number: 1,
  });
  const [stickerImage, setStickerImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [removeBackground, setRemoveBackground] = useState(true); // Auto-remove backgrounds by default
  const [previewSticker, setPreviewSticker] = useState<any | null>(null);
  const [editingSticker, setEditingSticker] = useState<any | null>(null);
  const [editStickerImage, setEditStickerImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [showTestScratch, setShowTestScratch] = useState(false);
  const [testCardId, setTestCardId] = useState<string | null>(null);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);

  useEffect(() => {
    fetchCollections();
    loadStickerSetting();
    loadDefaultRates();
  }, []);

  const loadDefaultRates = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'default_rarity_percentages')
        .maybeSingle();
      
      if (data?.setting_value) {
        // Update initial collection form with defaults
        setCollectionForm(prev => ({
          ...prev,
          rarity_percentages: data.setting_value as any
        }));
      }
    } catch (error) {
      console.error('Error loading default rates:', error);
    }
  };

  useEffect(() => {
    if (selectedCollection) {
      fetchStickers(selectedCollection);
    }
  }, [selectedCollection]);

  const fetchCollections = async () => {
    const { data, error } = await supabase
      .from('sticker_collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setCollections(data || []);
  };

  const loadStickerSetting = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'stickers_enabled')
      .single();
    
    setStickersEnabled(data?.setting_value === true);
  };

  const fetchStickers = async (collectionId: string) => {
    console.log('Fetching stickers for collection:', collectionId);
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sticker_number');

    if (error) {
      console.error('Error fetching stickers:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    console.log('Fetched stickers:', data?.length, 'stickers');
    setStickers(data || []);
  };

  const seedHalloweenCollection = async () => {
    setLoading(true);
    try {
      toast({ title: "Checking for existing collection...", description: "This may take a minute..." });

      // Check if Halloween 2025 collection already exists
      const { data: existingCollections } = await supabase
        .from('sticker_collections')
        .select('id, name')
        .eq('name', 'Halloween 2025');

      if (existingCollections && existingCollections.length > 0) {
        toast({ 
          title: "Collection Already Exists", 
          description: "Halloween 2025 collection has already been created. Please select it from the dropdown to view stickers.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({ title: "Creating Halloween Collection", description: "Creating badge and collection..." });

      // Create badge first
      const { data: badge, error: badgeError } = await supabase
        .from('badges')
        .insert({
          name: 'Halloween Complete',
          description: 'Collected all Halloween 2025 stickers!',
          badge_type: 'collection_complete',
          is_active: true,
          requirements: { collection: 'halloween_2025' }
        })
        .select()
        .single();

      if (badgeError) throw badgeError;

      // Create collection
      const { data: collection, error: collectionError } = await supabase
        .from('sticker_collections')
        .insert({
          name: 'Halloween 2025',
          description: 'Spooky and sweet Halloween stickers to collect!',
          theme: 'halloween',
          is_active: true,
          start_date: '2025-10-01',
          end_date: null,
          completion_badge_id: badge.id,
          display_order: 1
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Upload stickers one by one
      let uploadedCount = 0;
      for (const sticker of halloweenStickers) {
        try {
          // Fetch the image and convert to File
          const response = await fetch(sticker.path);
          const blob = await response.blob();
          const fileName = `halloween/${sticker.sticker_number.toString().padStart(2, '0')}-${sticker.name.toLowerCase().replace(/\s+/g, '-')}.png`;
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('sticker-images')
            .upload(fileName, blob, { upsert: true });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('sticker-images')
            .getPublicUrl(fileName);

          // Insert sticker record
          const { error: stickerError } = await supabase
            .from('stickers')
            .insert([{
              collection_id: collection.id,
              name: sticker.name,
              description: sticker.description,
              image_url: publicUrl,
              rarity: sticker.rarity as "common" | "uncommon" | "rare" | "epic" | "legendary",
              visual_style: sticker.visual_style,
              drop_rate: sticker.drop_rate,
              sticker_number: sticker.sticker_number,
              is_active: true
            }]);

          if (stickerError) throw stickerError;
          
          uploadedCount++;
        } catch (err: any) {
          console.error(`Error uploading sticker ${sticker.name}:`, err);
        }
      }

      toast({ 
        title: "Success!", 
        description: `Created Halloween collection with ${uploadedCount} stickers` 
      });
      
      await fetchCollections();
      setSelectedCollection(collection.id);
    } catch (error: any) {
      console.error('Error seeding Halloween collection:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create Halloween collection", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const resetDailyCards = async (scope: 'self' | 'admins' | 'all') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-daily-cards', {
        body: { scope }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: data.message || "Daily cards have been reset",
      });
      setResetDialogOpen(false);
    } catch (error: any) {
      console.error('Error resetting cards:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset daily cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestScratchCard = async () => {
    setLoading(true);
    try {
      // Auto-select first active collection if none selected
      let collectionToUse = selectedCollection;
      if (!collectionToUse && collections.length > 0) {
        const activeCollection = collections.find(c => c.is_active) || collections[0];
        collectionToUse = activeCollection.id;
      }

      if (!collectionToUse) {
        toast({
          title: "No Collections",
          description: "Please create a collection first",
          variant: "destructive"
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split('T')[0];

      // Delete any existing test cards for today to avoid duplicate key error
      await supabase
        .from('daily_scratch_cards')
        .delete()
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('purchase_number', 999);

      // Create a test card that expires in 1 hour
      const { data: testCard, error } = await supabase
        .from('daily_scratch_cards')
        .insert({
          user_id: user.id,
          collection_id: collectionToUse,
          date: today,
          is_bonus_card: true,
          purchase_number: 999, // Special number to identify test cards
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          is_scratched: false
        })
        .select()
        .single();

      if (error) throw error;

      setTestCardId(testCard.id);
      setShowTestScratch(true);

      toast({
        title: "Test Card Created",
        description: "Scratch away! This card will expire in 1 hour.",
      });
    } catch (error: any) {
      console.error('Error creating test card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestCardScratched = async () => {
    // Delete the test card immediately so admin can test again
    if (testCardId) {
      await supabase
        .from('daily_scratch_cards')
        .delete()
        .eq('id', testCardId);
    }
    setShowTestScratch(false);
    setTestCardId(null);
  };

  const updateToV2Stickers = async () => {
    if (!selectedCollection) {
      toast({ title: "Error", description: "Please select a collection first", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      toast({ title: "Updating Stickers", description: "Uploading kawaii versions with die-cut edges..." });

      // Map sticker numbers to their imported v2 images
      const v2Stickers = [
        { number: 13, name: '13-haunted-house-v2.png', path: hauntedHouseV2 },
        { number: 14, name: '14-full-moon-v2.png', path: fullMoonV2 },
        { number: 15, name: '15-spooky-tree-v2.png', path: spookyTreeV2 },
        { number: 16, name: '16-classic-witch-v2.png', path: witchV2 },
        { number: 17, name: '17-creepy-graveyard-v2.png', path: graveyardV2 },
        { number: 18, name: '18-dark-castle-v2.png', path: castleV2 },
        { number: 19, name: '19-mysterious-fog-v2.png', path: fogV2 },
        { number: 20, name: '20-glittery-ghost-v2.png', path: glitteryGhostV2 },
        { number: 21, name: '21-sparkle-pumpkin-v2.png', path: sparklePumpkinV2 },
        { number: 22, name: '22-shimmer-cauldron-v2.png', path: shimmerCauldronV2 },
        { number: 23, name: '23-glitter-bat-v2.png', path: glitterBatV2 },
        { number: 24, name: '24-dancing-skeleton-v2.png', path: dancingSkeletonV2 },
        { number: 25, name: '25-joy-house-halloween-v2.png', path: joyHouseV2 },
      ];

      let updatedCount = 0;
      // Upload each v2 sticker and update database
      for (const sticker of v2Stickers) {
        try {
          console.log(`🎃 Processing sticker ${sticker.number}: ${sticker.name}`);
          
          // Fetch the image as blob
          const response = await fetch(sticker.path);
          const blob = await response.blob();
          console.log(`📦 Fetched blob, size: ${blob.size} bytes`);
          
          // Upload to storage - replace the original, not create v2 version
          const storageFileName = `halloween/${sticker.name.replace('-v2', '')}`;
          console.log(`☁️ Uploading to: ${storageFileName}`);
          
          const { error: uploadError } = await supabase.storage
            .from('sticker-images')
            .upload(storageFileName, blob, {
              contentType: 'image/png',
              upsert: true,
              cacheControl: '0', // Disable caching
            });

          if (uploadError) {
            console.error(`❌ Upload error for sticker ${sticker.number}:`, uploadError);
            throw uploadError;
          }
          
          console.log(`✅ Successfully uploaded sticker ${sticker.number}`);

          // Get public URL with cache buster
          const { data: { publicUrl } } = supabase.storage
            .from('sticker-images')
            .getPublicUrl(storageFileName);
          
          const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;
          console.log(`🔗 New URL: ${cacheBustedUrl}`);

          // Update sticker record in database
          const { error: updateError } = await supabase
            .from('stickers')
            .update({ image_url: cacheBustedUrl })
            .eq('sticker_number', sticker.number)
            .eq('collection_id', selectedCollection);

          if (updateError) {
            console.error(`❌ Database update error for sticker ${sticker.number}:`, updateError);
            throw updateError;
          }
          
          console.log(`✅ Successfully updated database for sticker ${sticker.number}`);
          updatedCount++;
        } catch (err: any) {
          console.error(`Error updating sticker ${sticker.number}:`, err);
        }
      }

      toast({
        title: "Success!",
        description: `Updated ${updatedCount} stickers with kawaii cutout versions!`,
      });

      // Refresh stickers display
      fetchStickers(selectedCollection);
    } catch (error: any) {
      console.error('Error updating stickers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update stickers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!collectionForm.name || !collectionForm.theme) {
      toast({ title: "Error", description: "Name and theme are required", variant: "destructive" });
      return;
    }

    // Validate percentages sum to 100
    const total = Object.values(collectionForm.rarity_percentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast({ title: "Error", description: "Rarity percentages must sum to 100%", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
      let packImageUrl = null;
      let packAnimationUrl = null;

      // Upload pack image if provided
      if (packImage) {
        const fileExt = packImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `pack-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sticker-images')
          .upload(filePath, packImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('sticker-images')
          .getPublicUrl(filePath);

        packImageUrl = urlData.publicUrl;
      }

      // Upload pack animation if provided
      if (packAnimation) {
        const fileExt = packAnimation.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `pack-animations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sticker-images')
          .upload(filePath, packAnimation);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('sticker-images')
          .getPublicUrl(filePath);

        packAnimationUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('sticker_collections')
        .insert([{
          name: collectionForm.name,
          description: collectionForm.description,
          theme: collectionForm.theme,
          start_date: collectionForm.start_date,
          end_date: collectionForm.end_date || null,
          visible_to_roles: collectionForm.visible_to_roles as any,
          rarity_percentages: collectionForm.rarity_percentages,
          pack_image_url: packImageUrl,
          pack_animation_url: packAnimationUrl,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: "Collection created!" });
    
    // Reload default rates for next collection
    const { data: defaultRates } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_rarity_percentages')
      .maybeSingle();
    
    const defaultPercentages = defaultRates?.setting_value as { common: number, uncommon: number, rare: number, epic: number, legendary: number } || {
      common: 50,
      uncommon: 30,
      rare: 15,
      epic: 4,
      legendary: 1
    };
    
      setCollectionForm({ 
        name: "", 
        description: "", 
        theme: "", 
        start_date: new Date().toISOString().split('T')[0], 
        end_date: "",
        visible_to_roles: ["admin", "owner"],
        rarity_percentages: defaultPercentages
      });
      setPackImage(null);
      setPackImagePreview("");
      setPackAnimation(null);
      setPackAnimationPreview("");
      fetchCollections();
      setSelectedCollection(data.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleCollectionActive = async (id: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('sticker_collections')
      .update({ is_active: !currentlyActive })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `Collection ${!currentlyActive ? 'activated' : 'deactivated'}` });
    fetchCollections();
  };

  const updateCollectionRoles = async (collectionId: string, roles: UserRole[]) => {
    const { error } = await supabase
      .from('sticker_collections')
      .update({ visible_to_roles: roles as any })
      .eq('id', collectionId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Role visibility updated!" });
    fetchCollections();
    setEditingRolesFor(null);
  };

  const updateCollectionRarity = async (collectionId: string, percentages: any) => {
    // Validate percentages sum to 100
    const total: number = Object.values(percentages).reduce((sum: number, val: any) => sum + Number(val), 0) as number;
    if (Math.abs(total - 100) > 0.01) {
      toast({ title: "Error", description: "Rarity percentages must sum to 100%", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('sticker_collections')
      .update({ rarity_percentages: percentages })
      .eq('id', collectionId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Rarity percentages updated!" });
    fetchCollections();
    setEditingRarityFor(null);
  };

  const updatePackAssets = async (collectionId: string) => {
    setLoading(true);
    try {
      let packImageUrl = null;
      let packAnimationUrl = null;

      // Upload new pack image if provided
      if (editPackImage) {
        const fileExt = editPackImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `pack-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sticker-images')
          .upload(filePath, editPackImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('sticker-images')
          .getPublicUrl(filePath);

        packImageUrl = urlData.publicUrl;
      }

      // Upload new pack animation if provided
      if (editPackAnimation) {
        const fileExt = editPackAnimation.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `pack-animations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sticker-images')
          .upload(filePath, editPackAnimation);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('sticker-images')
          .getPublicUrl(filePath);

        packAnimationUrl = urlData.publicUrl;
      }

      // Update collection with new URLs (only update fields that were uploaded)
      const updates: any = {};
      if (packImageUrl) updates.pack_image_url = packImageUrl;
      if (packAnimationUrl) updates.pack_animation_url = packAnimationUrl;

      if (Object.keys(updates).length === 0) {
        toast({ title: "No Changes", description: "No new assets uploaded", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('sticker_collections')
        .update(updates)
        .eq('id', collectionId);

      if (error) throw error;

      toast({ title: "Success", description: "Pack assets updated!" });
      fetchCollections();
      setEditingPackAssetsFor(null);
      setEditPackImage(null);
      setEditPackImagePreview("");
      setEditPackAnimation(null);
      setEditPackAnimationPreview("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clearPackAsset = async (collectionId: string, assetType: 'image' | 'animation') => {
    const fieldName = assetType === 'image' ? 'pack_image_url' : 'pack_animation_url';
    
    const { error } = await supabase
      .from('sticker_collections')
      .update({ [fieldName]: null })
      .eq('id', collectionId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `Pack ${assetType} cleared - will use default sticker collage` });
    fetchCollections();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStickerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSticker = async () => {
    if (!selectedCollection) {
      toast({ title: "Error", description: "Please select a collection first", variant: "destructive" });
      return;
    }

    if (!stickerImage || !stickerForm.name || !stickerForm.visual_style) {
      toast({ title: "Error", description: "Image, name, and visual style are required", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      let fileToUpload = stickerImage;
      
      // Remove background if checkbox is enabled
      if (removeBackground) {
        try {
          toast({ title: "Processing", description: "Removing background from sticker..." });
          const img = await loadImage(stickerImage);
          const processedBlob = await removeBg(img);
          fileToUpload = new File([processedBlob], stickerImage.name.replace(/\.\w+$/, '.png'), { type: 'image/png' });
          toast({ title: "Success", description: "Background removed!" });
        } catch (bgError: any) {
          console.error('Background removal error:', bgError);
          toast({ 
            title: "Warning", 
            description: "Could not remove background, uploading original image", 
            variant: "destructive" 
          });
        }
      }

      // Query database for the highest sticker number in this collection
      const { data: maxData, error: maxError } = await supabase
        .from('stickers')
        .select('sticker_number')
        .eq('collection_id', selectedCollection)
        .order('sticker_number', { ascending: false })
        .limit(1)
        .single();

      if (maxError && maxError.code !== 'PGRST116') throw maxError; // PGRST116 = no rows
      
      const nextNumber = maxData ? maxData.sticker_number + 1 : 1;

      // Upload image
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('sticker-images')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sticker-images')
        .getPublicUrl(fileName);

      // Create sticker record
      const { error: insertError } = await supabase
        .from('stickers')
        .insert({
          collection_id: selectedCollection,
          image_url: publicUrl,
          drop_rate: rarityConfig[stickerForm.rarity].rate,
          sticker_number: nextNumber,
          name: stickerForm.name,
          description: stickerForm.description,
          rarity: stickerForm.rarity,
          visual_style: stickerForm.visual_style,
        });

      if (insertError) throw insertError;

      toast({ title: "Success", description: `Sticker uploaded as #${nextNumber}!` });
      setStickerForm({
        name: "",
        description: "",
        rarity: "common",
        visual_style: "",
        sticker_number: nextNumber + 1,
      });
      setStickerImage(null);
      setImagePreview("");
      fetchStickers(selectedCollection);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = stickers.findIndex((s) => s.id === active.id);
    const newIndex = stickers.findIndex((s) => s.id === over.id);

    const newStickers = arrayMove(stickers, oldIndex, newIndex);
    setStickers(newStickers);

    try {
      // Two-phase update to avoid unique constraint violations:
      // Phase 1: Set all to negative numbers (temporary)
      const tempUpdates = newStickers.map((sticker, index) => ({
        id: sticker.id,
        temp_number: -(index + 1),
      }));

      for (const update of tempUpdates) {
        const { error } = await supabase
          .from('stickers')
          .update({ sticker_number: update.temp_number })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Phase 2: Set to final positive numbers
      const finalUpdates = newStickers.map((sticker, index) => ({
        id: sticker.id,
        final_number: index + 1,
      }));

      for (const update of finalUpdates) {
        const { error } = await supabase
          .from('stickers')
          .update({ sticker_number: update.final_number })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({ title: "Success", description: "Sticker order updated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      fetchStickers(selectedCollection); // Reload on error
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const deleteSticker = async (stickerId: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this sticker?")) return;

    setLoading(true);

    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('stickers')
        .delete()
        .eq('id', stickerId);

      if (deleteError) throw deleteError;

      // Delete from storage
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('sticker-images').remove([fileName]);
      }

      toast({ title: "Success", description: "Sticker deleted" });
      fetchStickers(selectedCollection);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleStickerActive = async (stickerId: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('stickers')
      .update({ is_active: !currentlyActive })
      .eq('id', stickerId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    fetchStickers(selectedCollection);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditStickerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateDescription = async (imageUrl: string, isEdit: boolean = false) => {
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sticker-description', {
        body: { imageUrl }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      const description = data.description;
      if (isEdit && editingSticker) {
        setEditingSticker({ ...editingSticker, description });
      } else {
        setStickerForm({ ...stickerForm, description });
      }

      toast({
        title: "Success",
        description: "Description generated!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate description",
        variant: "destructive",
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const updateSticker = async () => {
    if (!editingSticker) return;

    setLoading(true);
    try {
      let imageUrl = editingSticker.image_url;

      // If new image was uploaded, upload it and delete old one
      if (editStickerImage) {
        const fileExt = editStickerImage.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('sticker-images')
          .upload(fileName, editStickerImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('sticker-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;

        // Delete old image
        const oldFileName = editingSticker.image_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('sticker-images').remove([oldFileName]);
        }
      }

      // Update sticker record
      const { error: updateError } = await supabase
        .from('stickers')
        .update({
          name: editingSticker.name,
          description: editingSticker.description,
          rarity: editingSticker.rarity,
          visual_style: editingSticker.visual_style,
          drop_rate: rarityConfig[editingSticker.rarity as keyof typeof rarityConfig].rate,
          image_url: imageUrl,
        })
        .eq('id', editingSticker.id);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Sticker updated!" });
      setEditingSticker(null);
      setEditStickerImage(null);
      setEditImagePreview("");
      fetchStickers(selectedCollection);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (collectionId: string, collectionName: string) => {
    if (!confirm(`Are you sure you want to delete "${collectionName}"? This will also delete all stickers in this collection.`)) {
      return;
    }

    setLoading(true);
    try {
      // First delete all stickers in the collection
      const { error: stickersError } = await supabase
        .from('stickers')
        .delete()
        .eq('collection_id', collectionId);

      if (stickersError) throw stickersError;

      // Then delete the collection
      const { error: collectionError } = await supabase
        .from('sticker_collections')
        .delete()
        .eq('id', collectionId);

      if (collectionError) throw collectionError;

      toast({ title: "Success", description: `Deleted "${collectionName}" collection` });
      
      if (selectedCollection === collectionId) {
        setSelectedCollection("");
        setStickers([]);
      }
      
      await fetchCollections();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feature Enable/Disable Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Sticker Feature Control</CardTitle>
          <CardDescription>Enable or disable the entire sticker feature on the community page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Enable Sticker Feature</Label>
              <p className="text-sm text-muted-foreground">
                Turn this off to completely hide the daily sticker pack from all users
              </p>
            </div>
            <Switch
              checked={stickersEnabled}
              onCheckedChange={async (checked) => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  
                  const { error } = await supabase
                    .from("app_settings")
                    .upsert({
                      setting_key: "stickers_enabled",
                      setting_value: checked,
                      updated_by: user?.id,
                    }, {
                      onConflict: 'setting_key'
                    });

                  if (error) throw error;

                  setStickersEnabled(checked);
                  toast({
                    title: "Success",
                    description: `Sticker feature ${checked ? 'enabled' : 'disabled'}`,
                  });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                  });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Drop Rates */}
      <DefaultRaritySettings />

      <Tabs defaultValue="collections">
        <TabsList>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="stickers">Stickers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          {/* Testing Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3 flex-wrap">
                <Button 
                  onClick={() => setResetDialogOpen(true)} 
                  disabled={loading}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Daily Cards (Testing)
                </Button>
                <Button 
                  onClick={createTestScratchCard} 
                  disabled={loading}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Sparkles className="mr-2 h-4 w-4" />
                  Test Scratcher
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setCreateCollectionOpen(!createCollectionOpen)}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Create New Collection</CardTitle>
                  <CardDescription>Set up a new sticker collection</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${createCollectionOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
            {createCollectionOpen && (
              <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Collection Name</Label>
                  <Input
                    value={collectionForm.name}
                    onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                    placeholder="Halloween 2025"
                  />
                </div>
                <div>
                  <Label>Theme</Label>
                  <Input
                    value={collectionForm.theme}
                    onChange={(e) => setCollectionForm({ ...collectionForm, theme: e.target.value })}
                    placeholder="halloween"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  placeholder="Spooky stickers for Halloween!"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={collectionForm.start_date}
                    onChange={(e) => setCollectionForm({ ...collectionForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={collectionForm.end_date}
                    onChange={(e) => setCollectionForm({ ...collectionForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm mb-2 block">Visible to Roles (Who can see this sticker collection)</Label>
                <div className="grid grid-cols-3 gap-3 p-4 border rounded-md bg-muted/30">
                  {USER_ROLES.map((role) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={collectionForm.visible_to_roles.includes(role.value)}
                        onCheckedChange={(checked) => {
                          const newRoles = checked
                            ? [...collectionForm.visible_to_roles, role.value]
                            : collectionForm.visible_to_roles.filter(r => r !== role.value);
                          setCollectionForm({ ...collectionForm, visible_to_roles: newRoles });
                        }}
                      />
                      <label
                        htmlFor={`role-${role.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                      >
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Only users with selected roles will be able to see and open packs from this collection
                </p>
              </div>
              
              <div className="space-y-4">
                <Label className="text-base">Custom Pack Assets (Optional)</Label>
                <p className="text-sm text-muted-foreground">Upload custom images/animations for pack opening experience</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pack Image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPackImage(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setPackImagePreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {packImagePreview && (
                      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                        <img src={packImagePreview} alt="Pack preview" className="w-full h-full object-cover" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setPackImage(null);
                            setPackImagePreview("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Pack Animation (Optional)</Label>
                    <Input
                      type="file"
                      accept="image/gif,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPackAnimation(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setPackAnimationPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {packAnimationPreview && (
                      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                        {packAnimation?.type.startsWith('video/') ? (
                          <video src={packAnimationPreview} className="w-full h-full object-cover" autoPlay loop muted />
                        ) : (
                          <img src={packAnimationPreview} alt="Animation preview" className="w-full h-full object-cover" />
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setPackAnimation(null);
                            setPackAnimationPreview("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base">Rarity Drop Rates (%)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Load default rates from app_settings
                      const { data } = await supabase
                        .from('app_settings')
                        .select('setting_value')
                        .eq('setting_key', 'default_rarity_percentages')
                        .maybeSingle();
                      
                      if (data?.setting_value) {
                        setCollectionForm({
                          ...collectionForm,
                          rarity_percentages: data.setting_value as any
                        });
                        toast({
                          title: "Success",
                          description: "Loaded default drop rates",
                        });
                      }
                    }}
                  >
                    Use Defaults
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Adjust the drop rate percentages for each rarity level. Must sum to 100%.</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(rarityConfig).map(([key, config]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`rarity-${key}`} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded ${config.color}`} />
                        {config.label}
                      </Label>
                      <Input
                        id={`rarity-${key}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={collectionForm.rarity_percentages[key as keyof typeof collectionForm.rarity_percentages]}
                        onChange={(e) => setCollectionForm({
                          ...collectionForm,
                          rarity_percentages: {
                            ...collectionForm.rarity_percentages,
                            [key]: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <span className="text-sm font-medium">Total:</span>
                  <span className={`text-sm font-bold ${Math.abs(Object.values(collectionForm.rarity_percentages).reduce((sum, val) => sum + val, 0) - 100) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                    {Object.values(collectionForm.rarity_percentages).reduce((sum, val) => sum + val, 0).toFixed(1)}%
                  </span>
                </div>
              </div>
                  <Button onClick={createCollection} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Plus className="mr-2 h-4 w-4" />
                    Create Collection
                  </Button>
                </CardContent>
            )}
            </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {collections.map((collection) => (
                  <div key={collection.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-muted/30">
                      <div>
                        <div className="font-semibold">{collection.name}</div>
                        <div className="text-sm text-muted-foreground">{collection.theme}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={collection.is_active ? "default" : "secondary"}>
                          {collection.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingRolesFor(editingRolesFor === collection.id ? null : collection.id)}
                        >
                          Edit Roles
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingRarityFor(editingRarityFor === collection.id ? null : collection.id)}
                        >
                          Edit Rarity
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPackAssetsFor(editingPackAssetsFor === collection.id ? null : collection.id);
                            if (editingPackAssetsFor !== collection.id) {
                              // Reset previews when opening
                              setEditPackImage(null);
                              setEditPackImagePreview("");
                              setEditPackAnimation(null);
                              setEditPackAnimationPreview("");
                            }
                          }}
                        >
                          Edit Pack
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCollectionActive(collection.id, collection.is_active)}
                          className={collection.is_active ? "bg-green-100 hover:bg-green-200 border-green-300" : "bg-red-100 hover:bg-red-200 border-red-300"}
                          title={collection.is_active ? "Hide collection" : "Show collection"}
                        >
                          {collection.is_active ? <Eye className="h-4 w-4 text-green-700" /> : <EyeOff className="h-4 w-4 text-red-700" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCollection(collection.id, collection.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {editingRolesFor === collection.id && (
                      <div className="p-4 border-t bg-background">
                        <Label className="text-sm mb-3 block font-semibold">Visible to Roles</Label>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {USER_ROLES.map((role) => {
                            const currentRoles = collection.visible_to_roles || ["admin", "owner"];
                            return (
                              <div key={role.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${collection.id}-${role.value}`}
                                  checked={currentRoles.includes(role.value)}
                                  onCheckedChange={(checked) => {
                                    const newRoles = checked
                                      ? [...currentRoles, role.value]
                                      : currentRoles.filter((r: string) => r !== role.value);
                                    updateCollectionRoles(collection.id, newRoles);
                                  }}
                                />
                                <label
                                  htmlFor={`${collection.id}-${role.value}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                                >
                                  {role.label}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Only users with selected roles will see and open packs from this collection
                        </p>
                      </div>
                    )}
                    
                    {editingRarityFor === collection.id && (
                      <div className="p-4 border-t bg-background">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-semibold">Rarity Drop Rates (%)</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              // Load default rates from app_settings
                              const { data } = await supabase
                                .from('app_settings')
                                .select('setting_value')
                                .eq('setting_key', 'default_rarity_percentages')
                                .maybeSingle();
                              
                              if (data?.setting_value) {
                                setCollections(collections.map(c => 
                                  c.id === collection.id 
                                    ? { ...c, rarity_percentages: data.setting_value as any }
                                    : c
                                ));
                                toast({
                                  title: "Success",
                                  description: "Loaded default drop rates",
                                });
                              }
                            }}
                          >
                            Use Defaults
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Adjust percentages for each rarity level. Must sum to 100%.</p>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {Object.entries(rarityConfig).map(([key, config]) => {
                            const currentPercentages = collection.rarity_percentages || {
                              common: 50,
                              uncommon: 30,
                              rare: 15,
                              epic: 4,
                              legendary: 1
                            };
                            return (
                              <div key={key} className="space-y-2">
                                <Label htmlFor={`${collection.id}-rarity-${key}`} className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded ${config.color}`} />
                                  {config.label}
                                </Label>
                                <Input
                                  id={`${collection.id}-rarity-${key}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={currentPercentages[key]}
                                  onChange={(e) => {
                                    const newPercentages = {
                                      ...currentPercentages,
                                      [key]: parseFloat(e.target.value) || 0
                                    };
                                    // Update the collection locally first for immediate UI feedback
                                    setCollections(collections.map(c => 
                                      c.id === collection.id 
                                        ? { ...c, rarity_percentages: newPercentages }
                                        : c
                                    ));
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30 mb-4">
                          <span className="text-sm font-medium">Total:</span>
                          <span className={`text-sm font-bold ${Math.abs((Object.values(collection.rarity_percentages || {common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1}).reduce((sum: number, val: any) => sum + Number(val), 0) as number) - 100) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                            {(Object.values(collection.rarity_percentages || {common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1}).reduce((sum: number, val: any) => sum + Number(val), 0) as number).toFixed(1)}%
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => updateCollectionRarity(collection.id, collection.rarity_percentages)}
                        >
                          Save Rarity Settings
                        </Button>
                      </div>
                    )}
                    
                    {editingPackAssetsFor === collection.id && (
                      <div className="p-4 border-t bg-background">
                        <Label className="text-sm mb-3 block font-semibold">Custom Pack Assets</Label>
                        <p className="text-sm text-muted-foreground mb-4">Upload custom images/animations for pack opening. Leave blank to keep current assets or use default sticker collage.</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Current Pack Image */}
                          <div className="space-y-2">
                            <Label>Current Pack Image</Label>
                            {collection.pack_image_url ? (
                              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                                <img src={collection.pack_image_url} alt="Current pack" className="w-full h-full object-cover" />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-2 right-2"
                                  onClick={() => clearPackAsset(collection.id, 'image')}
                                >
                                  Clear
                                </Button>
                              </div>
                            ) : (
                              <div className="w-full aspect-[2/3] rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground text-sm">
                                No custom image - using sticker collage
                              </div>
                            )}
                          </div>
                          
                          {/* Current Pack Animation */}
                          <div className="space-y-2">
                            <Label>Current Pack Animation</Label>
                            {collection.pack_animation_url ? (
                              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                                {collection.pack_animation_url.includes('.mp4') || collection.pack_animation_url.includes('.webm') ? (
                                  <video src={collection.pack_animation_url} className="w-full h-full object-cover" autoPlay loop muted />
                                ) : (
                                  <img src={collection.pack_animation_url} alt="Current animation" className="w-full h-full object-cover" />
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-2 right-2"
                                  onClick={() => clearPackAsset(collection.id, 'animation')}
                                >
                                  Clear
                                </Button>
                              </div>
                            ) : (
                              <div className="w-full aspect-[2/3] rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground text-sm">
                                No custom animation
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Upload New Pack Image */}
                          <div className="space-y-2">
                            <Label>Upload New Pack Image</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setEditPackImage(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => setEditPackImagePreview(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {editPackImagePreview && (
                              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                                <img src={editPackImagePreview} alt="New pack preview" className="w-full h-full object-cover" />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    setEditPackImage(null);
                                    setEditPackImagePreview("");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Upload New Pack Animation */}
                          <div className="space-y-2">
                            <Label>Upload New Pack Animation</Label>
                            <Input
                              type="file"
                              accept="image/gif,video/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setEditPackAnimation(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => setEditPackAnimationPreview(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {editPackAnimationPreview && (
                              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                                {editPackAnimation?.type.startsWith('video/') ? (
                                  <video src={editPackAnimationPreview} className="w-full h-full object-cover" autoPlay loop muted />
                                ) : (
                                  <img src={editPackAnimationPreview} alt="New animation preview" className="w-full h-full object-cover" />
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    setEditPackAnimation(null);
                                    setEditPackAnimationPreview("");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => updatePackAssets(collection.id)}
                          disabled={!editPackImage && !editPackAnimation}
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Upload New Assets
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stickers" className="space-y-4">
          {/* Collection Selector - Always visible at top */}
          <Card>
            <CardHeader>
              <CardTitle>Select Collection to View</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Sticker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedCollection && (
                <div className="text-sm text-muted-foreground mb-4">
                  Please select a collection above first
                </div>
              )}

              {selectedCollection && (
                <>
                  <div>
                    <Label>Sticker Name</Label>
                    <Input
                      value={stickerForm.name}
                      onChange={(e) => setStickerForm({ ...stickerForm, name: e.target.value })}
                      placeholder="Glittery Ghost"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Description</Label>
                      {imagePreview && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => generateDescription(imagePreview, false)}
                          disabled={generatingDescription}
                        >
                          {generatingDescription ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Generate with AI
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={stickerForm.description}
                      onChange={(e) => setStickerForm({ ...stickerForm, description: e.target.value })}
                      placeholder="A sparkly ghost sticker"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Visual Style</Label>
                      <Select
                        value={stickerForm.visual_style}
                        onValueChange={(value) => setStickerForm({ ...stickerForm, visual_style: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cute_kawaii">Cute/Kawaii</SelectItem>
                          <SelectItem value="spooky_classic">Spooky/Classic</SelectItem>
                          <SelectItem value="glitter">Glitter/Sparkle</SelectItem>
                          <SelectItem value="animated">Animated</SelectItem>
                          <SelectItem value="joy_house">Joy House Themed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Rarity</Label>
                      <Select
                        value={stickerForm.rarity}
                        onValueChange={(value: any) => setStickerForm({ ...stickerForm, rarity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(rarityConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label} ({config.rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Sticker Image</Label>
                    <Input type="file" accept="image/*" onChange={handleImageChange} />
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="remove-background"
                        checked={removeBackground}
                        onCheckedChange={(checked) => setRemoveBackground(checked as boolean)}
                      />
                      <label
                        htmlFor="remove-background"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Auto-remove background (make transparent)
                      </label>
                    </div>
                    {imagePreview && (
                      <div className="mt-2">
                        <img src={imagePreview} alt="Preview" className="w-32 h-32 object-contain border rounded" />
                      </div>
                    )}
                  </div>

                  <Button onClick={uploadSticker} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Sticker
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {selectedCollection && (
            <Card>
              <CardHeader>
                <CardTitle>Stickers in Collection ({stickers.length}/25)</CardTitle>
                <CardDescription>Drag to reorder stickers</CardDescription>
              </CardHeader>
              <CardContent>
                {stickers.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={stickers.map(s => s.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {stickers.map((sticker) => {
                          const currentCollection = collections.find(c => c.id === selectedCollection);
                          const isPreview = currentCollection?.preview_sticker_id === sticker.id;
                          
                          return (
                            <SortableStickerItem
                              key={sticker.id}
                              sticker={sticker}
                              isPreview={isPreview}
                              onSetPreview={async () => {
                                const { error } = await supabase
                                  .from('sticker_collections')
                                  .update({ preview_sticker_id: sticker.id })
                                  .eq('id', selectedCollection);
                                
                                if (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to set preview sticker",
                                    variant: "destructive",
                                  });
                                } else {
                                  toast({
                                    title: "Success",
                                    description: "Community page preview updated",
                                  });
                                  fetchCollections();
                                }
                              }}
                              onToggleActive={() => toggleStickerActive(sticker.id, sticker.is_active)}
                              onDelete={() => deleteSticker(sticker.id, sticker.image_url)}
                              onPreview={() => setPreviewSticker(sticker)}
                              onEdit={() => {
                                setEditingSticker(sticker);
                                setEditImagePreview(sticker.image_url);
                              }}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">No stickers in this collection yet.</p>
                    <p className="text-sm">Go to the Collections tab and click "Seed Halloween Collection" to add the pre-made stickers, or upload your own stickers above.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Collection statistics coming soon</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticker Preview Dialog */}
      <Dialog open={!!previewSticker} onOpenChange={() => setPreviewSticker(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <DialogTitle>{previewSticker?.name}</DialogTitle>
                {previewSticker?.description && (
                  <p className="text-sm text-muted-foreground">{previewSticker.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewSticker(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex items-center justify-center p-8 bg-muted/20 rounded-lg">
            <img
              src={previewSticker?.image_url}
              alt={previewSticker?.name}
              className="max-w-full max-h-[500px] object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge className={rarityConfig[previewSticker?.rarity as keyof typeof rarityConfig]?.color}>
              {previewSticker?.rarity}
            </Badge>
            {previewSticker?.visual_style && (
              <Badge variant="outline">{previewSticker.visual_style}</Badge>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sticker Dialog */}
      <Dialog open={!!editingSticker} onOpenChange={() => {
        setEditingSticker(null);
        setEditStickerImage(null);
        setEditImagePreview("");
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle>Edit Sticker</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingSticker(null);
                  setEditStickerImage(null);
                  setEditImagePreview("");
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {editingSticker && (
            <div className="space-y-4">
              <div>
                <Label>Sticker Name</Label>
                <Input
                  value={editingSticker.name}
                  onChange={(e) => setEditingSticker({ ...editingSticker, name: e.target.value })}
                  placeholder="Friendly Ghost"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Description (Optional)</Label>
                  {editImagePreview && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => generateDescription(editImagePreview, true)}
                      disabled={generatingDescription}
                    >
                      {generatingDescription ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate with AI
                    </Button>
                  )}
                </div>
                <Textarea
                  value={editingSticker.description || ""}
                  onChange={(e) => setEditingSticker({ ...editingSticker, description: e.target.value })}
                  placeholder="A cheerful pumpkin with rosy cheeks"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Visual Style</Label>
                  <Select
                    value={editingSticker.visual_style}
                    onValueChange={(value) => setEditingSticker({ ...editingSticker, visual_style: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cute_kawaii">Cute Kawaii</SelectItem>
                      <SelectItem value="spooky_classic">Spooky Classic</SelectItem>
                      <SelectItem value="glitter">Glitter Effect</SelectItem>
                      <SelectItem value="animated">Animated Style</SelectItem>
                      <SelectItem value="joy_house">Joy House Themed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rarity</Label>
                  <Select
                    value={editingSticker.rarity}
                    onValueChange={(value: any) => setEditingSticker({ ...editingSticker, rarity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(rarityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label} ({config.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Sticker Image</Label>
                <Input type="file" accept="image/*" onChange={handleEditImageChange} />
                {editImagePreview && (
                  <div className="mt-2">
                    <img src={editImagePreview} alt="Preview" className="w-32 h-32 object-contain border rounded" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to keep current image
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSticker(null);
                    setEditStickerImage(null);
                    setEditImagePreview("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={updateSticker} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Sticker
                </Button>
              </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Test Pack Opening Dialog */}
        {testCardId && (
          <PackOpeningDialog
            open={showTestScratch}
            onOpenChange={setShowTestScratch}
            cardId={testCardId}
            onOpened={handleTestCardScratched}
          />
        )}

        {/* Reset Daily Cards Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Daily Cards</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Choose who should have their daily cards reset for today:
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => resetDailyCards('self')}
                  disabled={loading}
                >
                  <div className="space-y-1">
                    <div className="font-semibold">Only Me</div>
                    <div className="text-xs text-muted-foreground">
                      Reset only your daily card. You'll be able to get a new pack today.
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => resetDailyCards('admins')}
                  disabled={loading}
                >
                  <div className="space-y-1">
                    <div className="font-semibold">All Admins & Owners</div>
                    <div className="text-xs text-muted-foreground">
                      Reset daily cards for all admin and owner accounts. Useful for testing.
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    if (confirm('⚠️ This will reset daily cards for ALL USERS. Everyone will be able to get new packs today. Are you sure?')) {
                      resetDailyCards('all');
                    }
                  }}
                  disabled={loading}
                >
                  <div className="space-y-1">
                    <div className="font-semibold">All Users</div>
                    <div className="text-xs">
                      ⚠️ Reset daily cards for everyone in the system. Use with caution!
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };