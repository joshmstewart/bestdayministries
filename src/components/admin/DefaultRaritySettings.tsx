import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";

export const DefaultRaritySettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Drop Rate Percentages</CardTitle>
        <CardDescription>
          Set the default drop rate percentages for all new sticker collections. These can be overridden per collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(percentages).map(([rarity, value]) => (
            <div key={rarity} className="space-y-2">
              <Label htmlFor={rarity} className="capitalize">{rarity}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={rarity}
                  type="number"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => handleChange(rarity, e.target.value)}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
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
    </Card>
  );
};
