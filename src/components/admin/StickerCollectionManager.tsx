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
import { Loader2, Plus, Trash2, Upload, Eye, EyeOff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

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

export const StickerCollectionManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [stickers, setStickers] = useState<any[]>([]);
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  
  // Collection form
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    description: "",
    theme: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    visible_to_roles: ["admin", "owner"] as UserRole[],
  });

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

  useEffect(() => {
    fetchCollections();
  }, []);

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

  const resetDailyCards = async () => {
    if (!confirm('This will reset all daily scratch cards for today. Users will be able to get new cards. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-daily-cards');

      if (error) throw error;

      toast({
        title: "Success!",
        description: data.message || "All daily cards have been reset",
      });
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

    setLoading(true);
    const { data, error } = await supabase
      .from('sticker_collections')
      .insert([{
        name: collectionForm.name,
        description: collectionForm.description,
        theme: collectionForm.theme,
        start_date: collectionForm.start_date,
        end_date: collectionForm.end_date || null,
        visible_to_roles: collectionForm.visible_to_roles as any,
      }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Collection created!" });
    setCollectionForm({ 
      name: "", 
      description: "", 
      theme: "", 
      start_date: new Date().toISOString().split('T')[0], 
      end_date: "",
      visible_to_roles: ["admin", "owner"]
    });
    fetchCollections();
    setSelectedCollection(data.id);
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
      // Upload image
      const fileExt = stickerImage.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('sticker-images')
        .upload(fileName, stickerImage);

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
          ...stickerForm,
        });

      if (insertError) throw insertError;

      toast({ title: "Success", description: "Sticker uploaded!" });
      setStickerForm({
        name: "",
        description: "",
        rarity: "common",
        visual_style: "",
        sticker_number: stickerForm.sticker_number + 1,
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
      <Tabs defaultValue="collections">
        <TabsList>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="stickers">Stickers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Collection</CardTitle>
              <CardDescription>Set up a new sticker collection</CardDescription>
            </CardHeader>
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
                  Only users with selected roles will be able to see and scratch cards from this collection
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={createCollection} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
                <Button 
                  onClick={seedHalloweenCollection} 
                  disabled={loading}
                  variant="secondary"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Sparkles className="mr-2 h-4 w-4" />
                  Seed Halloween Collection
                </Button>
                <Button 
                  onClick={updateToV2Stickers} 
                  disabled={loading || !selectedCollection}
                  variant="default"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Sparkles className="mr-2 h-4 w-4" />
                  Update to V2 Kawaii Stickers
                </Button>
                <Button 
                  onClick={resetDailyCards} 
                  disabled={loading}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Daily Cards (Testing)
                </Button>
              </div>
            </CardContent>
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
                          onClick={() => toggleCollectionActive(collection.id, collection.is_active)}
                        >
                          {collection.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                          Only users with selected roles will see and scratch cards from this collection
                        </p>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sticker Name</Label>
                      <Input
                        value={stickerForm.name}
                        onChange={(e) => setStickerForm({ ...stickerForm, name: e.target.value })}
                        placeholder="Glittery Ghost"
                      />
                    </div>
                    <div>
                      <Label>Sticker Number</Label>
                      <Input
                        type="number"
                        value={stickerForm.sticker_number}
                        onChange={(e) => setStickerForm({ ...stickerForm, sticker_number: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
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
              </CardHeader>
              <CardContent>
                {stickers.length > 0 ? (
                  <div className="grid grid-cols-5 gap-4">
                    {stickers.map((sticker) => (
                      <div key={sticker.id} className="relative group">
                        <img
                          src={sticker.image_url}
                          alt={sticker.name}
                          className="w-full aspect-square object-contain border rounded"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <div className="text-white text-sm text-center px-2">
                            #{sticker.sticker_number} {sticker.name}
                          </div>
                          <Badge className={rarityConfig[sticker.rarity as keyof typeof rarityConfig].color}>
                            {sticker.rarity}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => toggleStickerActive(sticker.id, sticker.is_active)}
                            >
                              {sticker.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteSticker(sticker.id, sticker.image_url)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
};