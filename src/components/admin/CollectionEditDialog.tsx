import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";

type UserRole = "supporter" | "bestie" | "caregiver" | "moderator" | "admin" | "owner";

const USER_ROLES = [
  { value: "supporter" as UserRole, label: "Supporter" },
  { value: "bestie" as UserRole, label: "Bestie" },
  { value: "caregiver" as UserRole, label: "Caregiver" },
  { value: "admin" as UserRole, label: "Admin" },
  { value: "owner" as UserRole, label: "Owner" },
];

interface CollectionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: any;
  onSaved: () => void;
}

export const CollectionEditDialog = ({ open, onOpenChange, collection, onSaved }: CollectionEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Roles
  const [visibleToRoles, setVisibleToRoles] = useState<UserRole[]>([]);
  
  // Settings
  const [stickersPerPack, setStickersPerPack] = useState(1);
  
  // Rarity
  const [useDefaultRarity, setUseDefaultRarity] = useState(false);
  const [rarityPercentages, setRarityPercentages] = useState({
    common: 50,
    uncommon: 30,
    rare: 15,
    epic: 4,
    legendary: 1
  });
  
  // Pack Assets
  const [packImage, setPackImage] = useState<File | null>(null);
  const [packImagePreview, setPackImagePreview] = useState<string>("");
  const [packAnimation, setPackAnimation] = useState<File | null>(null);
  const [packAnimationPreview, setPackAnimationPreview] = useState<string>("");

  useEffect(() => {
    if (collection && open) {
      setName(collection.name || "");
      setDescription(collection.description || "");
      setTheme(collection.theme || "");
      setStartDate(collection.start_date || "");
      setEndDate(collection.end_date || "");
      setVisibleToRoles(collection.visible_to_roles || ["admin", "owner"]);
      setStickersPerPack(collection.stickers_per_pack || 1);
      setUseDefaultRarity(collection.use_default_rarity || false);
      setRarityPercentages(collection.rarity_percentages || {
        common: 50,
        uncommon: 30,
        rare: 15,
        epic: 4,
        legendary: 1
      });
      setPackImagePreview(collection.pack_image_url || "");
      setPackAnimationPreview(collection.pack_animation_url || "");
      setPackImage(null);
      setPackAnimation(null);
    }
  }, [collection, open]);

  const handleSave = async () => {
    if (!name || !theme) {
      toast({ title: "Error", description: "Name and theme are required", variant: "destructive" });
      return;
    }

    // Validate rarity percentages if not using defaults
    if (!useDefaultRarity) {
      const total = Object.values(rarityPercentages).reduce((sum, val) => sum + val, 0);
      if (Math.abs(total - 100) > 0.01) {
        toast({ title: "Error", description: "Rarity percentages must sum to 100%", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      let packImageUrl = collection.pack_image_url;
      let packAnimationUrl = collection.pack_animation_url;

      // Upload new pack image if provided
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

      // Upload new pack animation if provided
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

      // Update collection
      const { error } = await supabase
        .from('sticker_collections')
        .update({
          name,
          description,
          theme,
          start_date: startDate,
          end_date: endDate || null,
          visible_to_roles: visibleToRoles as any,
          stickers_per_pack: stickersPerPack,
          use_default_rarity: useDefaultRarity,
          rarity_percentages: rarityPercentages,
          pack_image_url: packImageUrl,
          pack_animation_url: packAnimationUrl,
        })
        .eq('id', collection.id);

      if (error) throw error;

      toast({ title: "Success", description: "Collection updated successfully!" });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating collection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearPackAsset = async (type: 'image' | 'animation') => {
    try {
      const updateData = type === 'image' 
        ? { pack_image_url: null }
        : { pack_animation_url: null };

      const { error } = await supabase
        .from('sticker_collections')
        .update(updateData)
        .eq('id', collection.id);

      if (error) throw error;

      if (type === 'image') {
        setPackImagePreview("");
      } else {
        setPackAnimationPreview("");
      }

      toast({ title: "Success", description: `Pack ${type} cleared` });
      onSaved();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to clear pack ${type}`,
        variant: "destructive",
      });
    }
  };

  const loadDefaultRates = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'default_rarity_percentages')
        .maybeSingle();
      
      if (data?.setting_value) {
        setRarityPercentages(data.setting_value as any);
        toast({ title: "Success", description: "Loaded default rarity percentages" });
      }
    } catch (error) {
      console.error('Error loading default rates:', error);
    }
  };

  const total = Object.values(rarityPercentages).reduce((sum, val) => sum + val, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Collection: {collection?.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="rarity">Rarity</TabsTrigger>
            <TabsTrigger value="pack">Pack Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Collection Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Halloween 2025"
                />
              </div>
              <div>
                <Label>Theme</Label>
                <Input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="halloween"
                />
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Spooky stickers for Halloween!"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4 mt-4">
            <Label className="text-sm">Visible to Roles</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Only users with selected roles will be able to see and open packs from this collection
            </p>
            <div className="grid grid-cols-3 gap-3">
              {USER_ROLES.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={visibleToRoles.includes(role.value)}
                    onCheckedChange={(checked) => {
                      const newRoles = checked
                        ? [...visibleToRoles, role.value]
                        : visibleToRoles.filter(r => r !== role.value);
                      setVisibleToRoles(newRoles);
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
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="stickers-per-pack">Stickers Per Pack</Label>
              <Input
                id="stickers-per-pack"
                type="number"
                min="1"
                max="10"
                value={stickersPerPack}
                onChange={(e) => setStickersPerPack(parseInt(e.target.value) || 1)}
                className="w-32 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of stickers revealed when opening a pack (1-10)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="rarity" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Rarity Drop Rates</Label>
                <p className="text-xs text-muted-foreground">Configure drop rates for this collection</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="use-defaults" className="text-sm cursor-pointer">
                  Use Defaults
                </Label>
                <Switch
                  id="use-defaults"
                  checked={useDefaultRarity}
                  onCheckedChange={setUseDefaultRarity}
                />
              </div>
            </div>

            {useDefaultRarity ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-primary/5 border-primary/20">
                <Badge variant="outline" className="border-primary/40">
                  Using Defaults
                </Badge>
                <p className="text-xs text-muted-foreground">
                  This collection automatically uses default rarity percentages. Changes to defaults apply instantly.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Adjust percentages for each rarity level. Must sum to 100%.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadDefaultRates}
                  >
                    Load Defaults
                  </Button>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(rarityPercentages).map(([rarity, value]) => (
                    <div key={rarity} className="space-y-2">
                      <Label className="capitalize text-xs">{rarity}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={value}
                          onChange={(e) => setRarityPercentages({
                            ...rarityPercentages,
                            [rarity]: parseFloat(e.target.value) || 0
                          })}
                          className="text-xs"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <span className="text-sm font-medium">Total:</span>
                  <span className={`text-sm font-bold ${Math.abs(total - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {total.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="pack" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Upload custom images/animations for pack opening. Leave blank to keep current assets or use default sticker collage.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Current Pack Image */}
              <div className="space-y-2">
                <Label>Current Pack Image</Label>
                {packImagePreview ? (
                  <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                    <img src={packImagePreview} alt="Current pack" className="w-full h-full object-cover" />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => clearPackAsset('image')}
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
                {packAnimationPreview ? (
                  <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border">
                    {packAnimationPreview.includes('.mp4') || packAnimationPreview.includes('.webm') ? (
                      <video src={packAnimationPreview} className="w-full h-full object-cover" autoPlay loop muted />
                    ) : (
                      <img src={packAnimationPreview} alt="Current animation" className="w-full h-full object-cover" />
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => clearPackAsset('animation')}
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

            <div className="grid grid-cols-2 gap-4">
              {/* Upload New Pack Image */}
              <div className="space-y-2">
                <Label>Upload New Pack Image</Label>
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
                      setPackAnimation(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setPackAnimationPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
