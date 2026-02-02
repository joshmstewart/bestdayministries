import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingProgress {
  id: string;
  vendor_id: string;
  completed_steps: string[];
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

interface AutoDetectedStatus {
  stripeConnected: boolean;
  hasProducts: boolean;
}

export const useVendorOnboardingProgress = (vendorId: string | null) => {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [autoDetected, setAutoDetected] = useState<AutoDetectedStatus>({
    stripeConnected: false,
    hasProducts: false
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProgress = useCallback(async () => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel
      const [progressResult, vendorResult, productsResult] = await Promise.all([
        supabase
          .from('vendor_onboarding_progress')
          .select('*')
          .eq('vendor_id', vendorId)
          .maybeSingle(),
        supabase
          .from('vendors')
          .select('stripe_charges_enabled')
          .eq('id', vendorId)
          .single(),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
      ]);

      if (progressResult.error) throw progressResult.error;
      setProgress(progressResult.data);

      // Set auto-detected status
      setAutoDetected({
        stripeConnected: vendorResult.data?.stripe_charges_enabled === true,
        hasProducts: (productsResult.count ?? 0) > 0
      });
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Merge manual completions with auto-detected completions
  const effectiveCompletedSteps = useMemo(() => {
    const manual = progress?.completed_steps || [];
    const autoSteps: string[] = [];
    
    if (autoDetected.stripeConnected && !manual.includes('stripe-connect')) {
      autoSteps.push('stripe-connect');
    }
    if (autoDetected.hasProducts && !manual.includes('first-product')) {
      autoSteps.push('first-product');
    }
    
    return [...new Set([...manual, ...autoSteps])];
  }, [progress?.completed_steps, autoDetected]);

  const toggleStep = useCallback(async (stepId: string) => {
    if (!vendorId) return;

    // Don't allow unchecking auto-detected steps
    if (
      (stepId === 'stripe-connect' && autoDetected.stripeConnected) ||
      (stepId === 'first-product' && autoDetected.hasProducts)
    ) {
      return;
    }

    const currentSteps = progress?.completed_steps || [];
    const isCompleted = currentSteps.includes(stepId);
    const newSteps = isCompleted
      ? currentSteps.filter(s => s !== stepId)
      : [...currentSteps, stepId];

    // Optimistic update
    setProgress(prev => prev 
      ? { ...prev, completed_steps: newSteps }
      : {
          id: '',
          vendor_id: vendorId,
          completed_steps: newSteps,
          is_dismissed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
    );

    try {
      if (progress?.id) {
        // Update existing record
        const { error } = await supabase
          .from('vendor_onboarding_progress')
          .update({ 
            completed_steps: newSteps,
            updated_at: new Date().toISOString()
          })
          .eq('id', progress.id);

        if (error) throw error;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('vendor_onboarding_progress')
          .insert({
            vendor_id: vendorId,
            completed_steps: newSteps
          })
          .select()
          .single();

        if (error) throw error;
        setProgress(data);
      }
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      // Revert optimistic update
      setProgress(prev => prev ? { ...prev, completed_steps: currentSteps } : null);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive"
      });
    }
  }, [vendorId, progress, autoDetected, toast]);

  const setDismissed = useCallback(async (dismissed: boolean) => {
    if (!vendorId) return;

    // Optimistic update
    setProgress(prev => prev ? { ...prev, is_dismissed: dismissed } : null);

    try {
      if (progress?.id) {
        const { error } = await supabase
          .from('vendor_onboarding_progress')
          .update({ 
            is_dismissed: dismissed,
            updated_at: new Date().toISOString()
          })
          .eq('id', progress.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('vendor_onboarding_progress')
          .insert({
            vendor_id: vendorId,
            completed_steps: [],
            is_dismissed: dismissed
          })
          .select()
          .single();

        if (error) throw error;
        setProgress(data);
      }
    } catch (error) {
      console.error('Error updating dismissed state:', error);
      // Revert
      setProgress(prev => prev ? { ...prev, is_dismissed: !dismissed } : null);
      toast({
        title: "Error",
        description: "Failed to update guide state",
        variant: "destructive"
      });
    }
  }, [vendorId, progress, toast]);

  return {
    completedSteps: effectiveCompletedSteps,
    autoDetectedSteps: {
      'stripe-connect': autoDetected.stripeConnected,
      'first-product': autoDetected.hasProducts
    },
    isDismissed: progress?.is_dismissed || false,
    loading,
    toggleStep,
    setDismissed,
    refetch: fetchProgress
  };
};
