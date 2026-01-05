import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Users, Sparkles, Store, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { useQuery } from "@tanstack/react-query";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { playSound } = useSoundEffects();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"bestie" | "caregiver" | "supporter">("supporter");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(true);
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

  // Terms acceptance is recorded immediately after successful signup (see line ~142)
  // This ensures users don't see the terms dialog again after accepting during signup

  useEffect(() => {
    const redirectPath = searchParams.get('redirect');
    const bestieId = searchParams.get('bestieId');
    
    const checkAndRedirect = async (userId: string) => {
      try {
        // If there's a redirect path specified, use it
        if (redirectPath) {
          const fullPath = bestieId ? `${redirectPath}?bestieId=${bestieId}` : redirectPath;
          navigate(fullPath, { replace: true });
          return;
        }
        
        // All users go to community by default
        // Vendors can navigate to their dashboard manually
        navigate("/community", { replace: true });
      } catch (err) {
        navigate("/community", { replace: true });
      }
    };

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 AUTH PAGE: getSession result:', session ? 'HAS SESSION' : 'NO SESSION', session?.user?.email);
      if (session?.user) {
        console.log('🔍 AUTH PAGE: Redirecting authenticated user:', session.user.id);
        checkAndRedirect(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkAndRedirect(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 🔍 DEBUG: Log state values before submission
    console.log('🚀 FORM SUBMIT - State values:', {
      displayName,
      role,
      selectedAvatar,
      email,
      isSignUp
    });

    try {
      if (isSignUp) {
        if (!acceptedTerms) {
          toast({
            title: "Terms Required",
            description: "Please accept the Terms of Service and Privacy Policy to create an account.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
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

        // Record terms acceptance immediately after successful signup
        // AWAIT the edge function to ensure it completes before redirect
        if (data.user && acceptedTerms) {
          try {
            const termsResult = await supabase.functions.invoke("record-terms-acceptance", {
              body: {
                termsVersion: "1.0",
                privacyVersion: "1.0",
              },
            });
            
            if (termsResult.error) {
              console.error("⚠️  Terms recording failed:", termsResult.error);
              // Don't block signup, but log for monitoring
            } else {
              console.log('✅ Terms recorded successfully after signup');
            }
          } catch (termsError) {
            console.error("⚠️  Error recording terms:", termsError);
            // Don't block signup, but log for monitoring
          }
        }

        // Subscribe to newsletter if checked
        if (subscribeToNewsletter && data.user) {
          try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Use upsert to handle case where email already subscribed as guest
            await supabase.from("newsletter_subscribers").upsert({
              email,
              user_id: data.user.id,
              status: 'active',
              source: 'signup',
              timezone,
            }, {
              onConflict: 'email'
            });
            
            // Trigger welcome email
            setTimeout(() => {
              supabase.functions.invoke("send-automated-campaign", {
                body: {
                  trigger_event: "newsletter_signup",
                  recipient_email: email,
                  recipient_user_id: data.user?.id,
                },
              });
            }, 0);
          } catch (newsletterError) {
            console.error("Error subscribing to newsletter:", newsletterError);
            // Don't block signup if newsletter subscription fails
          }
        }
        
        // Trigger account created email
        setTimeout(() => {
          supabase.functions.invoke("send-automated-campaign", {
            body: {
              trigger_event: "site_signup",
              recipient_email: email,
              recipient_user_id: data.user?.id,
            },
          });
        }, 0);

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

        // Play login sound
        playSound('login');

        // Vendor status check will be handled by auth state listener
        // which will redirect appropriately

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
            {logoData && (
              <img 
                src={logoData} 
                alt="Best Day Ministries" 
                className="h-16 mx-auto object-contain"
              />
            )}
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
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-primary" />
                            <span className="font-semibold">Bestie (Adult with Special Needs)</span>
                          </div>
                          <span className="text-xs text-muted-foreground pl-6">
                            I'm an adult with special needs or a disability and want to share my story, connect with others, and participate in activities.
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="caregiver">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-secondary" />
                            <span className="font-semibold">Guardian</span>
                          </div>
                          <span className="text-xs text-muted-foreground pl-6">
                            I'm a family member, caregiver, or support person for a Bestie and want to manage their profile and help them stay connected.
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="supporter">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <span className="font-semibold">Supporter (Volunteer/Friend)</span>
                          </div>
                          <span className="text-xs text-muted-foreground pl-6">
                            I'm a volunteer, donor, or friend who wants to support the community, attend events, and stay connected.
                          </span>
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

            {isSignUp && (
              <>
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox 
                    id="newsletter" 
                    checked={subscribeToNewsletter}
                    onCheckedChange={(checked) => setSubscribeToNewsletter(checked as boolean)}
                  />
                  <label
                    htmlFor="newsletter"
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Send me monthly updates and inspiring stories
                  </label>
                </div>
                
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox 
                    id="terms" 
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                
                <div className="text-center pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1">
                        <Store className="h-4 w-4" />
                        Click here to become a vendor
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Store className="h-5 w-5 text-primary" />
                          Become a Vendor
                        </DialogTitle>
                        <DialogDescription className="space-y-3 pt-4">
                          <p>
                            You can sell your handmade products through our marketplace!
                          </p>
                          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            <p className="font-semibold text-foreground">How it works:</p>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                              <li>First, create your account using this form</li>
                              <li>After signing in, visit the Marketplace</li>
                              <li>Click "Become a Vendor" to apply</li>
                              <li>Once approved, manage your store and community participation from one account</li>
                            </ol>
                          </div>
                          <p className="text-sm">
                            Your account will give you access to both the community features and vendor tools once approved.
                          </p>
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary via-accent to-secondary border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
              disabled={loading || (isSignUp && !acceptedTerms)}
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>

            {!isSignUp && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="absolute inset-0 mx-auto w-10 bg-card" />
                  <span className="relative px-2 text-muted-foreground">Or</span>
                </div>
              </div>
            )}

            {!isSignUp && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-2"
                onClick={() => navigate("/auth/picture")}
              >
                <Sparkles className="w-4 h-4 text-primary" />
                Sign in with Pictures
              </Button>
            )}
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

export default Auth;
