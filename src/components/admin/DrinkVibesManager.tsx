import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Sparkles, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";

interface Vibe {
  id: string;
  name: string;
  description: string;
  atmosphere_hint: string;
  emoji: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface VibeFormData {
  name: string;
  description: string;
  atmosphere_hint: string;
  emoji: string;
  is_active: boolean;
}

const defaultFormData: VibeFormData = {
  name: "",
  description: "",
  atmosphere_hint: "",
  emoji: "✨",
  is_active: true,
};

export const DrinkVibesManager = () => {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVibe, setCurrentVibe] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  // CRUD state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVibe, setEditingVibe] = useState<Vibe | null>(null);
  const [formData, setFormData] = useState<VibeFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVibes();
  }, []);

  const loadVibes = async () => {
    const { data, error } = await supabase
      .from("drink_vibes")
      .select("*")
      .order("display_order");

    if (error) {
      console.error("Error loading vibes:", error);
      showErrorToastWithCopy("Loading vibes", error);
    } else {
      const vibesWithCacheBust = (data || []).map(vibe => ({
        ...vibe,
        image_url: vibe.image_url ? `${vibe.image_url.split('?')[0]}?t=${Date.now()}` : null
      }));
      setVibes(vibesWithCacheBust);
    }
    setLoading(false);
  };

  const generateIcon = async (vibe: Vibe): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-vibe-icon", {
        body: {
          vibeId: vibe.id,
          vibeName: vibe.name,
          atmosphereHint: vibe.atmosphere_hint,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error generating icon for ${vibe.name}:`, error);
      return false;
    }
  };

  const handleGenerateMissing = async () => {
    const vibesWithoutIcons = vibes.filter((v) => !v.image_url);
    if (vibesWithoutIcons.length === 0) {
      toast.info("All vibes already have icons!");
      return;
    }

    setGenerating(true);
    setProgress(0);

    let successCount = 0;
    for (let i = 0; i < vibesWithoutIcons.length; i++) {
      const vibe = vibesWithoutIcons[i];
      setCurrentVibe(vibe.name);
      setProgress(((i + 1) / vibesWithoutIcons.length) * 100);

      const success = await generateIcon(vibe);
      if (success) successCount++;

      if (i < vibesWithoutIcons.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setGenerating(false);
    setCurrentVibe(null);
    await loadVibes();

    toast.success(`Generated ${successCount}/${vibesWithoutIcons.length} vibe icons`);
  };

  const handleRegenerate = async (vibe: Vibe) => {
    setRegenerating(vibe.id);

    await supabase
      .from("drink_vibes")
      .update({ image_url: null })
      .eq("id", vibe.id);

    const success = await generateIcon(vibe);
    
    if (success) {
      toast.success(`Regenerated icon for ${vibe.name}`);
      await loadVibes();
    } else {
      showErrorToast(`Failed to regenerate icon for ${vibe.name}`);
    }

    setRegenerating(null);
  };

  // CRUD handlers
  const openAddDialog = () => {
    setEditingVibe(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (vibe: Vibe) => {
    setEditingVibe(vibe);
    setFormData({
      name: vibe.name,
      description: vibe.description,
      atmosphere_hint: vibe.atmosphere_hint,
      emoji: vibe.emoji || "✨",
      is_active: vibe.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showErrorToast("Name is required");
      return;
    }
    if (!formData.description.trim()) {
      showErrorToast("Description is required");
      return;
    }
    if (!formData.atmosphere_hint.trim()) {
      showErrorToast("Atmosphere hint is required");
      return;
    }

    setSaving(true);

    try {
      if (editingVibe) {
        const { error } = await supabase
          .from("drink_vibes")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim(),
            atmosphere_hint: formData.atmosphere_hint.trim(),
            emoji: formData.emoji.trim() || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingVibe.id);

        if (error) throw error;
        toast.success("Vibe updated!");
      } else {
        const { data: maxOrderData } = await supabase
          .from("drink_vibes")
          .select("display_order")
          .order("display_order", { ascending: false })
          .limit(1)
          .single();

        const newOrder = (maxOrderData?.display_order || 0) + 1;

        const { error } = await supabase
          .from("drink_vibes")
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim(),
            atmosphere_hint: formData.atmosphere_hint.trim(),
            emoji: formData.emoji.trim() || null,
            is_active: formData.is_active,
            display_order: newOrder,
          });

        if (error) throw error;
        toast.success("Vibe added!");
      }

      setIsDialogOpen(false);
      await loadVibes();
    } catch (error) {
      console.error("Error saving vibe:", error);
      showErrorToastWithCopy("Saving vibe", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vibe: Vibe) => {
    if (!confirm(`Delete "${vibe.name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("drink_vibes")
      .delete()
      .eq("id", vibe.id);

    if (error) {
      showErrorToastWithCopy("Deleting vibe", error);
      console.error(error);
    } else {
      toast.success("Vibe deleted");
      await loadVibes();
    }
  };

  const toggleActive = async (vibe: Vibe) => {
    const { error } = await supabase
      .from("drink_vibes")
      .update({ is_active: !vibe.is_active, updated_at: new Date().toISOString() })
      .eq("id", vibe.id);

    if (error) {
      showErrorToastWithCopy("Toggling vibe", error);
    } else {
      setVibes(prev => 
        prev.map(v => v.id === vibe.id ? { ...v, is_active: !vibe.is_active } : v)
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const vibesWithoutIcons = vibes.filter((v) => !v.image_url);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Drink Vibes</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateMissing}
                disabled={generating || vibesWithoutIcons.length === 0}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Missing ({vibesWithoutIcons.length})
                  </>
                )}
              </Button>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vibe
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage vibes/moods for the Drink Creator game. Vibes help users describe the atmosphere of their drink.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generating && (
            <div className="mb-6 space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Generating icon for: {currentVibe}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {vibes.map((vibe) => (
              <div
                key={vibe.id}
                className={`group relative flex flex-col items-center p-3 border rounded-lg hover:border-primary transition-colors ${
                  !vibe.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center mb-2 relative">
                  {vibe.image_url ? (
                    <img
                      src={vibe.image_url}
                      alt={vibe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{vibe.emoji || "✨"}</span>
                  )}
                </div>
                <span className="text-xs text-center font-medium truncate w-full">
                  {vibe.name}
                </span>
                {!vibe.image_url && (
                  <span className="text-xs text-muted-foreground">No icon</span>
                )}
                {!vibe.is_active && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Hidden
                  </span>
                )}

                {/* Action buttons on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(vibe)}
                    title="Edit"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleRegenerate(vibe)}
                    disabled={regenerating === vibe.id}
                    title="Regenerate icon"
                  >
                    {regenerating === vibe.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => toggleActive(vibe)}
                    title={vibe.is_active ? "Hide" : "Show"}
                  >
                    {vibe.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDelete(vibe)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVibe ? "Edit Vibe" : "Add Vibe"}</DialogTitle>
            <DialogDescription>
              {editingVibe ? "Update the vibe details below." : "Add a new vibe/mood for the Drink Creator."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cozy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Warm and comfortable, like a blanket"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atmosphere_hint">Atmosphere Hint *</Label>
              <Input
                id="atmosphere_hint"
                value={formData.atmosphere_hint}
                onChange={(e) => setFormData({ ...formData, atmosphere_hint: e.target.value })}
                placeholder="e.g., warm fireplace, soft blankets, gentle rain"
              />
              <p className="text-xs text-muted-foreground">Used for AI icon generation - describe the visual feeling</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                placeholder="✨"
                className="w-20"
              />
              <p className="text-xs text-muted-foreground">Shown as fallback if no icon exists</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingVibe ? "Save Changes" : "Add Vibe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
