import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const MarketplaceStripeModeSwitcher = () => {
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [targetMode, setTargetMode] = useState<'test' | 'live'>('test');

  useEffect(() => {
    loadCurrentMode();
  }, []);

  const loadCurrentMode = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'marketplace_stripe_mode')
        .single();

      if (error) {
        // If setting doesn't exist yet, default to test
        if (error.code === 'PGRST116') {
          setCurrentMode('test');
          return;
        }
        throw error;
      }

      let mode: 'test' | 'live' = 'test';
      if (data?.setting_value) {
        const rawValue = data.setting_value;
        const cleanValue = typeof rawValue === 'string' 
          ? rawValue.replace(/^"(.*)"$/, '$1')
          : String(rawValue);
      mode = (cleanValue === 'live' ? 'live' : 'test') as 'test' | 'live';
      }
      setCurrentMode(mode);
    } catch (error) {
      console.error('Error loading Marketplace Stripe mode:', error);
      toast.error('Failed to load Marketplace Stripe mode');
    } finally {
      setLoading(false);
    }
  };

  const handleModeToggle = () => {
    const newMode = currentMode === 'test' ? 'live' : 'test';
    setTargetMode(newMode);
    setShowConfirmDialog(true);
  };

  const confirmModeSwitch = async () => {
    setSwitching(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: targetMode })
        .eq('setting_key', 'marketplace_stripe_mode');

      if (error) throw error;

      setCurrentMode(targetMode);
      
      toast.success(`Marketplace switched to ${targetMode.toUpperCase()} mode`, {
        description: targetMode === 'live' 
          ? 'Marketplace payments will now process real charges'
          : 'Marketplace payments will now use test cards only'
      });
    } catch (error) {
      console.error('Error switching Marketplace Stripe mode:', error);
      toast.error('Failed to switch Marketplace Stripe mode');
    } finally {
      setSwitching(false);
      setShowConfirmDialog(false);
    }
  };

  if (loading) {
    return null;
  }

  const isLiveMode = currentMode === 'live';

  return (
    <>
      <Card className="p-4 border-2" style={{
        borderColor: isLiveMode ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
      }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className={`w-5 h-5 ${isLiveMode ? 'text-destructive' : 'text-primary'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Marketplace Mode:</span>
                <Badge variant={isLiveMode ? "destructive" : "default"}>
                  {currentMode.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isLiveMode 
                  ? '⚠️ Processing REAL marketplace payments'
                  : '✓ Using test mode for marketplace - safe for testing'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Donations & sponsorships use the main Stripe mode setting
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleModeToggle}
            disabled={switching}
            variant={isLiveMode ? "outline" : "destructive"}
            size="sm"
          >
            {switching ? 'Switching...' : `Switch to ${isLiveMode ? 'Test' : 'Live'}`}
          </Button>
        </div>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch Marketplace to {targetMode.toUpperCase()} Mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <div className="font-semibold">
                  {targetMode === 'live' 
                    ? '⚠️ WARNING: This will enable REAL payment processing for the marketplace'
                    : 'This will switch marketplace back to test mode'
                  }
                </div>
                <div>
                  {targetMode === 'live' 
                    ? 'All marketplace purchases after switching will charge REAL money. Make sure vendors are ready to receive payments.'
                    : 'All marketplace purchases will use test mode. Only test cards (like 4242 4242 4242 4242) will work.'
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  This only affects the marketplace. Donations and sponsorships are controlled separately.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmModeSwitch}
              className={targetMode === 'live' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {targetMode === 'live' ? 'Enable Live Mode' : 'Switch to Test Mode'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
