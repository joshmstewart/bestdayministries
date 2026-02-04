import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Check, Coins, Flame, Gift } from "lucide-react";

interface StreakMilestone {
  id: string;
  days_required: number;
  bonus_coins: number;
  free_sticker_packs: number;
  badge_name: string;
  badge_icon: string | null;
  description: string | null;
  is_active: boolean;
}

export const StreakMilestonesManager = () => {
  const [milestones, setMilestones] = useState<StreakMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    const { data, error } = await supabase
      .from("streak_milestones")
      .select("*")
      .order("days_required", { ascending: true });

    if (error) {
      showErrorToast("Failed to load streak milestones");
      console.error(error);
    } else {
      setMilestones(data || []);
    }
    setLoading(false);
  };

  const updateMilestone = async (
    milestone: StreakMilestone,
    field: "bonus_coins" | "free_sticker_packs",
    value: number
  ) => {
    setSavingId(milestone.id);
    setSavingField(field);
    
    try {
      const { error } = await supabase
        .from("streak_milestones")
        .update({ [field]: value })
        .eq("id", milestone.id);

      if (error) throw error;

      setMilestones((prev) =>
        prev.map((m) => (m.id === milestone.id ? { ...m, [field]: value } : m))
      );

      // Brief delay to show the checkmark
      setTimeout(() => {
        setSavingId(null);
        setSavingField(null);
      }, 1000);
    } catch (error) {
      console.error("Failed to update milestone:", error);
      showErrorToast("Failed to update milestone");
      setSavingId(null);
      setSavingField(null);
    }
  };

  const toggleActive = async (milestone: StreakMilestone) => {
    try {
      const { error } = await supabase
        .from("streak_milestones")
        .update({ is_active: !milestone.is_active })
        .eq("id", milestone.id);

      if (error) throw error;

      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestone.id ? { ...m, is_active: !m.is_active } : m
        )
      );
      toast.success(`Milestone ${!milestone.is_active ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to toggle milestone:", error);
      showErrorToast("Failed to update milestone");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-destructive" />
          Login Streak Milestones
        </CardTitle>
        <CardDescription>
          Configure coin rewards and sticker packs for login streak achievements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Milestone</TableHead>
              <TableHead>Days</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  Coins
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Gift className="w-4 h-4 text-primary" />
                  Sticker Packs
                </div>
              </TableHead>
              <TableHead className="w-24 text-center">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((milestone) => (
              <TableRow key={milestone.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{milestone.badge_icon}</span>
                    <div>
                      <p className="font-medium">{milestone.badge_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono">{milestone.days_required}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={milestone.bonus_coins}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setMilestones((prev) =>
                          prev.map((m) =>
                            m.id === milestone.id ? { ...m, bonus_coins: val } : m
                          )
                        );
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateMilestone(milestone, "bonus_coins", val);
                      }}
                      className="w-20 text-center"
                    />
                    {savingId === milestone.id && savingField === "bonus_coins" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Coins className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={milestone.free_sticker_packs}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setMilestones((prev) =>
                          prev.map((m) =>
                            m.id === milestone.id
                              ? { ...m, free_sticker_packs: val }
                              : m
                          )
                        );
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateMilestone(milestone, "free_sticker_packs", val);
                      }}
                      className="w-20 text-center"
                    />
                    {savingId === milestone.id && savingField === "free_sticker_packs" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Gift className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={milestone.is_active}
                    onCheckedChange={() => toggleActive(milestone)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {milestones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Flame className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No streak milestones configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
