import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Fallback route for /share — redirects to the generate-meta-tags edge function.
 * This handles the case where Cloudflare's redirect rule doesn't intercept the request
 * (e.g., when the domain isn't proxied or rules aren't firing).
 * 
 * The edge function serves HTML with OG meta tags for crawlers, then redirects
 * real users to the actual content page via window.location.replace.
 */
export default function ShareRedirect() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-meta-tags?${searchParams.toString()}`;
    window.location.replace(edgeFunctionUrl);
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
