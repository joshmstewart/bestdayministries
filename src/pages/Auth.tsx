import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Users, Sparkles, Store, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { useQuery } from "@tanstack/react-query";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { getPublicSiteUrl } from "@/lib/publicSiteUrl";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { playSound } = useSoundEffects();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    const redirectPath = searchParams.get("redirect");
    const bestieId = searchParams.get("bestieId");

    // Detect recovery links early to prevent auto-redirect to /community.
    // Recovery links can arrive as:
    // - Hash params (implicit): #access_token=...&type=recovery
    // - Query params (PKCE): ?code=...&type=recovery
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashType = hashParams.get("type");
    const hasAccessToken = !!hashParams.get("access_token");
    const hashErrorCode = hashParams.get("error_code");
    const hashErrorDescription = hashParams.get("error_description");

    const queryType = searchParams.get("type");
    const code = searchParams.get("code");
    const queryErrorCode = searchParams.get("error_code");
    const queryErrorDescription = searchParams.get("error_description");

    const hasAuthError = !!hashErrorCode || !!queryErrorCode;

    // Handle expired/invalid email links gracefully (common: otp_expired)
    if (hasAuthError) {
      const descriptionRaw =
        hashErrorDescription ||
        queryErrorDescription ||
        "This email link is invalid or has expired. Please request a new password reset email.";

      const description = decodeURIComponent(descriptionRaw.replace(/\+/g, " "));

      console.warn("🔍 AUTH PAGE: Auth link error:", hashErrorCode || queryErrorCode, description);
      setIsPasswordRecovery(false);
      setIsForgotPassword(true);
      toast({
        title: "Reset link expired",
        description,
        variant: "destructive",
      });
    }

    const recoveryMode = !hasAuthError && (hashType === "recovery" || queryType === "recovery");
    if (recoveryMode) {
      console.log("🔍 AUTH PAGE: Recovery mode detected, showing password update form");
      setIsPasswordRecovery(true);

      // If we have a PKCE code, exchange it for a session so updateUser() works.
      // If we have an access token (implicit), Supabase will typically hydrate session automatically.
      if (code && !hasAccessToken) {
        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
          if (error) console.warn("🔍 AUTH PAGE: exchangeCodeForSession failed:", error);
        });
      }
    }

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

    // Check if user is already logged in (but never redirect during recovery)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(
        "🔍 AUTH PAGE: getSession result:",
        session ? "HAS SESSION" : "NO SESSION",
        session?.user?.email
      );

      if (session?.user && !recoveryMode && !hasAuthError && !isPasswordRecovery) {
        console.log("🔍 AUTH PAGE: Redirecting authenticated user:", session.user.id);
        checkAndRedirect(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔍 AUTH PAGE: onAuthStateChange event:", event);

      // Supabase may emit either PASSWORD_RECOVERY or SIGNED_IN for recovery links,
      // depending on auth flow (implicit vs PKCE). Treat both as recovery when the URL indicates it.
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && recoveryMode)) {
        console.log("🔍 AUTH PAGE: Password recovery detected, showing update form");
        setIsPasswordRecovery(true);
        return;
      }

      if (session?.user && !recoveryMode && !hasAuthError && !isPasswordRecovery) {
        checkAndRedirect(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, searchParams, isPasswordRecovery, toast]);

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
      // Use custom edge function to send password reset via Resend (from our domain)
      const response = await supabase.functions.invoke('send-password-reset', {
        body: {
          email,
          redirectUrl: `${getPublicSiteUrl()}/auth?type=recovery`,
        },
      });

      if (response.error) throw response.error;

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Your password has been successfully changed.",
      });

      // Reset state and redirect
      setIsPasswordRecovery(false);
      setPassword("");
      setConfirmPassword("");
      navigate("/community", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
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
                {isPasswordRecovery 
                  ? "Set New Password" 
                  : isForgotPassword 
                    ? "Reset Password" 
                    : isSignUp 
                      ? "Join Our Community" 
                      : "Welcome Back"}
              </h1>
              <p className="text-muted-foreground">
                {isPasswordRecovery
                  ? "Enter your new password below"
                  : isForgotPassword
                    ? "Enter your email to receive a password reset link"
                    : isSignUp 
                      ? "Create your account to connect with our community" 
                      : "Sign in to access your Best Day Ministries community"}
              </p>
            </div>
          </div>

          {isPasswordRecovery ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : isForgotPassword ? (
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
                className="w-full bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
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
                  <Link 
                    to="/vendor-auth" 
                    className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Store className="h-4 w-4" />
                    Click here to become a vendor
                  </Link>
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="relative z-30 w-full bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
              disabled={loading || (isSignUp && !acceptedTerms)}
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>

            {!isSignUp && (
              <div className="relative z-0">
                {/* Line stays behind everything in this block */}
                <div className="absolute inset-0 flex items-center z-0">
                  <span className="w-full border-t" />
                </div>

                {/* White breaker sits above the line but below the Sign In button */}
                <div className="relative flex justify-center text-xs uppercase z-10">
                  <span className="absolute inset-0 mx-auto w-10 bg-card z-10" />
                  <span className="relative z-20 px-2 text-muted-foreground">Or</span>
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

          {!isForgotPassword && !isPasswordRecovery && (
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
