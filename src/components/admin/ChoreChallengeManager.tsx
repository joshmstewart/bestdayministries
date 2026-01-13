import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Image, Sticker, Eye, EyeOff, Save, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";


interface BackgroundOption {
  id: string;
  name: string;
  image_url: string;
}

interface StickerElement {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

interface ChallengeTheme {
  id: string;
  month: number;
  year: number;
  name: string;
  description: string | null;
  background_options: BackgroundOption[];
  sticker_elements: StickerElement[];
  badge_name: string;
  badge_icon: string;
  badge_description: string | null;
  coin_reward: number;
  days_required: number;
  is_active: boolean;
  created_at: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_STICKER_CATEGORIES = ['Characters', 'Nature', 'Objects', 'Decorations', 'Weather'];

export function ChoreChallengeManager() {
  const [themes, setThemes] = useState<ChallengeTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ChallengeTheme | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [badgeName, setBadgeName] = useState('');
  const [badgeIcon, setBadgeIcon] = useState('⭐');
  const [badgeDescription, setBadgeDescription] = useState('');
  const [coinReward, setCoinReward] = useState(100);
  const [daysRequired, setDaysRequired] = useState(15);
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
  const [stickers, setStickers] = useState<StickerElement[]>([]);

  const loadThemes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chore_challenge_themes')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map(t => ({
        ...t,
        background_options: (t.background_options as unknown as BackgroundOption[]) || [],
        sticker_elements: (t.sticker_elements as unknown as StickerElement[]) || [],
      }));

      setThemes(parsed);
    } catch (error) {
      console.error('Error loading themes:', error);
      toast.error('Failed to load challenge themes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
  }, []);

  const resetForm = () => {
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setName('');
    setDescription('');
    setBadgeName('');
    setBadgeIcon('⭐');
    setBadgeDescription('');
    setCoinReward(100);
    setDaysRequired(15);
    setBackgrounds([]);
    setStickers([]);
    setEditingTheme(null);
  };

  const openEdit = (theme: ChallengeTheme) => {
    setEditingTheme(theme);
    setMonth(theme.month);
    setYear(theme.year);
    setName(theme.name);
    setDescription(theme.description || '');
    setBadgeName(theme.badge_name);
    setBadgeIcon(theme.badge_icon);
    setBadgeDescription(theme.badge_description || '');
    setCoinReward(theme.coin_reward);
    setDaysRequired(theme.days_required);
    setBackgrounds(theme.background_options);
    setStickers(theme.sticker_elements);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !badgeName.trim()) {
      toast.error('Name and badge name are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        month,
        year,
        name: name.trim(),
        description: description.trim() || null,
        badge_name: badgeName.trim(),
        badge_icon: badgeIcon,
        badge_description: badgeDescription.trim() || null,
        coin_reward: coinReward,
        days_required: daysRequired,
        background_options: JSON.parse(JSON.stringify(backgrounds)),
        sticker_elements: JSON.parse(JSON.stringify(stickers)),
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (editingTheme) {
        const { error } = await supabase
          .from('chore_challenge_themes')
          .update(payload)
          .eq('id', editingTheme.id);

        if (error) throw error;
        toast.success('Challenge theme updated!');
      } else {
        const { error } = await supabase
          .from('chore_challenge_themes')
          .insert(payload);

        if (error) {
          if (error.code === '23505') {
            toast.error('A theme already exists for this month');
            return;
          }
          throw error;
        }
        toast.success('Challenge theme created!');
      }

      setDialogOpen(false);
      resetForm();
      loadThemes();
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (theme: ChallengeTheme) => {
    try {
      const { error } = await supabase
        .from('chore_challenge_themes')
        .update({ is_active: !theme.is_active })
        .eq('id', theme.id);

      if (error) throw error;
      toast.success(theme.is_active ? 'Theme deactivated' : 'Theme activated');
      loadThemes();
    } catch (error) {
      console.error('Error toggling theme:', error);
      toast.error('Failed to update theme');
    }
  };

  const deleteTheme = async (theme: ChallengeTheme) => {
    if (!confirm(`Delete "${theme.name}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('chore_challenge_themes')
        .delete()
        .eq('id', theme.id);

      if (error) throw error;
      toast.success('Theme deleted');
      loadThemes();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error('Failed to delete theme');
    }
  };

  // Background management
  const addBackground = () => {
    setBackgrounds([...backgrounds, {
      id: crypto.randomUUID(),
      name: '',
      image_url: ''
    }]);
  };

  const updateBackground = (index: number, field: keyof BackgroundOption, value: string) => {
    const updated = [...backgrounds];
    updated[index] = { ...updated[index], [field]: value };
    setBackgrounds(updated);
  };

  const removeBackground = (index: number) => {
    setBackgrounds(backgrounds.filter((_, i) => i !== index));
  };

  // Sticker management
  const addSticker = () => {
    setStickers([...stickers, {
      id: crypto.randomUUID(),
      name: '',
      image_url: '',
      category: 'Objects'
    }]);
  };

  const updateSticker = (index: number, field: keyof StickerElement, value: string) => {
    const updated = [...stickers];
    updated[index] = { ...updated[index], [field]: value };
    setStickers(updated);
  };

  const removeSticker = (index: number) => {
    setStickers(stickers.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monthly Challenges</h2>
          <p className="text-muted-foreground">
            Create themed scene-building challenges for each month
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Challenge
        </Button>
      </div>

      {themes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sticker className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No challenges yet. Create your first monthly challenge theme!</p>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Days Required</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {themes.map(theme => (
              <TableRow key={theme.id}>
                <TableCell>
                  {MONTHS[theme.month - 1]} {theme.year}
                </TableCell>
                <TableCell className="font-medium">{theme.name}</TableCell>
                <TableCell>
                  <span className="text-xl mr-2">{theme.badge_icon}</span>
                  {theme.badge_name}
                </TableCell>
                <TableCell>{theme.days_required} days</TableCell>
                <TableCell>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      {theme.background_options.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sticker className="h-3 w-3" />
                      {theme.sticker_elements.length}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={theme.is_active ? "default" : "secondary"}>
                    {theme.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => toggleActive(theme)}
                      title={theme.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {theme.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openEdit(theme)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => deleteTheme(theme)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTheme ? 'Edit Challenge Theme' : 'Create Challenge Theme'}
            </DialogTitle>
            <DialogDescription>
              Configure the monthly challenge with backgrounds and stickers
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input 
                    type="number" 
                    value={year} 
                    onChange={e => setYear(Number(e.target.value))}
                    min={2024}
                    max={2030}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Theme Name *</Label>
                <Input 
                  placeholder="Winter Wonderland"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Build your perfect winter scene!"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Badge & Rewards */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Badge & Rewards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Badge Icon (emoji)</Label>
                      <Input 
                        value={badgeIcon}
                        onChange={e => setBadgeIcon(e.target.value)}
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Badge Name *</Label>
                      <Input 
                        placeholder="Snow Artist"
                        value={badgeName}
                        onChange={e => setBadgeName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Badge Description</Label>
                    <Input 
                      placeholder="Completed the Winter Wonderland challenge"
                      value={badgeDescription}
                      onChange={e => setBadgeDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Coin Reward</Label>
                      <Input 
                        type="number"
                        value={coinReward}
                        onChange={e => setCoinReward(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Days Required</Label>
                      <Input 
                        type="number"
                        value={daysRequired}
                        onChange={e => setDaysRequired(Number(e.target.value))}
                        min={1}
                        max={31}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Backgrounds */}
              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Backgrounds ({backgrounds.length})
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={addBackground}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {backgrounds.length === 0 && (
                    <p className="text-sm text-muted-foreground">No backgrounds yet. Add some scene backgrounds!</p>
                  )}
                  {backgrounds.map((bg, i) => (
                    <div key={bg.id} className="flex gap-2 items-start">
                      <Input
                        placeholder="Name"
                        value={bg.name}
                        onChange={e => updateBackground(i, 'name', e.target.value)}
                        className="w-32"
                      />
                      <Input
                        placeholder="Image URL"
                        value={bg.image_url}
                        onChange={e => updateBackground(i, 'image_url', e.target.value)}
                        className="flex-1"
                      />
                      {bg.image_url && (
                        <img src={bg.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <Button size="icon" variant="ghost" onClick={() => removeBackground(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Stickers */}
              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sticker className="h-4 w-4" />
                    Stickers ({stickers.length})
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={addSticker}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stickers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No stickers yet. Add elements users can place!</p>
                  )}
                  {stickers.map((sticker, i) => (
                    <div key={sticker.id} className="flex gap-2 items-start">
                      <Input
                        placeholder="Name"
                        value={sticker.name}
                        onChange={e => updateSticker(i, 'name', e.target.value)}
                        className="w-28"
                      />
                      <Select 
                        value={sticker.category} 
                        onValueChange={v => updateSticker(i, 'category', v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_STICKER_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Image URL"
                        value={sticker.image_url}
                        onChange={e => updateSticker(i, 'image_url', e.target.value)}
                        className="flex-1"
                      />
                      {sticker.image_url && (
                        <img src={sticker.image_url} alt="" className="w-10 h-10 rounded object-contain bg-muted" />
                      )}
                      <Button size="icon" variant="ghost" onClick={() => removeSticker(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Challenge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
