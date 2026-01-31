import { useEffect, useState } from "react";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { useToast } from "@/hooks/use-toast";

export const CURRENT_TERMS_VERSION = "1.0";
export const CURRENT_PRIVACY_VERSION = "1.0";

export const useTermsCheck = (userId: string | undefined) => {
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    checkTermsAcceptance();
  }, [userId]);

  const checkTermsAcceptance = async () => {
    try {
      // Defense-in-depth: verify we have a valid authenticated session before querying
      // This prevents false "needs acceptance" when auth is momentarily unavailable
      const { data: { user }, error: userError } = await supabasePersistent.auth.getUser();
      
      if (userError || !user) {
        console.log("[useTermsCheck] No valid user session, staying in loading state");
        // Don't set needsAcceptance to true - just stay loading until auth resolves
        return;
      }

      // Check if user has accepted current version using the persistent client
      const { data, error } = await supabasePersistent
        .from("terms_acceptance")
        .select("*")
        .eq("user_id", userId)
        .eq("terms_version", CURRENT_TERMS_VERSION)
        .eq("privacy_version", CURRENT_PRIVACY_VERSION)
        .maybeSingle();

      if (error) throw error;

      setNeedsAcceptance(!data);
    } catch (error) {
      console.error("Error checking terms acceptance:", error);
      // On error, don't show the modal - safer to assume accepted than block user
      setNeedsAcceptance(false);
    } finally {
      setLoading(false);
    }
  };

  const recordAcceptance = async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    
    try {
      // Use persistent client for consistency
      const { error } = await supabasePersistent.functions.invoke("record-terms-acceptance", {
        body: {
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
        },
      });

      if (error) throw error;

      setNeedsAcceptance(false);
      
      toast({
        title: "Terms Accepted",
        description: "Thank you for accepting our updated terms.",
      });
    } catch (error) {
      console.error("Error recording acceptance:", error);
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return recordAcceptance(retryCount + 1);
      }
      
      toast({
        title: "Error",
        description: "Failed to record acceptance. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { needsAcceptance, loading, recordAcceptance };
};
