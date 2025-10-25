import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      // Check if user has accepted current version
      const { data, error } = await supabase
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
    } finally {
      setLoading(false);
    }
  };

  const recordAcceptance = async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    
    try {
      const { error } = await supabase.functions.invoke("record-terms-acceptance", {
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
        console.log(`Retrying terms acceptance in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
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