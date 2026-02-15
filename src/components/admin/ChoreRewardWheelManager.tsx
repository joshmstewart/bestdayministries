import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChoreRewardWheelDialog } from "@/components/chores/ChoreRewardWheelDialog";
import { PackOpeningDialog } from "@/components/PackOpeningDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { Badge } from "@/components/ui/badge";

interface WheelSegment {
  label: string;
  type: "coins" | "sticker_pack";
  amount: number;
  color: string;
  probability: number;
}

interface WheelConfig {
  active_preset: string;
  presets: {
    [key: string]: {
      name: string;
      description: string;
      segments: WheelSegment[];
    };
  };
}

export function ChoreRewardWheelManager() {
  const { user } = useAuth();
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [packCardId, setPackCardId] = useState<string | null>(null);
  const [showPackDialog, setShowPackDialog] = useState(false);

  const { data: configData, refetch: refetchConfig } = useQuery({
    queryKey: ["chore-wheel-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "chore_wheel_config")
        .maybeSingle();
      
      if (error) throw error;
      return data?.setting_value as unknown as WheelConfig | null;
    },
  });

  const { data: todaySpin, refetch: refetchSpin } = useQuery({
    queryKey: ["admin-today-spin", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get MST date
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const mstDate = formatter.format(new Date());

      const { data, error } = await supabase
        .from("chore_wheel_spins")
        .select("*")
        .eq("user_id", user.id)
        .eq("spin_date", mstDate)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleResetTodaySpin = async () => {
    if (!user?.id) return;
    
    setResetting(true);
    try {
      // Get MST date
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const mstDate = formatter.format(new Date());

      const { error } = await supabase
        .from("chore_wheel_spins")
        .delete()
        .eq("user_id", user.id)
        .eq("spin_date", mstDate);

      if (error) throw error;
      
      toast.success("Today's spin reset - you can test again!");
      refetchSpin();
    } catch (error) {
      console.error("Reset error:", error);
      showErrorToastWithCopy("Resetting spin", error);
    } finally {
      setResetting(false);
    }
  };

  const handlePrizeWon = (prizeType: string, amount: number, cardIds?: string[]) => {
    console.log("Test prize won:", { prizeType, amount, cardIds });
    refetchSpin();
  };

  const handleOpenStickerPack = (cardId: string) => {
    setPackCardId(cardId);
    setShowPackDialog(true);
  };

  const activePresetKey = configData?.active_preset || "balanced";
  const activePreset = configData?.presets?.[activePresetKey];

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Reward Wheel Configuration
            </CardTitle>
            <CardDescription>
              Test the reward wheel and view current configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Controls */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setTestDialogOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Test Reward Wheel
              </Button>

              {todaySpin && (
                <Button
                  variant="outline"
                  onClick={handleResetTodaySpin}
                  disabled={resetting}
                >
                  {resetting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Reset Today's Spin
                </Button>
              )}
            </div>

            {/* Today's Spin Status */}
            {todaySpin && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Your spin today:</p>
                <p className="text-muted-foreground">
                  Won {todaySpin.prize_amount} {todaySpin.prize_type === "coins" ? "coins" : "sticker pack(s)"}
                  {" "} at {new Date(todaySpin.created_at).toLocaleTimeString()}
                </p>
              </div>
            )}

            {/* Configuration Status */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Current Configuration</h4>
                {configData ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Active Preset: <Badge variant="outline">{activePresetKey}</Badge>
                    </p>
                    {activePreset && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {activePreset.name}: {activePreset.description}
                        </p>
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Wheel Segments:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {activePreset.segments?.map((segment, index) => (
                              <div
                                key={index}
                                className="p-2 rounded border text-sm flex items-center gap-2"
                                style={{ borderLeftColor: segment.color, borderLeftWidth: 4 }}
                              >
                                <span>{segment.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {(segment.probability * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-destructive">
                    ⚠️ No wheel configuration found in app_settings. 
                    The wheel needs a "chore_wheel_config" entry to work.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {user && (
        <ChoreRewardWheelDialog
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          userId={user.id}
          onPrizeWon={handlePrizeWon}
          onOpenStickerPack={handleOpenStickerPack}
        />
      )}

      {packCardId && (
        <PackOpeningDialog
          open={showPackDialog}
          onOpenChange={(open) => {
            setShowPackDialog(open);
            if (!open) setPackCardId(null);
          }}
          cardId={packCardId}
          onOpened={() => {}}
        />
      )}
    </>
  );
}
