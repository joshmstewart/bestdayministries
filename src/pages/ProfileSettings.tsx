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
import { Save, Volume2, Copy, RefreshCw, Bell } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
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
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

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

  const standardVoices = [
    { value: "Aria", label: "Aria", description: "Warm and expressive" },
    { value: "Roger", label: "Roger", description: "Confident and clear" },
    { value: "Sarah", label: "Sarah", description: "Natural and friendly" },
    { value: "Laura", label: "Laura", description: "Professional and warm" },
  ];

  const funVoices = [
    { value: "austin", label: "Austin", description: "Warm and friendly voice" },
    { value: "batman", label: "Batman", description: "Deep and mysterious voice" },
    { value: "cherry-twinkle", label: "Cherry Twinkle", description: "Bright and cheerful voice" },
    { value: "creature", label: "Creature", description: "Fun and quirky voice" },
    { value: "grandma-muffin", label: "Grandma Muffin", description: "Sweet and caring voice" },
    { value: "grandpa-werthers", label: "Grandpa Werthers", description: "Wise and comforting voice" },
    { value: "jerry-b", label: "Jerry B", description: "Energetic and upbeat voice" },
    { value: "johnny-dynamite", label: "Johnny Dynamite", description: "Bold and exciting voice" },
    { value: "marshal", label: "Marshal", description: "Strong and confident voice" },
    { value: "maverick", label: "Maverick", description: "Cool and adventurous voice" },
  ];

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
        setNotificationPrefs(data);
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
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-black text-foreground">
              Profile <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Settings</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Customize your profile and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security" className="hidden lg:block">Security</TabsTrigger>
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

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
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
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose which email notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Guardian/Admin Notifications */}
                  {(profile?.role === "caregiver" || profile?.role === "admin" || profile?.role === "owner") && (
                    <div className="space-y-3 pb-4 border-b">
                      <Label className="text-base">Guardian & Admin</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="pending-approval" className="font-normal">Pending approvals</Label>
                            <p className="text-xs text-muted-foreground">When content needs your approval</p>
                          </div>
                          <Switch
                            id="pending-approval"
                            checked={notificationPrefs.email_on_pending_approval}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_pending_approval: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="approval-decision" className="font-normal">Approval decisions</Label>
                            <p className="text-xs text-muted-foreground">When your content is approved/rejected</p>
                          </div>
                          <Switch
                            id="approval-decision"
                            checked={notificationPrefs.email_on_approval_decision}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email_on_approval_decision: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sponsorship Messages */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Sponsorship Messages</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="new-message" className="font-normal">New messages</Label>
                          <p className="text-xs text-muted-foreground">When you receive a new message</p>
                        </div>
                        <Switch
                          id="new-message"
                          checked={notificationPrefs.email_on_new_sponsor_message}
                          onCheckedChange={(checked) => 
                            setNotificationPrefs(prev => ({ ...prev, email_on_new_sponsor_message: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="message-approved" className="font-normal">Message approved</Label>
                          <p className="text-xs text-muted-foreground">When your message is approved</p>
                        </div>
                        <Switch
                          id="message-approved"
                          checked={notificationPrefs.email_on_message_approved}
                          onCheckedChange={(checked) => 
                            setNotificationPrefs(prev => ({ ...prev, email_on_message_approved: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="message-rejected" className="font-normal">Message rejected</Label>
                          <p className="text-xs text-muted-foreground">When your message is rejected</p>
                        </div>
                        <Switch
                          id="message-rejected"
                          checked={notificationPrefs.email_on_message_rejected}
                          onCheckedChange={(checked) => 
                            setNotificationPrefs(prev => ({ ...prev, email_on_message_rejected: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-base">Events</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="new-event" className="font-normal">New events</Label>
                          <p className="text-xs text-muted-foreground">When new events are created</p>
                        </div>
                        <Switch
                          id="new-event"
                          checked={notificationPrefs.email_on_new_event}
                          onCheckedChange={(checked) => 
                            setNotificationPrefs(prev => ({ ...prev, email_on_new_event: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="event-update" className="font-normal">Event updates</Label>
                          <p className="text-xs text-muted-foreground">When events are modified</p>
                        </div>
                        <Switch
                          id="event-update"
                          checked={notificationPrefs.email_on_event_update}
                          onCheckedChange={(checked) => 
                            setNotificationPrefs(prev => ({ ...prev, email_on_event_update: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sponsorships */}
                  <div className="space-y-3">
                    <Label className="text-base">Sponsorships</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="new-sponsorship" className="font-normal">New sponsorships</Label>
                          <p className="text-xs text-muted-foreground">When you receive a new sponsorship</p>
                        </div>
                        <Switch
                          id="new-sponsorship"
                          checked={notificationPrefs.email_on_new_sponsorship}
                          onCheckedChange={(checked) => 
                            setNotificationPrefs(prev => ({ ...prev, email_on_new_sponsorship: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="sponsorship-update" className="font-normal">Sponsorship updates</Label>
                          <p className="text-xs text-muted-foreground">When sponsorships are modified</p>
                        </div>
                        <Switch
                          id="sponsorship-update"
                          checked={notificationPrefs.email_on_sponsorship_update}
                          onCheckedChange={(checked) => 
                            setNotificationPrefs(prev => ({ ...prev, email_on_sponsorship_update: checked }))
                          }
                        />
                      </div>
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
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfileSettings;
