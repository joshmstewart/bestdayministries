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
import { Save, Volume2, Copy, RefreshCw } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-black text-foreground">
              Profile <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Settings</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Customize your profile and avatar
            </p>
          </div>

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

              {/* Text-to-Speech Settings */}
              <Card className="border-dashed border-2 border-accent/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
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
                </CardContent>
              </Card>

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

          <PasswordChangeDialog />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfileSettings;
