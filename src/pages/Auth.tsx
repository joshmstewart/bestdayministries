import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Users, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import joyHouseLogo from "@/assets/joy-house-logo-full.png";
import { useQuery } from "@tanstack/react-query";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"bestie" | "caregiver" | "supporter">("supporter");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch the logo from database
  const { data: logoData } = useQuery({
    queryKey: ['app-logo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings_public')
        .select('setting_value')
        .eq('setting_key', 'logo_url')
        .maybeSingle();
      
      if (data?.setting_value) {
        try {
          return typeof data.setting_value === 'string' 
            ? JSON.parse(data.setting_value) 
            : data.setting_value;
        } catch {
          return data.setting_value;
        }
      }
      return null;
    }
  });

  const logoUrl = logoData || joyHouseLogo;

  useEffect(() => {
    console.log('🎬 Auth page mounted, setting up redirect logic');
    
    const checkAndRedirect = async (userId: string) => {
      console.log('🔍 Starting checkAndRedirect for user:', userId);
      console.log('⏰ Timestamp:', new Date().toISOString());
      
      try {
        console.log('📡 About to query vendors table...');
        const { data: vendor, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        console.log('📊 Vendor query completed:', { 
          vendor, 
          error, 
          hasVendor: !!vendor,
          vendorStatus: vendor?.status 
        });
        
        if (!error && vendor) {
          console.log('✅ Vendor found with status:', vendor.status);
          console.log('🚀 Navigating to /vendor-dashboard');
          navigate("/vendor-dashboard", { replace: true });
        } else {
          console.log('❌ No vendor found or error occurred');
          if (error) console.error('Query error:', error);
          console.log('🚀 Navigating to /community');
          navigate("/community", { replace: true });
        }
      } catch (err) {
        console.error('💥 Exception in checkAndRedirect:', err);
        navigate("/community", { replace: true });
      }
    };

    // Check if user is already logged in
    console.log('🔄 Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('👤 Found existing session for user:', session.user.id);
        checkAndRedirect(session.user.id);
      } else {
        console.log('❎ No existing session found');
      }
    });

    console.log('👂 Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.id);
      if (session?.user) {
        checkAndRedirect(session.user.id);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              role: role,
              avatar_url: selectedAvatar ? `avatar-${selectedAvatar}` : null,
            },
            emailRedirectTo: `${window.location.origin}/community`,
          },
        });

        if (error) throw error;

        toast({
          title: "Welcome to Best Day Ministries!",
          description: "Your account has been created successfully.",
        });
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Immediately check vendor status after successful login
        if (data.user) {
          console.log('✅ Login successful! Checking vendor status for:', data.user.id);
          
          const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .select('status')
            .eq('user_id', data.user.id)
            .maybeSingle();
          
          console.log('🏪 Vendor check result:', { vendor, vendorError });
          
          if (!vendorError && vendor) {
            console.log('🎉 Vendor found! Redirecting to dashboard...');
            navigate("/vendor-dashboard");
            toast({
              title: "Welcome back!",
              description: "Redirecting to your vendor dashboard...",
            });
            return; // Exit early to prevent further processing
          }
        }

        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
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
            <img 
              src={logoUrl} 
              alt="Best Day Ministries" 
              className="h-16 mx-auto object-contain"
            />
            <div>
              <h1 className="text-3xl font-black text-foreground mb-2">
                {isForgotPassword ? "Reset Password" : isSignUp ? "Join Our Community" : "Welcome Back"}
              </h1>
              <p className="text-muted-foreground">
                {isForgotPassword
                  ? "Enter your email to receive a password reset link"
                  : isSignUp 
                    ? "Create your account to connect with our community" 
                    : "Sign in to access your Best Day Ministries community"}
              </p>
            </div>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary via-accent to-secondary border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary hover:underline font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>

                <AvatarPicker 
                  selectedAvatar={selectedAvatar}
                  onSelectAvatar={setSelectedAvatar}
                />

                <div className="space-y-2">
                  <Label htmlFor="role">I am a...</Label>
                  <Select value={role} onValueChange={(value: any) => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bestie">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-primary" />
                          <span>Bestie (Community Member)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="caregiver">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-secondary" />
                          <span>Caregiver (Parent/Guardian)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="supporter">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-accent" />
                          <span>Supporter (Volunteer/Friend)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary via-accent to-secondary border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
              disabled={loading}
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
          )}

          {!isForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-semibold"
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <Button
              variant="outline"
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

export default Auth;
