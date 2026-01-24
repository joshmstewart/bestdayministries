import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
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
  const [recoveryTokenHash, setRecoveryTokenHash] = useState<string | null>(null);
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
    // - Token-hash links (legacy): ?type=recovery&token_hash=...
    // - Reset token links (new reusable): ?type=recovery&reset_token=...
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashType = hashParams.get("type");
    const hasAccessToken = !!hashParams.get("access_token");
    const hashErrorCode = hashParams.get("error_code");
    const hashErrorDescription = hashParams.get("error_description");

    const queryType = searchParams.get("type");
    const code = searchParams.get("code");
    const queryErrorCode = searchParams.get("error_code");
    const queryErrorDescription = searchParams.get("error_description");
    
    // New reusable reset_token (preferred) or legacy token_hash
    const resetToken = searchParams.get("reset_token") || hashParams.get("reset_token");
    const legacyTokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
    const tokenToUse = resetToken || legacyTokenHash;
    const isNewResetToken = !!resetToken;
    
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
      setRecoveryTokenHash(null);
      setIsForgotPassword(true);
      toast({
        title: "Reset link expired",
        description,
        variant: "destructive",
      });
      return;
    }

    const recoveryMode = hashType === "recovery" || queryType === "recovery";

    // For reusable reset_token links, show the password form directly (no verification step needed)
    // For legacy token_hash links, still require the verify click
    if (recoveryMode && tokenToUse) {
      setIsForgotPassword(false);
      if (isNewResetToken) {
        // New reusable token - show password form directly
        setIsPasswordRecovery(true);
        setRecoveryTokenHash(tokenToUse);
      } else {
        // Legacy one-time token - require click to verify
        setIsPasswordRecovery(false);
        setRecoveryTokenHash(tokenToUse);
      }
    } else if (recoveryMode) {
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

        // If user has vendor access (owner OR accepted team member), take them to vendor dashboard
        const [{ data: owned }, { data: team }] = await Promise.all([
          supabase.from('vendors').select('id').eq('user_id', userId).limit(1),
          supabase
            .from('vendor_team_members')
            .select('id')
            .eq('user_id', userId)
            .not('accepted_at', 'is', null)
            .limit(1),
        ]);

        const hasVendorAccess = (owned?.length ?? 0) > 0 || (team?.length ?? 0) > 0;
        navigate(hasVendorAccess ? "/vendor-dashboard" : "/community", { replace: true });
      } catch (err) {
        navigate("/community", { replace: true });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !recoveryMode && !isPasswordRecovery && !recoveryTokenHash) {
        checkAndRedirect(session.user.id);
      }
    });

    const stripTokenHashFromUrl = () => {
      const url = new URL(window.location.href);
      const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const hashParams = new URLSearchParams(rawHash);

      let changed = false;

      if (url.searchParams.has("token_hash")) {
        url.searchParams.delete("token_hash");
        changed = true;
      }

      if (hashParams.has("token_hash")) {
        hashParams.delete("token_hash");
        changed = true;
      }

      if (changed) {
        const newHash = hashParams.toString();
        window.history.replaceState(
          {},
          "",
          `${url.pathname}${url.search}${newHash ? `#${newHash}` : ""}`
        );
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase may emit either PASSWORD_RECOVERY or SIGNED_IN for recovery links,
      // depending on auth flow (implicit vs PKCE). Treat both as recovery when the URL indicates it.
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && recoveryMode)) {
        // If a session has already been established from the recovery link,
        // strip token_hash so we don't keep re-rendering the "Verify Reset Link" screen.
        stripTokenHashFromUrl();

        setRecoveryTokenHash(null);
        setIsPasswordRecovery(true);
        return;
      }

      if (session?.user && !recoveryMode && !isPasswordRecovery && !recoveryTokenHash) {
        checkAndRedirect(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, searchParams, isPasswordRecovery, recoveryTokenHash, toast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

        const { data, error } = await supabasePersistent.auth.signUp({
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
              console.error("Terms recording failed:", termsResult.error);
            }
          } catch (termsError) {
            console.error("Error recording terms:", termsError);
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
        const { error, data } = await supabasePersistent.auth.signInWithPassword({
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

  const handleVerifyRecoveryLink = async () => {
    if (!recoveryTokenHash) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: recoveryTokenHash,
        type: "recovery",
      });

      if (error) throw error;

      // Remove token_hash from the URL so refreshes don't re-verify.
      const url = new URL(window.location.href);
      url.searchParams.delete("token_hash");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

      setRecoveryTokenHash(null);
      setIsPasswordRecovery(true);
    } catch (error: any) {
      console.warn("🔍 AUTH PAGE: verifyOtp failed:", error);
      toast({
        title: "Reset link expired",
        description:
          error?.message ||
          "This email link is invalid or has expired. Please request a new password reset email.",
        variant: "destructive",
      });
      setRecoveryTokenHash(null);
      setIsPasswordRecovery(false);
      setIsForgotPassword(true);
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
      // Check if we have our custom reset_token (reusable)
      const resetToken = searchParams.get("reset_token");
      
      if (resetToken) {
        // Use our custom edge function for reusable tokens
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-with-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: resetToken, newPassword: password }),
          }
        );
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || "Failed to update password");
        }
      } else {
        // Legacy flow: use Supabase auth.updateUser (requires active session)
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }

      toast({
        title: "Password updated!",
        description: "Your password has been successfully changed.",
      });

      // Clear URL params and redirect
      const url = new URL(window.location.href);
      url.searchParams.delete("reset_token");
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      window.history.replaceState({}, "", url.pathname);
      
      setIsPasswordRecovery(false);
      setRecoveryTokenHash(null);
      setPassword("");
      setConfirmPassword("");
      navigate("/auth", { replace: true });
      
      toast({
        title: "Please sign in",
        description: "Your password has been updated. Please sign in with your new password.",
      });
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
                  : recoveryTokenHash
                    ? "Verify Reset Link"
                    : isForgotPassword
                      ? "Reset Password"
                      : isSignUp
                        ? "Join Our Community"
                        : "Welcome Back"}
              </h1>
              <p className="text-muted-foreground">
                {isPasswordRecovery
                  ? "Enter your new password below"
                  : recoveryTokenHash
                    ? "Click continue to securely verify your reset link"
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
              {/* Hidden email field for password manager context */}
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                readOnly
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
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
                  name="new-password-confirm"
                  type="password"
                  autoComplete="new-password"
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
          ) : recoveryTokenHash ? (
            <div className="space-y-4">
              <Button
                type="button"
                className="w-full bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
                disabled={loading}
                onClick={handleVerifyRecoveryLink}
              >
                {loading ? "Verifying..." : "Continue"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryTokenHash(null);
                    setIsForgotPassword(false);
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
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
                name="email"
                type="email"
                autoComplete="email"
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
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
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

            {!isSignUp && !isForgotPassword && !isPasswordRecovery && !recoveryTokenHash && (
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

            {!isSignUp && !isForgotPassword && !isPasswordRecovery && !recoveryTokenHash && (
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

          {!isForgotPassword && !isPasswordRecovery && !recoveryTokenHash && (
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
