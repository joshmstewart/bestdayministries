import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SectionLoadingState } from "@/components/common";

export const DefaultRaritySettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [percentages, setPercentages] = useState({
    common: 50,
    uncommon: 30,
    rare: 15,
    epic: 4,
    legendary: 1,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'default_rarity_percentages')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setPercentages(data.setting_value as any);
      }
    } catch (error: any) {
      console.error('Error loading default rarity settings:', error);
      toast({
        title: "Error",
        description: "Failed to load default rarity percentages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate that percentages add up to 100
    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      toast({
        title: "Invalid Percentages",
        description: `Percentages must add up to 100%. Currently: ${total}%`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          setting_value: percentages,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'default_rarity_percentages');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default rarity percentages saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving default rarity settings:', error);
      toast({
        title: "Error",
        description: "Failed to save default rarity percentages",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (rarity: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setPercentages(prev => ({
      ...prev,
      [rarity]: Math.max(0, Math.min(100, numValue)), // Clamp between 0-100
    }));
  };

  const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <SectionLoadingState />
        </CardContent>
      </Card>
    );
  }

  const getSummary = () => {
    return `Common: ${percentages.common}%, Uncommon: ${percentages.uncommon}%, Rare: ${percentages.rare}%, Epic: ${percentages.epic}%, Legendary: ${percentages.legendary}%`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Default Drop Rate Percentages</CardTitle>
            <CardDescription>
              {isOpen ? (
                "Set the default drop rate percentages for all new sticker collections. These can be overridden per collection."
              ) : (
                getSummary()
              )}
            </CardDescription>
          </div>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </CardHeader>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Common - most common */}
          <div className="space-y-2">
            <Label htmlFor="common" className="capitalize">Common</Label>
            <div className="flex items-center gap-2">
              <Input
                id="common"
                type="number"
                min="0"
                max="100"
                value={percentages.common}
                onChange={(e) => handleChange('common', e.target.value)}
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Uncommon */}
          <div className="space-y-2">
            <Label htmlFor="uncommon" className="capitalize">Uncommon</Label>
            <div className="flex items-center gap-2">
              <Input
                id="uncommon"
                type="number"
                min="0"
                max="100"
                value={percentages.uncommon}
                onChange={(e) => handleChange('uncommon', e.target.value)}
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Rare */}
          <div className="space-y-2">
            <Label htmlFor="rare" className="capitalize">Rare</Label>
            <div className="flex items-center gap-2">
              <Input
                id="rare"
                type="number"
                min="0"
                max="100"
                value={percentages.rare}
                onChange={(e) => handleChange('rare', e.target.value)}
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Epic */}
          <div className="space-y-2">
            <Label htmlFor="epic" className="capitalize">Epic</Label>
            <div className="flex items-center gap-2">
              <Input
                id="epic"
                type="number"
                min="0"
                max="100"
                value={percentages.epic}
                onChange={(e) => handleChange('epic', e.target.value)}
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Legendary - least common, spans full width on small screens */}
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label htmlFor="legendary" className="capitalize">Legendary</Label>
            <div className="flex items-center gap-2">
              <Input
                id="legendary"
                type="number"
                min="0"
                max="100"
                value={percentages.legendary}
                onChange={(e) => handleChange('legendary', e.target.value)}
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Total:</span>
            <span className={`text-sm font-bold ${total === 100 ? 'text-green-600' : 'text-red-600'}`}>
              {total}%
            </span>
            {total !== 100 && (
              <span className="text-xs text-muted-foreground">(must equal 100%)</span>
            )}
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || total !== 100}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Defaults
              </>
            )}
          </Button>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
