import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Users, Globe, Loader2 } from "lucide-react";

type AccessMode = 'open' | 'authenticated' | 'admins_only';

export const StoreAccessManager = () => {
  const [accessMode, setAccessMode] = useState<AccessMode>('open');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccessMode();
  }, []);

  const loadAccessMode = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'store_access_mode')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        const value = typeof data.setting_value === 'string' 
          ? data.setting_value 
          : JSON.stringify(data.setting_value).replace(/"/g, '');
        setAccessMode(value as AccessMode);
      }
    } catch (error) {
      console.error("Error loading store access mode:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveAccessMode = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'store_access_mode',
          setting_value: accessMode,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (error) throw error;
      
      toast.success("Store access mode updated");
    } catch (error) {
      console.error("Error saving store access mode:", error);
      toast.error("Failed to save store access mode");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Store Access Control
        </CardTitle>
        <CardDescription>
          Control who can access the Joy House Store. Use this for testing or maintenance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={accessMode} onValueChange={(v) => setAccessMode(v as AccessMode)}>
          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="open" id="open" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="open" className="flex items-center gap-2 cursor-pointer font-medium">
                <Globe className="h-4 w-4 text-green-600" />
                Open to Everyone
              </Label>
              <p className="text-sm text-muted-foreground">
                All visitors (including guests) can browse and shop
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="authenticated" id="authenticated" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="authenticated" className="flex items-center gap-2 cursor-pointer font-medium">
                <Users className="h-4 w-4 text-blue-600" />
                Logged-in Users Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only authenticated users can access the store
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="admins_only" id="admins_only" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="admins_only" className="flex items-center gap-2 cursor-pointer font-medium">
                <Lock className="h-4 w-4 text-orange-600" />
                Admins & Owners Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only admins and owners can access the store (for testing/maintenance)
              </p>
            </div>
          </div>
        </RadioGroup>

        <Button onClick={saveAccessMode} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};
