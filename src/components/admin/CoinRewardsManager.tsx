import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Edit, Coins, Gamepad2, Calendar, Heart, Plus, Check, Trash2, Upload, Image } from "lucide-react";
import { invalidateCoinCache } from "@/components/CoinIcon";
import defaultCoinImage from "@/assets/joycoin.png";

interface CoinReward {
  id: string;
  reward_key: string;
  reward_name: string;
  description: string | null;
  coins_amount: number;
  is_active: boolean;
  category: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  // App-specific categories
  cash_register: { label: "Cash Register", icon: <Coins className="w-4 h-4" />, color: "bg-emerald-100 text-emerald-800" },
  memory_match: { label: "Memory Match", icon: <Gamepad2 className="w-4 h-4" />, color: "bg-blue-100 text-blue-800" },
  beat_pad: { label: "Beat Pad", icon: <Gamepad2 className="w-4 h-4" />, color: "bg-purple-100 text-purple-800" },
  recipe_pal: { label: "Recipe Pal", icon: <Gamepad2 className="w-4 h-4" />, color: "bg-orange-100 text-orange-800" },
  drink_creator: { label: "Drink Creator", icon: <Gamepad2 className="w-4 h-4" />, color: "bg-cyan-100 text-cyan-800" },
  chores: { label: "Chores", icon: <Calendar className="w-4 h-4" />, color: "bg-amber-100 text-amber-800" },
  fitness: { label: "Fitness", icon: <Heart className="w-4 h-4" />, color: "bg-red-100 text-red-800" },
  stickers: { label: "Stickers", icon: <Coins className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-800" },
  pets: { label: "Pets", icon: <Heart className="w-4 h-4" />, color: "bg-pink-100 text-pink-800" },
  community: { label: "Community", icon: <Calendar className="w-4 h-4" />, color: "bg-indigo-100 text-indigo-800" },
  // Legacy categories for backward compat
  games: { label: "Games (Other)", icon: <Gamepad2 className="w-4 h-4" />, color: "bg-slate-100 text-slate-800" },
  daily: { label: "Daily", icon: <Calendar className="w-4 h-4" />, color: "bg-green-100 text-green-800" },
  other: { label: "Other", icon: <Coins className="w-4 h-4" />, color: "bg-gray-100 text-gray-800" },
};

// Preset reward templates for quick adding - organized by app
const PRESET_REWARDS = [
  // Cash Register
  { key: "cash_register_complete", name: "Complete Level", description: "Complete a Cash Register level", category: "cash_register", coins: 5 },
  { key: "cash_register_first_game", name: "First Game", description: "Complete your first Cash Register level (one-time)", category: "cash_register", coins: 50 },
  { key: "cash_register_level_record", name: "Just Play Level Record", description: "Beat your best level in Just Play mode", category: "cash_register", coins: 15 },
  { key: "time_trial_record", name: "Time Trial Record", description: "Beat your personal best in Time Trial mode", category: "cash_register", coins: 25 },
  { key: "time_trial_complete", name: "Complete Time Trial", description: "Complete any Time Trial session", category: "cash_register", coins: 5 },
  { key: "time_trial_top_3", name: "Time Trial Top 3", description: "Monthly top 3 on Time Trial leaderboard", category: "cash_register", coins: 100 },
  { key: "time_trial_top_5", name: "Time Trial Top 5", description: "Monthly top 5 on Time Trial leaderboard", category: "cash_register", coins: 50 },
  { key: "time_trial_top_10", name: "Time Trial Top 10", description: "Monthly top 10 on Time Trial leaderboard", category: "cash_register", coins: 25 },
  
  // Memory Match
  { key: "memory_match_easy", name: "Easy Complete", description: "Complete an easy Memory Match game", category: "memory_match", coins: 5 },
  { key: "memory_match_medium", name: "Medium Complete", description: "Complete a medium Memory Match game", category: "memory_match", coins: 10 },
  { key: "memory_match_hard", name: "Hard Complete", description: "Complete a hard Memory Match game", category: "memory_match", coins: 20 },
  { key: "memory_match_perfect", name: "Perfect Game", description: "Complete Memory Match without mistakes", category: "memory_match", coins: 25 },
  
  // Beat Pad
  { key: "beat_pad_create", name: "Create Beat", description: "Create a new beat", category: "beat_pad", coins: 10 },
  { key: "beat_pad_share", name: "Share Beat", description: "Share beat with community", category: "beat_pad", coins: 5 },
  
  // Recipe Pal
  { key: "recipe_complete", name: "Complete Recipe", description: "Complete a recipe in Recipe Pal", category: "recipe_pal", coins: 10 },
  { key: "recipe_created", name: "Recipe Created", description: "Create a new recipe", category: "recipe_pal", coins: 10 },
  { key: "recipe_made", name: "Recipe Made", description: "Mark a recipe as made", category: "recipe_pal", coins: 5 },
  { key: "recipe_saved", name: "Recipe Saved", description: "Save a recipe to cookbook", category: "recipe_pal", coins: 3 },
  
  // Drink Creator
  { key: "drink_created", name: "Create Drink", description: "Create a custom drink", category: "drink_creator", coins: 10 },
  
  // Chores
  { key: "chore_complete", name: "Complete Chore", description: "Complete a chore", category: "chores", coins: 5 },
  { key: "chore_streak", name: "Chore Streak", description: "Maintain a chore streak", category: "chores", coins: 10 },
  
  // Fitness
  { key: "workout_complete", name: "Complete Workout", description: "Complete a workout", category: "fitness", coins: 10 },
  { key: "weekly_goal", name: "Weekly Goal", description: "Meet weekly fitness goal", category: "fitness", coins: 50 },
  
  // Stickers
  { key: "sticker_rare", name: "Rare Sticker", description: "Found a rare sticker", category: "stickers", coins: 15 },
  { key: "sticker_epic", name: "Epic Sticker", description: "Found an epic sticker", category: "stickers", coins: 25 },
  { key: "sticker_legendary", name: "Legendary Sticker", description: "Found a legendary sticker", category: "stickers", coins: 50 },
  { key: "collection_complete", name: "Collection Complete", description: "Complete a sticker collection", category: "stickers", coins: 200 },
  
  // Pets
  { key: "pet_feed", name: "Feed Pet", description: "Feed your virtual pet", category: "pets", coins: 2 },
  { key: "pet_play", name: "Play with Pet", description: "Play with your virtual pet", category: "pets", coins: 3 },
  { key: "pet_groom", name: "Groom Pet", description: "Groom your virtual pet", category: "pets", coins: 2 },
  { key: "pet_levelup", name: "Pet Level Up", description: "Your pet reached a new level", category: "pets", coins: 25 },
  
  // Community
  { key: "discussion_post", name: "Create Post", description: "Create a new discussion post", category: "community", coins: 10 },
  { key: "discussion_comment", name: "Comment", description: "Leave a comment on a post", category: "community", coins: 5 },
  { key: "event_attend", name: "Event RSVP", description: "RSVP to an event", category: "community", coins: 10 },
  { key: "album_upload", name: "Album Upload", description: "Upload photos to an album", category: "community", coins: 5 },
  { key: "share_content", name: "Share Content", description: "Share content with friends", category: "community", coins: 5 },
  
  // Daily
  { key: "daily_login", name: "Daily Login", description: "Reward for logging in each day", category: "daily", coins: 10 },
  { key: "first_login", name: "First Time Login", description: "Welcome bonus for new users", category: "daily", coins: 50 },
  { key: "weekly_streak", name: "Weekly Streak", description: "Bonus for 7 consecutive days", category: "daily", coins: 100 },
  { key: "monthly_streak", name: "Monthly Streak", description: "Bonus for 30 consecutive days", category: "daily", coins: 500 },
  
  // Other
  { key: "profile_complete", name: "Complete Profile", description: "Fill out all profile information", category: "other", coins: 50 },
  { key: "referral_signup", name: "Referral Signup", description: "Someone you referred signed up", category: "other", coins: 100 },
  { key: "video_watch", name: "Watch Video", description: "Watch a video to completion", category: "other", coins: 3 },
  { key: "puzzle_complete", name: "Puzzle Complete", description: "Complete a puzzle game", category: "games", coins: 15 },
  { key: "trivia_correct", name: "Trivia Correct", description: "Answer a trivia question correctly", category: "games", coins: 5 },
  { key: "trivia_streak", name: "Trivia Streak", description: "Multiple correct answers in a row", category: "games", coins: 20 },
];

export const CoinRewardsManager = () => {
  const [rewards, setRewards] = useState<CoinReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<CoinReward | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [formData, setFormData] = useState({
    reward_key: "",
    reward_name: "",
    description: "",
    coins_amount: 0,
    is_active: true,
    category: "other",
  });
  
  // Custom coin image state
  const [customCoinUrl, setCustomCoinUrl] = useState<string | null>(null);
  const [uploadingCoin, setUploadingCoin] = useState(false);
  const coinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRewards();
    loadCustomCoinImage();
  }, []);
  
  const loadCustomCoinImage = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "custom_coin_image")
      .maybeSingle();
    
    const settingValue = data?.setting_value as { url?: string } | null;
    if (settingValue?.url) {
      setCustomCoinUrl(settingValue.url);
    }
  };
  
  const handleCoinImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    setUploadingCoin(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `custom-coin-${Date.now()}.${fileExt}`;
      const filePath = `coin-icons/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Save to app_settings
      const { error: settingsError } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "custom_coin_image",
          setting_value: { url: publicUrl },
          updated_at: new Date().toISOString(),
        }, { onConflict: "setting_key" });
      
      if (settingsError) throw settingsError;
      
      setCustomCoinUrl(publicUrl);
      invalidateCoinCache();
      toast.success("Custom coin image uploaded!");
    } catch (error) {
      console.error("Failed to upload coin image:", error);
      showErrorToast("Failed to upload coin image");
    } finally {
      setUploadingCoin(false);
      if (coinInputRef.current) coinInputRef.current.value = "";
    }
  };
  
  const handleRemoveCoinImage = async () => {
    try {
      await supabase
        .from("app_settings")
        .delete()
        .eq("setting_key", "custom_coin_image");
      
      setCustomCoinUrl(null);
      invalidateCoinCache();
      toast.success("Custom coin image removed");
    } catch (error) {
      console.error("Failed to remove coin image:", error);
      showErrorToast("Failed to remove coin image");
    }
  };

  const loadRewards = async () => {
    const { data, error } = await supabase
      .from("coin_rewards_settings")
      .select("*")
      .order("category", { ascending: true })
      .order("reward_name", { ascending: true });

    if (error) {
      showErrorToast("Failed to load coin rewards");
      console.error(error);
    } else {
      setRewards(data || []);
    }
    setLoading(false);
  };

  const openDialog = (reward?: CoinReward) => {
    if (reward) {
      setEditingReward(reward);
      setSelectedPreset("");
      setFormData({
        reward_key: reward.reward_key,
        reward_name: reward.reward_name,
        description: reward.description || "",
        coins_amount: reward.coins_amount,
        is_active: reward.is_active,
        category: reward.category,
      });
    } else {
      setEditingReward(null);
      setSelectedPreset("");
      setFormData({
        reward_key: "",
        reward_name: "",
        description: "",
        coins_amount: 0,
        is_active: true,
        category: "other",
      });
    }
    setDialogOpen(true);
  };

  const handlePresetSelect = (presetKey: string) => {
    const preset = PRESET_REWARDS.find((p) => p.key === presetKey);
    if (preset) {
      setSelectedPreset(presetKey);
      setFormData({
        reward_key: preset.key,
        reward_name: preset.name,
        description: preset.description,
        coins_amount: preset.coins,
        is_active: true,
        category: preset.category,
      });
    }
  };

  // Get available presets (not already in rewards)
  const availablePresets = PRESET_REWARDS.filter(
    (preset) => !rewards.some((r) => r.reward_key === preset.key)
  );

  const handleSave = async () => {
    if (!formData.reward_key.trim() || !formData.reward_name.trim()) {
      showErrorToast("Key and name are required");
      return;
    }

    setSaving(true);
    try {
      if (editingReward) {
        const { error } = await supabase
          .from("coin_rewards_settings")
          .update({
            reward_name: formData.reward_name.trim(),
            description: formData.description.trim() || null,
            coins_amount: formData.coins_amount,
            is_active: formData.is_active,
            category: formData.category,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingReward.id);

        if (error) throw error;
        toast.success("Reward updated");
      } else {
        const { error } = await supabase
          .from("coin_rewards_settings")
          .insert({
            reward_key: formData.reward_key.trim().toLowerCase().replace(/\s+/g, "_"),
            reward_name: formData.reward_name.trim(),
            description: formData.description.trim() || null,
            coins_amount: formData.coins_amount,
            is_active: formData.is_active,
            category: formData.category,
          });

        if (error) throw error;
        toast.success("Reward created");
      }

      setDialogOpen(false);
      await loadRewards();
    } catch (error) {
      console.error("Failed to save reward:", error);
      showErrorToast("Failed to save reward");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (reward: CoinReward) => {
    try {
      const { error } = await supabase
        .from("coin_rewards_settings")
        .update({ is_active: !reward.is_active, updated_at: new Date().toISOString() })
        .eq("id", reward.id);

      if (error) throw error;

      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, is_active: !r.is_active } : r))
      );
      toast.success(`Reward ${!reward.is_active ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to toggle reward:", error);
      showErrorToast("Failed to update reward");
    }
  };

  const updateCoins = async (reward: CoinReward, newAmount: number) => {
    setSavingId(reward.id);
    try {
      const { error } = await supabase
        .from("coin_rewards_settings")
        .update({ coins_amount: newAmount, updated_at: new Date().toISOString() })
        .eq("id", reward.id);

      if (error) throw error;

      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, coins_amount: newAmount } : r))
      );
      
      // Brief delay to show the checkmark
      setTimeout(() => setSavingId(null), 1000);
    } catch (error) {
      console.error("Failed to update coins:", error);
      showErrorToast("Failed to update coins");
      setSavingId(null);
    }
  };

  const deleteReward = async (reward: CoinReward) => {
    if (!confirm(`Are you sure you want to delete "${reward.reward_name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from("coin_rewards_settings")
        .delete()
        .eq("id", reward.id);

      if (error) throw error;

      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
      toast.success("Reward deleted");
    } catch (error) {
      console.error("Failed to delete reward:", error);
      showErrorToast("Failed to delete reward");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group rewards by category
  const groupedRewards = rewards.reduce((acc, reward) => {
    const cat = reward.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(reward);
    return acc;
  }, {} as Record<string, CoinReward[]>);

  return (
    <div className="space-y-6">
      {/* Custom Coin Image Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Custom Coin Image
          </CardTitle>
          <CardDescription>
            Upload a custom image to use for coins throughout the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              <img 
                src={customCoinUrl || defaultCoinImage} 
                alt="Coin" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => coinInputRef.current?.click()}
                  disabled={uploadingCoin}
                >
                  {uploadingCoin ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Image
                </Button>
                {customCoinUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoinImage}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: PNG with transparent background, 512x512px
              </p>
            </div>
            <input
              ref={coinInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoinImageUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Coin Rewards</h3>
          <p className="text-sm text-muted-foreground">
            Configure how many coins users earn for different activities
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reward
        </Button>
      </div>

      {Object.entries(groupedRewards).map(([category, categoryRewards]) => {
        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={config.color}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32 text-center">Coins</TableHead>
                  <TableHead className="w-24 text-center">Active</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryRewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell className="font-medium">{reward.reward_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {reward.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          value={reward.coins_amount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setRewards((prev) =>
                              prev.map((r) =>
                                r.id === reward.id ? { ...r, coins_amount: val } : r
                              )
                            );
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            updateCoins(reward, val);
                          }}
                          className="w-20 text-center"
                        />
                        {savingId === reward.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Coins className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={reward.is_active}
                        onCheckedChange={() => toggleActive(reward)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openDialog(reward)}
                          title="Edit reward"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteReward(reward)}
                          title="Delete reward"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}

      {rewards.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No coin rewards configured yet</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? "Edit Reward" : "Add Reward"}</DialogTitle>
            <DialogDescription>
              Configure the coin reward for this activity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingReward && (
              <>
                {availablePresets.length > 0 && (
                  <div className="space-y-2">
                    <Label>Quick Add from Presets</Label>
                    <Select value={selectedPreset} onValueChange={handlePresetSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a preset reward..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {availablePresets.map((preset) => (
                          <SelectItem key={preset.key} value={preset.key}>
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{preset.name}</span>
                              <span className="text-muted-foreground text-xs">({preset.coins} coins)</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select a preset to auto-fill all fields, or create a custom reward below
                    </p>
                  </div>
                )}

                {/* Only show reward key for custom rewards (not presets) */}
                {!selectedPreset && (
                  <div className="space-y-2">
                    <Label htmlFor="reward-key">Reward Key</Label>
                    <Input
                      id="reward-key"
                      placeholder="e.g., new_game_bonus"
                      value={formData.reward_key}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, reward_key: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier used in code (lowercase, underscores)
                    </p>
                  </div>
                )}
                
                {selectedPreset && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Preset selected:</span> {formData.reward_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Key: <code className="bg-muted px-1 rounded">{formData.reward_key}</code>
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="reward-name">Display Name</Label>
              <Input
                id="reward-name"
                placeholder="e.g., New Game Bonus"
                value={formData.reward_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reward_name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-description">Description</Label>
              <Textarea
                id="reward-description"
                placeholder="Describe what triggers this reward..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coins-amount">Coins Amount</Label>
                <Input
                  id="coins-amount"
                  type="number"
                  min={0}
                  value={formData.coins_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      coins_amount: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      const newCategory = prompt("Enter new category name (lowercase):");
                      if (newCategory && newCategory.trim()) {
                        const formatted = newCategory.trim().toLowerCase().replace(/\s+/g, "_");
                        setFormData((prev) => ({ ...prev, category: formatted }));
                      }
                    } else {
                      setFormData((prev) => ({ ...prev, category: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* App-specific categories */}
                    <SelectItem value="cash_register">Cash Register</SelectItem>
                    <SelectItem value="memory_match">Memory Match</SelectItem>
                    <SelectItem value="beat_pad">Beat Pad</SelectItem>
                    <SelectItem value="recipe_pal">Recipe Pal</SelectItem>
                    <SelectItem value="drink_creator">Drink Creator</SelectItem>
                    <SelectItem value="chores">Chores</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="stickers">Stickers</SelectItem>
                    <SelectItem value="pets">Pets</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="games">Games (Other)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    {/* Show any custom categories already in use */}
                    {Array.from(new Set(rewards.map(r => r.category)))
                      .filter(c => !["cash_register", "memory_match", "beat_pad", "recipe_pal", "drink_creator", "chores", "fitness", "stickers", "pets", "community", "daily", "games", "other"].includes(c))
                      .map(customCat => (
                        <SelectItem key={customCat} value={customCat}>
                          {customCat.charAt(0).toUpperCase() + customCat.slice(1).replace(/_/g, " ")}
                        </SelectItem>
                      ))
                    }
                    <SelectItem value="__new__" className="text-primary font-medium">
                      + Create New Category...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Disabled rewards won't be given
                </p>
              </div>
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingReward ? "Save Changes" : "Create Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
