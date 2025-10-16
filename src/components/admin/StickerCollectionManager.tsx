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
import { Loader2, Plus, Trash2, Upload, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  
  // Collection form
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    description: "",
    theme: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
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
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sticker_number');

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setStickers(data || []);
  };

  const createCollection = async () => {
    if (!collectionForm.name || !collectionForm.theme) {
      toast({ title: "Error", description: "Name and theme are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('sticker_collections')
      .insert({
        ...collectionForm,
        end_date: collectionForm.end_date || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Collection created!" });
    setCollectionForm({ name: "", description: "", theme: "", start_date: new Date().toISOString().split('T')[0], end_date: "" });
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
              <Button onClick={createCollection} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {collections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-4 border rounded">
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
                        onClick={() => toggleCollectionActive(collection.id, collection.is_active)}
                      >
                        {collection.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stickers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Sticker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Collection</Label>
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
              </div>

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

          {selectedCollection && stickers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stickers in Collection ({stickers.length}/25)</CardTitle>
              </CardHeader>
              <CardContent>
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