import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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

export const StripeModeSwitcher = () => {
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
        .eq('setting_key', 'stripe_mode')
        .single();

      if (error) throw error;

      const mode = data?.setting_value || 'test';
      setCurrentMode(mode as 'test' | 'live');
    } catch (error) {
      console.error('Error loading Stripe mode:', error);
      toast.error('Failed to load Stripe mode');
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
        .update({ setting_value: `"${targetMode}"` })
        .eq('setting_key', 'stripe_mode');

      if (error) throw error;

      setCurrentMode(targetMode);
      toast.success(`Switched to ${targetMode.toUpperCase()} mode`, {
        description: targetMode === 'live' 
          ? 'All payments will now process real charges'
          : 'All payments will now use test cards only'
      });
    } catch (error) {
      console.error('Error switching Stripe mode:', error);
      toast.error('Failed to switch Stripe mode');
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
            {isLiveMode ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Stripe Mode:</span>
                <Badge variant={isLiveMode ? "destructive" : "default"}>
                  {currentMode.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isLiveMode 
                  ? '⚠️ Processing REAL payments with real cards'
                  : '✓ Using test mode - safe for testing with test cards'
                }
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleModeToggle}
            disabled={switching}
            variant={isLiveMode ? "outline" : "destructive"}
            size="sm"
          >
            {switching ? 'Switching...' : `Switch to ${isLiveMode ? 'Live' : 'Test'}`}
          </Button>
        </div>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch to {targetMode.toUpperCase()} Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">
                {targetMode === 'live' 
                  ? '⚠️ WARNING: This will enable REAL payment processing'
                  : 'This will switch back to test mode'
                }
              </p>
              <p>
                {targetMode === 'live' 
                  ? 'All sponsorships created after switching will charge REAL money from customers. Make sure you have entered your LIVE Stripe secret key.'
                  : 'All sponsorships will use test mode. Only test cards (like 4242 4242 4242 4242) will work.'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                This change affects the entire system. You cannot process test and live payments simultaneously.
              </p>
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