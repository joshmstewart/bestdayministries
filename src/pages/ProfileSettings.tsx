import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Volume2, Copy, RefreshCw, Bell, Mail, Lock } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { CustomAvatarPicker } from "@/components/profile/CustomAvatarPicker";
import { NewsletterPreferences } from "@/components/profile/NewsletterPreferences";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { PicturePasswordManager } from "@/components/auth/PicturePasswordManager";
import { formatFriendCode, generateRandomFriendCode } from "@/lib/friendCodeEmojis";
import { profileSchema, validateInput } from "@/lib/validation";

interface Profile {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  avatar_number?: number;
  role: string;
  tts_voice?: string;
  tts_enabled?: boolean;
  friend_code?: string | null;
  custom_avatar_url?: string | null;
  custom_avatar_type?: string | null;
}

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("Aria");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_on_pending_approval: true,
    email_on_approval_decision: true,
    email_on_new_sponsor_message: true,
    email_on_message_approved: true,
    email_on_message_rejected: true,
    email_on_new_event: true,
    email_on_event_update: false,
    email_on_new_sponsorship: true,
    email_on_sponsorship_update: true,
    email_on_comment_on_post: true,
    email_on_comment_on_thread: true,
    email_on_prayer_pending_approval: true,
    email_on_prayer_approved: true,
    email_on_prayer_rejected: true,
    email_on_prayed_for_you: true,
    email_on_prayer_expiring: true,
    email_on_content_like: false,
    email_on_order_shipped: true,
    email_on_order_delivered: true,
    email_on_badge_earned: true,
    inapp_on_pending_approval: true,
    inapp_on_approval_decision: true,
    inapp_on_new_sponsor_message: true,
    inapp_on_message_approved: true,
    inapp_on_message_rejected: true,
    inapp_on_new_event: true,
    inapp_on_event_update: false,
    inapp_on_new_sponsorship: true,
    inapp_on_sponsorship_update: true,
    inapp_on_comment_on_post: true,
    inapp_on_comment_on_thread: true,
    inapp_on_prayer_pending_approval: true,
    inapp_on_prayer_approved: true,
    inapp_on_prayer_rejected: true,
    inapp_on_prayed_for_you: true,
    inapp_on_prayer_expiring: true,
    inapp_on_content_like: true,
    inapp_on_order_shipped: true,
    inapp_on_order_delivered: true,
    inapp_on_badge_earned: true,
    digest_frequency: 'never' as 'never' | 'daily' | 'weekly',
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  // Feed badge preference
  const [showFeedBadge, setShowFeedBadge] = useState(true);
  
  // Track user's relationships for conditional notification display
  const [isSponsor, setIsSponsor] = useState(false);
  const [isBeingSponsored, setIsBeingSponsored] = useState(false);
  const [isBestie, setIsBestie] = useState(false);
  const [isGuardianOfBestie, setIsGuardianOfBestie] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await loadProfile(session.user.id);
    await loadNotificationPreferences(session.user.id);
    await checkUserRelationships(session.user.id);
    setLoading(false);
  };

  const generateFriendCode = async () => {
    if (!user || profile?.role !== "bestie") return;

    setGeneratingCode(true);
    try {
      // Keep trying until we find an available code
      let attempts = 0;
      const maxAttempts = 100;
      
      while (attempts < maxAttempts) {
        const newCode = generateRandomFriendCode();
        
        // Check if this code is available
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("friend_code", newCode)
          .maybeSingle();

        if (!existing) {
          // This code is available, use it
          const { error } = await supabase
            .from("profiles")
            .update({
              friend_code: newCode,
            })
            .eq("id", user.id);

          if (error) throw error;

          toast({
            title: "Friend code generated",
            description: `Your new friend code is ${newCode}`,
          });

          await loadProfile(user.id);
          setGeneratingCode(false);
          return;
        }

        attempts++;
      }

      throw new Error("Could not generate unique friend code. Please try again.");
    } catch (error: any) {
      toast({
        title: "Error generating friend code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyFriendCode = () => {
    if (!profile?.friend_code) return;
    navigator.clipboard.writeText(profile.friend_code);
    toast({
      title: "Copied!",
      description: "Friend code copied to clipboard",
    });
  };

  const loadProfile = async (userId: string) => {
    // Fetch profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error loading profile:", profileError);
      toast({
        title: "Error loading profile",
        description: profileError.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch role from user_roles table (security requirement)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const profile = {
      ...profileData,
      role: roleData?.role || "supporter"
    };

    setProfile(profile);
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setSelectedVoice(profile.tts_voice || "Aria");
    setTtsEnabled(profile.tts_enabled ?? true);
    setShowFeedBadge(profileData.show_feed_badge ?? true);
    
    // Set avatar number directly from the database
    if (profile.avatar_number) {
      setSelectedAvatar(profile.avatar_number);
    } else if (profile.avatar_url) {
      // Fallback for old avatar_url format
      const avatarNum = parseInt(profile.avatar_url.replace("avatar-", ""));
      if (!isNaN(avatarNum)) {
        setSelectedAvatar(avatarNum);
      }
    }
  };

  // Handle feed badge preference change
  const handleFeedBadgeChange = async (checked: boolean) => {
    if (!user) return;
    
    setShowFeedBadge(checked);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ show_feed_badge: checked })
        .eq("id", user.id);

      if (error) throw error;
      
      toast({
        title: "Preference saved",
        description: checked ? "Feed badge enabled" : "Feed badge disabled",
      });
    } catch (error: any) {
      // Revert on error
      setShowFeedBadge(!checked);
      toast({
        title: "Error saving preference",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    // Validate input
    const validation = validateInput(profileSchema, {
      displayName: displayName,
      bio: bio,
      avatarNumber: selectedAvatar,
    });

    if (!validation.success) {
      toast({
        title: "Validation error",
        description: validation.errors?.[0] || "Please check your input",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: validation.data!.displayName.trim(),
          bio: validation.data!.bio?.trim() || null,
          avatar_number: selectedAvatar,
          tts_voice: selectedVoice,
          tts_enabled: ttsEnabled,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your profile has been saved successfully.",
      });

      // Reload profile to get updated data
      await loadProfile(user.id);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const [standardVoices, setStandardVoices] = useState<Array<{ value: string; label: string; description: string }>>([]);
  const [funVoices, setFunVoices] = useState<Array<{ value: string; label: string; description: string }>>([]);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const { data, error } = await supabase
        .from('tts_voices')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('display_order');

      if (error) throw error;

      const standard = data
        ?.filter(v => v.category === 'standard')
        .map(v => ({
          value: v.voice_name,
          label: v.voice_label,
          description: v.description || ''
        })) || [];

      const fun = data
        ?.filter(v => v.category === 'fun')
        .map(v => ({
          value: v.voice_name,
          label: v.voice_label,
          description: v.description || ''
        })) || [];

      setStandardVoices(standard);
      setFunVoices(fun);
    } catch (error: any) {
      console.error('Error loading voices:', error);
    }
  };

  const checkUserRelationships = async (userId: string) => {
    try {
      // Check if user is actively sponsoring anyone
      const { data: sponsorData } = await supabase
        .from("sponsorships")
        .select("id")
        .eq("sponsor_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      
      setIsSponsor(!!sponsorData);
      
      // Check if user is being sponsored
      const { data: sponsoredData } = await supabase
        .from("sponsorships")
        .select("id")
        .eq("bestie_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      
      setIsBeingSponsored(!!sponsoredData);
      
      // Check if user is a bestie
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      
      setIsBestie(roleData?.role === "bestie");
      
      // Check if user is a guardian linked to any besties
      const { data: guardianData } = await supabase
        .from("caregiver_bestie_links")
        .select("id")
        .eq("caregiver_id", userId)
        .limit(1)
        .maybeSingle();
      
      setIsGuardianOfBestie(!!guardianData);
    } catch (error: any) {
      console.error("Error checking user relationships:", error);
    }
  };

  const loadNotificationPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading notification preferences:", error);
        return;
      }

      if (data) {
        const prefs = data as any; // Cast to any since new columns may not be in types yet
        setNotificationPrefs({
          ...prefs,
          digest_frequency: (prefs.digest_frequency || 'never') as 'never' | 'daily' | 'weekly',
          // Provide defaults for prayer notification fields
          email_on_prayer_pending_approval: prefs.email_on_prayer_pending_approval ?? true,
          email_on_prayer_approved: prefs.email_on_prayer_approved ?? true,
          email_on_prayer_rejected: prefs.email_on_prayer_rejected ?? true,
          email_on_prayed_for_you: prefs.email_on_prayed_for_you ?? true,
          email_on_prayer_expiring: prefs.email_on_prayer_expiring ?? true,
          inapp_on_prayer_pending_approval: prefs.inapp_on_prayer_pending_approval ?? true,
          inapp_on_prayer_approved: prefs.inapp_on_prayer_approved ?? true,
          inapp_on_prayer_rejected: prefs.inapp_on_prayer_rejected ?? true,
          inapp_on_prayed_for_you: prefs.inapp_on_prayed_for_you ?? true,
          inapp_on_prayer_expiring: prefs.inapp_on_prayer_expiring ?? true,
          // Provide defaults for content like fields
          email_on_content_like: prefs.email_on_content_like ?? false,
          inapp_on_content_like: prefs.inapp_on_content_like ?? true,
          // Provide defaults for order notification fields
          email_on_order_shipped: prefs.email_on_order_shipped ?? true,
          email_on_order_delivered: prefs.email_on_order_delivered ?? true,
          inapp_on_order_shipped: prefs.inapp_on_order_shipped ?? true,
          inapp_on_order_delivered: prefs.inapp_on_order_delivered ?? true,
          // Provide defaults for badge earned fields
          email_on_badge_earned: prefs.email_on_badge_earned ?? true,
          inapp_on_badge_earned: prefs.inapp_on_badge_earned ?? true,
        });
      }
    } catch (error: any) {
      console.error("Error loading notification preferences:", error);
    }
  };

  const saveNotificationPreferences = async () => {
    if (!user) return;

    setSavingNotifications(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          ...notificationPrefs,
        });

      if (error) throw error;

      toast({
        title: "Preferences saved!",
        description: "Your notification preferences have been updated.",
      });
    } catch (error: any) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  const testVoice = async (voiceName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: "Hello! This is how I sound. I hope you like my voice!",
          voice: voiceName
        }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error("No audio content received");

      // Convert base64 to audio blob
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();

      toast({
        title: "Playing voice sample",
        description: "Listen to how this voice sounds",
      });
    } catch (error: any) {
      console.error('Error testing voice:', error);
      toast({
        title: "Error testing voice",
        description: error.message || "Failed to generate speech",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <UnifiedHeader />
      
      <main className="container mx-auto px-4 pt-20 pb-12">
        <BackButton to="/community" label="Back to Community" />
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-black text-foreground">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Settings</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Customize your profile and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="inline-flex flex-wrap h-auto gap-1">
              <TabsTrigger value="profile" className="whitespace-nowrap">Profile</TabsTrigger>
              <TabsTrigger value="tts" className="whitespace-nowrap">Text-to-Speech</TabsTrigger>
              <TabsTrigger value="notifications" className="whitespace-nowrap">
                Notifications
              </TabsTrigger>
              <TabsTrigger value="newsletter" className="whitespace-nowrap">
                Newsletter
              </TabsTrigger>
              <TabsTrigger value="security" className="whitespace-nowrap">
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6 mt-6">
              <Card className="border-2 shadow-warm">
                <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
                  <CardDescription>Update your profile information and choose an avatar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
              {/* Current Avatar Preview */}
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                <AvatarDisplay 
                  avatarNumber={selectedAvatar} 
                  displayName={displayName}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-foreground">{displayName || "Your Name"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {profile?.role.charAt(0).toUpperCase() + profile?.role.slice(1)}
                  </p>
                </div>
              </div>

              {/* Avatar Picker */}
              <AvatarPicker 
                selectedAvatar={selectedAvatar}
                onSelectAvatar={setSelectedAvatar}
              />

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  placeholder="your.email@example.com"
                  className="bg-muted/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  name="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display Name"
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>

              {/* Friend Code for Besties */}
              {profile?.role === "bestie" && (
                <Card className="border-dashed border-2 border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">My Friend Code</CardTitle>
                    <CardDescription>
                      Share this code with your guardian so they can link to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.friend_code ? (
                      <>
                        <div className="flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                          <div className="text-center space-y-2">
                            <div className="text-6xl tracking-wider">
                              {profile.friend_code}
                            </div>
                            <p className="text-sm text-muted-foreground">Your Friend Code</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={copyFriendCode}
                          >
                            <Copy className="w-4 h-4" />
                            Copy Code
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={generateFriendCode}
                            disabled={generatingCode}
                          >
                            {generatingCode ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                New Code
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-4 py-6">
                        <p className="text-muted-foreground">
                          You don't have a friend code yet
                        </p>
                        <Button
                          type="button"
                          onClick={generateFriendCode}
                          disabled={generatingCode}
                          className="gap-2"
                        >
                          {generatingCode ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            "Generate Friend Code"
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleSave} 
                className="w-full gap-2" 
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile
                  </>
                )}
              </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Text-to-Speech Tab */}
            <TabsContent value="tts" className="space-y-6 mt-6">
              <Card className="border-2 shadow-warm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    Text-to-Speech Settings
                  </CardTitle>
                  <CardDescription>
                    Choose how text is read aloud to you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="tts-enabled">Enable Text-to-Speech</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically read text aloud
                      </p>
                    </div>
                    <Switch
                      id="tts-enabled"
                      checked={ttsEnabled}
                      onCheckedChange={setTtsEnabled}
                    />
                  </div>

                  {ttsEnabled && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* Standard Voices */}
                      <div className="space-y-2">
                        <Label className="text-base">Standard Voices</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {standardVoices.map((voice) => (
                            <div key={voice.value} className="relative">
                              <Button
                                type="button"
                                variant={selectedVoice === voice.value ? "default" : "outline"}
                                className="h-auto w-full flex-col items-start p-3 text-left pr-10"
                                onClick={() => setSelectedVoice(voice.value)}
                              >
                                <div className="font-medium text-sm">{voice.label}</div>
                                <div className="text-xs opacity-70">
                                  {voice.description}
                                </div>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testVoice(voice.value);
                                }}
                              >
                                <Volume2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fun Voices */}
                      <div className="space-y-2">
                        <Label className="text-base">Fun Voices</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {funVoices.map((voice) => (
                            <div key={voice.value} className="relative">
                              <Button
                                type="button"
                                variant={selectedVoice === voice.value ? "default" : "outline"}
                                className="h-auto w-full flex-col items-start p-3 text-left pr-10"
                                onClick={() => setSelectedVoice(voice.value)}
                              >
                                <div className="font-medium text-sm">{voice.label}</div>
                                <div className="text-xs opacity-70">
                                  {voice.description}
                                </div>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testVoice(voice.value);
                                }}
                              >
                                <Volume2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleSave} 
                    className="w-full gap-2" 
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save TTS Settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 mt-6">
              <Card className="border-2 shadow-warm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to receive notifications - via email, in-app, or both
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coming Soon Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      <strong>📧 Email Notifications Coming Soon!</strong>
                      <br />
                      Email notifications are currently being finalized and will be available shortly. In-app notifications are fully functional now.
                    </p>
                  </div>
                  {/* Header row for Email and In-App columns */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex-1"></div>
                    <div className="flex gap-4 items-center">
                      <span className="text-xs font-semibold text-muted-foreground w-12 text-center">Email</span>
                      <span className="text-xs font-semibold text-muted-foreground w-12 text-center">In-App</span>
                    </div>
                  </div>
                  {/* Guardian/Admin Notifications - Only show if user is guardian/admin/owner */}
                  {(profile?.role === "caregiver" || profile?.role === "admin" || profile?.role === "owner") && (
                    <div className="space-y-3 pb-4 border-b">
                      <Label className="text-base">Guardian & Admin</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 flex-1">
                            <Label className="font-normal">Pending approvals</Label>
                            <p className="text-xs text-muted-foreground">When content needs your approval</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <Switch
                              checked={notificationPrefs.email_on_pending_approval}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, email_on_pending_approval: checked }))
                              }
                            />
                            <Switch
                              checked={notificationPrefs.inapp_on_pending_approval}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, inapp_on_pending_approval: checked }))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 flex-1">
                            <Label className="font-normal">Approval decisions</Label>
                            <p className="text-xs text-muted-foreground">When your content is approved/rejected</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <Switch
                              checked={notificationPrefs.email_on_approval_decision}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, email_on_approval_decision: checked }))
                              }
                            />
                            <Switch
                              checked={notificationPrefs.inapp_on_approval_decision}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, inapp_on_approval_decision: checked }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                   {/* Discussion Activity - Show to all authenticated users */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Discussion Activity</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Comments on your posts</Label>
                          <p className="text-xs text-muted-foreground">When someone comments on a post you created</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_comment_on_post}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_comment_on_post: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_comment_on_post}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_comment_on_post: checked }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Comments on discussions you're in</Label>
                          <p className="text-xs text-muted-foreground">When someone else comments on a post you commented on</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_comment_on_thread}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_comment_on_thread: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_comment_on_thread}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_comment_on_thread: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sponsorship Messages */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Sponsorship Messages</Label>
                    <div className="space-y-3">
                      {/* New messages - Only show if user is actively sponsoring someone */}
                      {isSponsor && (
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 flex-1">
                            <Label className="font-normal">New messages</Label>
                            <p className="text-xs text-muted-foreground">When you receive a new message</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <Switch
                              checked={notificationPrefs.email_on_new_sponsor_message}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, email_on_new_sponsor_message: checked }))
                              }
                            />
                            <Switch
                              checked={notificationPrefs.inapp_on_new_sponsor_message}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, inapp_on_new_sponsor_message: checked }))
                              }
                            />
                          </div>
                        </div>
                      )}
                      {/* Message approved/rejected - Only show if user is a bestie */}
                      {isBestie && (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5 flex-1">
                              <Label className="font-normal">Message approved</Label>
                              <p className="text-xs text-muted-foreground">When your message is approved</p>
                            </div>
                            <div className="flex gap-4 items-center">
                              <Switch
                                checked={notificationPrefs.email_on_message_approved}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, email_on_message_approved: checked }))
                                }
                              />
                              <Switch
                                checked={notificationPrefs.inapp_on_message_approved}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, inapp_on_message_approved: checked }))
                                }
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5 flex-1">
                              <Label className="font-normal">Message rejected</Label>
                              <p className="text-xs text-muted-foreground">When your message is rejected</p>
                            </div>
                            <div className="flex gap-4 items-center">
                              <Switch
                                checked={notificationPrefs.email_on_message_rejected}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, email_on_message_rejected: checked }))
                                }
                              />
                              <Switch
                                checked={notificationPrefs.inapp_on_message_rejected}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, inapp_on_message_rejected: checked }))
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Show message if section is empty */}
                      {!isSponsor && !isBestie && (
                        <p className="text-sm text-muted-foreground py-2">
                          No sponsorship message notifications available for your account.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prayer Requests */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Prayer Requests</Label>
                    <div className="space-y-3">
                      {/* Pending prayer approvals - Only for guardians linked to besties */}
                      {isGuardianOfBestie && (
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-2">
                              <Label className="font-normal">Pending prayer approvals</Label>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Guardians only</span>
                            </div>
                            <p className="text-xs text-muted-foreground">When a bestie submits a prayer for approval</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <Switch
                              checked={notificationPrefs.email_on_prayer_pending_approval}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, email_on_prayer_pending_approval: checked }))
                              }
                            />
                            <Switch
                              checked={notificationPrefs.inapp_on_prayer_pending_approval}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, inapp_on_prayer_pending_approval: checked }))
                              }
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Prayer approved/rejected - Only for besties */}
                      {isBestie && (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-normal">Prayer approved</Label>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Besties only</span>
                              </div>
                              <p className="text-xs text-muted-foreground">When your prayer is approved for sharing</p>
                            </div>
                            <div className="flex gap-4 items-center">
                              <Switch
                                checked={notificationPrefs.email_on_prayer_approved}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, email_on_prayer_approved: checked }))
                                }
                              />
                              <Switch
                                checked={notificationPrefs.inapp_on_prayer_approved}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, inapp_on_prayer_approved: checked }))
                                }
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-normal">Prayer not approved</Label>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Besties only</span>
                              </div>
                              <p className="text-xs text-muted-foreground">When your prayer is not approved</p>
                            </div>
                            <div className="flex gap-4 items-center">
                              <Switch
                                checked={notificationPrefs.email_on_prayer_rejected}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, email_on_prayer_rejected: checked }))
                                }
                              />
                              <Switch
                                checked={notificationPrefs.inapp_on_prayer_rejected}
                                onCheckedChange={(checked) => 
                                  setNotificationPrefs(prev => ({ ...prev, inapp_on_prayer_rejected: checked }))
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Someone prayed for you - Show to everyone */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Someone prayed for you</Label>
                          <p className="text-xs text-muted-foreground">When someone prays for your request</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_prayed_for_you}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_prayed_for_you: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_prayed_for_you}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_prayed_for_you: checked }))
                            }
                          />
                        </div>
                      </div>
                      
                      {/* Prayer expiring notification - Show to everyone */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Prayer expiring soon</Label>
                          <p className="text-xs text-muted-foreground">When your prayer is about to expire</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_prayer_expiring}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_prayer_expiring: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_prayer_expiring}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_prayer_expiring: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Events - Show to everyone */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Events</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">New events</Label>
                          <p className="text-xs text-muted-foreground">When new events are created</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_new_event}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_new_event: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_new_event}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_new_event: checked }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Event updates</Label>
                          <p className="text-xs text-muted-foreground">When events are modified</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_event_update}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_event_update: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_event_update}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_event_update: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Likes - Show to everyone */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Content Likes</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Likes on your creations</Label>
                          <p className="text-xs text-muted-foreground">When someone likes your colorings, cards, beats, drinks, recipes, jokes, or challenge creations</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_content_like}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_content_like: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_content_like}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_content_like: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Orders - Show to everyone */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Orders</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Order shipped</Label>
                          <p className="text-xs text-muted-foreground">When your order has been shipped</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_order_shipped}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_order_shipped: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_order_shipped}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_order_shipped: checked }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Order delivered</Label>
                          <p className="text-xs text-muted-foreground">When your order has been delivered</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_order_delivered}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_order_delivered: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_order_delivered}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_order_delivered: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Achievements - Show to everyone */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Achievements</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Badge earned</Label>
                          <p className="text-xs text-muted-foreground">When you earn a badge or achievement</p>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Switch
                            checked={notificationPrefs.email_on_badge_earned}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_badge_earned: checked }))
                            }
                          />
                          <Switch
                            checked={notificationPrefs.inapp_on_badge_earned}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, inapp_on_badge_earned: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sponsorships - Only show if user is being sponsored */}
                  {isBeingSponsored && (
                    <div className="space-y-3">
                      <Label className="text-base">Sponsorships</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 flex-1">
                            <Label className="font-normal">New sponsorships</Label>
                            <p className="text-xs text-muted-foreground">When you receive a new sponsorship</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <Switch
                              checked={notificationPrefs.email_on_new_sponsorship}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, email_on_new_sponsorship: checked }))
                              }
                            />
                            <Switch
                              checked={notificationPrefs.inapp_on_new_sponsorship}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, inapp_on_new_sponsorship: checked }))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 flex-1">
                            <Label className="font-normal">Sponsorship updates</Label>
                            <p className="text-xs text-muted-foreground">When sponsorships are modified</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <Switch
                              checked={notificationPrefs.email_on_sponsorship_update}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, email_on_sponsorship_update: checked }))
                              }
                            />
                            <Switch
                              checked={notificationPrefs.inapp_on_sponsorship_update}
                              onCheckedChange={(checked) => 
                                setNotificationPrefs(prev => ({ ...prev, inapp_on_sponsorship_update: checked }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feed Badge Settings */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base">Feed Badge</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Show unseen count badge</Label>
                          <p className="text-xs text-muted-foreground">Display a badge on the Feed tab showing how many new items you haven't seen</p>
                        </div>
                        <Switch
                          checked={showFeedBadge}
                          onCheckedChange={handleFeedBadgeChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email Digest Settings */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base">Email Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Instead of individual emails, receive a summary of your notifications
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1">
                          <Label className="font-normal">Digest frequency</Label>
                          <p className="text-xs text-muted-foreground">Choose how often to receive digest emails</p>
                        </div>
                        <Select
                          value={notificationPrefs.digest_frequency}
                          onValueChange={(value: 'never' | 'daily' | 'weekly') => 
                            setNotificationPrefs(prev => ({ ...prev, digest_frequency: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {notificationPrefs.digest_frequency !== 'never' && (
                        <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                          <p>
                            📧 You'll receive a {notificationPrefs.digest_frequency} summary email with all your unread notifications 
                            instead of individual notification emails.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={saveNotificationPreferences}
                    disabled={savingNotifications}
                    className="w-full gap-2"
                  >
                    {savingNotifications ? (
                      <>
                        <Save className="w-4 h-4 animate-pulse" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Notification Preferences
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Newsletter Tab */}
            <TabsContent value="newsletter" className="space-y-6 mt-6">
              {user && (
                <NewsletterPreferences 
                  userId={user.id}
                  userEmail={user.email || ''}
                />
              )}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6 mt-6">
              <Card className="border-2 shadow-warm">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your password and account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-8">
                    <PasswordChangeDialog />
                    <p className="text-sm text-muted-foreground mt-4">
                      Click the button above to change your password
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Picture Password */}
              {user && (
                <PicturePasswordManager userId={user.id} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfileSettings;
