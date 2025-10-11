import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Store, ArrowLeft } from "lucide-react";
import joyHouseLogo from "@/assets/joy-house-logo-full.png";
import { useQuery } from "@tanstack/react-query";

const VendorAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch the logo from database
  const { data: logoData } = useQuery({
    queryKey: ['app-logo'],
    queryFn: async () => {
      const { data } = await supabase
        .rpc('get_public_app_settings')
        .returns<Array<{ setting_key: string; setting_value: any }>>();
      
      const logoSetting = data?.find((s) => s.setting_key === 'logo_url');
      
      if (logoSetting?.setting_value) {
        try {
          return typeof logoSetting.setting_value === 'string' 
            ? JSON.parse(logoSetting.setting_value) 
            : logoSetting.setting_value;
        } catch {
          return logoSetting.setting_value;
        }
      }
      return null;
    }
  });

  const logoUrl = logoData || joyHouseLogo;

  useEffect(() => {
    // Check if user is already logged in as vendor
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Check if they're already a vendor
        supabase
          .from('vendors')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data: vendor }) => {
            if (vendor) {
              navigate("/vendor-dashboard", { replace: true });
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event === 'SIGNED_IN') {
        // They just signed in, check vendor status
        supabase
          .from('vendors')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data: vendor }) => {
            if (vendor) {
              navigate("/vendor-dashboard", { replace: true });
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleVendorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role: 'supporter', // Default role for vendors
          },
          emailRedirectTo: `${window.location.origin}/vendor-dashboard`,
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Failed to create user");

      // Create vendor record with pending status
      const { error: vendorError } = await supabase
        .from('vendors')
        .insert({
          user_id: data.user.id,
          business_name: businessName,
          status: 'pending',
        });

      if (vendorError) throw vendorError;

      toast({
        title: "Vendor Application Submitted!",
        description: "Your application is pending admin approval. You'll be notified once approved.",
      });

      // Redirect to vendor dashboard to show pending status
      navigate("/vendor-dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if they're a vendor
      if (data.user) {
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (vendorError) throw vendorError;

        if (!vendor) {
          // They have an account but aren't a vendor
          await supabase.auth.signOut();
          toast({
            title: "Not a Vendor",
            description: "This account is not registered as a vendor. Please sign up as a vendor first.",
            variant: "destructive",
          });
          setIsSignUp(true);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Redirecting to your vendor dashboard...",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md border-2 shadow-xl relative z-10">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Store className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-primary">Vendor Portal</span>
            </div>
            
            <img 
              src={logoUrl} 
              alt="Best Day Ministries" 
              className="h-16 mx-auto object-contain"
            />
            
            <div>
              <h1 className="text-3xl font-black text-foreground mb-2">
                {isSignUp ? "Become a Vendor" : "Vendor Sign In"}
              </h1>
              <p className="text-muted-foreground">
                {isSignUp 
                  ? "Apply to become a vendor and sell your products. You'll need an account first - if you don't have one, create it at regular login." 
                  : "Sign in to manage your vendor account and products"}
              </p>
            </div>
          </div>

          <form onSubmit={isSignUp ? handleVendorSignUp : handleVendorSignIn} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Your Name</Label>
                  <Input
                    id="displayName"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Your Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vendor@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {isSignUp && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">Application Process:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Submit your vendor application</li>
                  <li>Admin reviews your application</li>
                  <li>Receive approval notification</li>
                  <li>Start selling in the marketplace!</li>
                </ul>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary via-accent to-secondary border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
              disabled={loading}
            >
              {loading ? "Please wait..." : isSignUp ? "Submit Application" : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-semibold"
            >
              {isSignUp 
                ? "Already a vendor? Sign in" 
                : "Need to apply? Sign up"}
            </button>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regular User Login
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorAuth;
