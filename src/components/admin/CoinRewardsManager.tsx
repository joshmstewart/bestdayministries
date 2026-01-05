import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Edit, Coins, Gamepad2, Calendar, Heart, Plus } from "lucide-react";

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
  games: { label: "Games", icon: <Gamepad2 className="w-4 h-4" />, color: "bg-blue-100 text-blue-800" },
  daily: { label: "Daily", icon: <Calendar className="w-4 h-4" />, color: "bg-green-100 text-green-800" },
  pets: { label: "Pets", icon: <Heart className="w-4 h-4" />, color: "bg-pink-100 text-pink-800" },
  other: { label: "Other", icon: <Coins className="w-4 h-4" />, color: "bg-gray-100 text-gray-800" },
};

export const CoinRewardsManager = () => {
  const [rewards, setRewards] = useState<CoinReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<CoinReward | null>(null);
  const [formData, setFormData] = useState({
    reward_key: "",
    reward_name: "",
    description: "",
    coins_amount: 0,
    is_active: true,
    category: "other",
  });

  useEffect(() => {
    loadRewards();
  }, []);

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
    try {
      const { error } = await supabase
        .from("coin_rewards_settings")
        .update({ coins_amount: newAmount, updated_at: new Date().toISOString() })
        .eq("id", reward.id);

      if (error) throw error;

      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, coins_amount: newAmount } : r))
      );
      toast.success("Coins updated");
    } catch (error) {
      console.error("Failed to update coins:", error);
      showErrorToast("Failed to update coins");
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
                            if (val !== reward.coins_amount) {
                              updateCoins(reward, val);
                            }
                          }}
                          className="w-20 text-center"
                        />
                        <Coins className="w-4 h-4 text-yellow-500" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={reward.is_active}
                        onCheckedChange={() => toggleActive(reward)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openDialog(reward)}
                        title="Edit reward"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="games">Games</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="pets">Pets</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
