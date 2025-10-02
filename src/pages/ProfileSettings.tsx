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
import { formatFriendCode, getRandomEmoji, getRandomNumber } from "@/lib/friendCodeEmojis";
import grandpaWerthersPattern from "@/assets/voice-patterns/grandpa-werthers.png";
import johnnyDynamitePattern from "@/assets/voice-patterns/johnny-dynamite.png";
import batmanPattern from "@/assets/voice-patterns/batman.png";
import cherryTwinklePattern from "@/assets/voice-patterns/cherry-twinkle.png";
import creaturePattern from "@/assets/voice-patterns/creature.png";
import marshalPattern from "@/assets/voice-patterns/marshal.png";
import austinPattern from "@/assets/voice-patterns/austin.png";
import jerryBPattern from "@/assets/voice-patterns/jerry-b.png";
import maverickPattern from "@/assets/voice-patterns/maverick.png";
import grandmaMuffinPattern from "@/assets/voice-patterns/grandma-muffin.png";

interface Profile {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  avatar_number?: number;
  role: string;
  tts_voice?: string;
  tts_enabled?: boolean;
  friend_code_emoji?: string | null;
  friend_code_number?: number | null;
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
        const emoji = getRandomEmoji();
        const number = getRandomNumber();
        
        // Check if this combination is available
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("friend_code_emoji", emoji)
          .eq("friend_code_number", number)
          .maybeSingle();

        if (!existing) {
          // This combo is available, use it
          const { error } = await supabase
            .from("profiles")
            .update({
              friend_code_emoji: emoji,
              friend_code_number: number,
            })
            .eq("id", user.id);

          if (error) throw error;

          toast({
            title: "Friend code generated",
            description: `Your new friend code is ${formatFriendCode(emoji, number)}`,
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
    if (!profile?.friend_code_emoji || !profile?.friend_code_number) return;
    const code = formatFriendCode(profile.friend_code_emoji, profile.friend_code_number);
    if (code) {
      navigator.clipboard.writeText(code);
      toast({
        title: "Copied!",
        description: "Friend code copied to clipboard",
      });
    }
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setProfile(data);
    setDisplayName(data.display_name || "");
    setBio(data.bio || "");
    setSelectedVoice(data.tts_voice || "Aria");
    setTtsEnabled(data.tts_enabled ?? true);
    
    // Set avatar number directly from the database
    if (data.avatar_number) {
      setSelectedAvatar(data.avatar_number);
    } else if (data.avatar_url) {
      // Fallback for old avatar_url format
      const avatarNum = parseInt(data.avatar_url.replace("avatar-", ""));
      if (!isNaN(avatarNum)) {
        setSelectedAvatar(avatarNum);
      }
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    if (!displayName.trim()) {
      toast({
        title: "Display name required",
        description: "Please enter a display name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
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
                    {profile.friend_code_emoji && profile.friend_code_number ? (
                      <>
                        <div className="flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                          <div className="text-center space-y-2">
                            <div className="text-6xl">
                              {formatFriendCode(profile.friend_code_emoji, profile.friend_code_number)}
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
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2 text-base">
                      <Volume2 className="w-4 h-4" />
                      Text-to-Speech
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable audio playback for text content throughout the app
                    </p>
                  </div>
                  <Switch
                    checked={ttsEnabled}
                    onCheckedChange={setTtsEnabled}
                  />
                </div>

                {ttsEnabled && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm">Preferred Voice</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose your preferred voice - click the speaker icon to preview
                    </p>
                
                    {/* Classic Voices Section */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Classic Voices</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { value: 'Aria', label: 'Aria', description: 'Female, Warm' },
                          { value: 'Roger', label: 'Roger', description: 'Male, Deep' },
                          { value: 'Sarah', label: 'Sarah', description: 'Female, Clear' },
                          { value: 'Charlie', label: 'Charlie', description: 'Male, Friendly' }
                        ].map((voice) => (
                          <div
                            key={voice.value}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all cursor-pointer hover:border-primary/50 ${
                              selectedVoice === voice.value ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                            onClick={() => setSelectedVoice(voice.value)}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{voice.label}</div>
                              <div className="text-sm text-muted-foreground">{voice.description}</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                const previewText = `Hello! I'm ${voice.label}. This is what I sound like.`;
                                const audio = document.createElement('audio');
                                audio.style.display = 'none';
                                document.body.appendChild(audio);
                                
                                supabase.functions.invoke('text-to-speech', {
                                  body: { text: previewText, voice: voice.value }
                                }).then(({ data, error }) => {
                                  if (error) {
                                    toast({
                                      title: "Preview Error",
                                      description: "Failed to load voice preview",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  if (data?.audioContent) {
                                    const audioBlob = new Blob(
                                      [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
                                      { type: 'audio/mpeg' }
                                    );
                                    const audioUrl = URL.createObjectURL(audioBlob);
                                    audio.src = audioUrl;
                                    audio.play();
                                    audio.onended = () => {
                                      URL.revokeObjectURL(audioUrl);
                                      document.body.removeChild(audio);
                                    };
                                  }
                                });
                              }}
                              title="Preview voice"
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fun Voices Section */}
                    <div className="space-y-2 mt-6">
                      <h3 className="text-sm font-semibold text-foreground">Fun Voices</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { value: 'Johnny Dynamite', label: 'Johnny Dynamite', description: '80s Radio DJ', pattern: johnnyDynamitePattern },
                          { value: 'Grampa Werthers', label: 'Grampa Werthers', description: 'Cartoon Old Man', pattern: grandpaWerthersPattern },
                          { value: 'Batman', label: 'Batman', description: 'Dark Knight', pattern: batmanPattern },
                          { value: 'Cherry Twinkle', label: 'Cherry Twinkle', description: 'Adorable Cartoon Girl', pattern: cherryTwinklePattern },
                          { value: 'Creature', label: 'Creature', description: 'Goblin Mythical Monster', pattern: creaturePattern },
                          { value: 'Marshal', label: 'Marshal', description: 'Toon Character', pattern: marshalPattern },
                          { value: 'Austin', label: 'Austin', description: 'Texas Boy', pattern: austinPattern },
                          { value: 'Jerry B.', label: 'Jerry B.', description: 'California Surfer Dude', pattern: jerryBPattern },
                          { value: 'Maverick', label: 'Maverick', description: 'Epic Heroic Legend', pattern: maverickPattern },
                          { value: 'Grandma Muffin', label: 'Grandma Muffin', description: 'Warm Grandmother', pattern: grandmaMuffinPattern }
                        ].map((voice) => (
                          <div
                            key={voice.value}
                            className={`relative flex items-center justify-between p-4 border-2 rounded-lg transition-all cursor-pointer hover:border-primary/50 overflow-hidden ${
                              selectedVoice === voice.value ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                            onClick={() => setSelectedVoice(voice.value)}
                            style={{
                              backgroundImage: `url(${voice.pattern})`,
                              backgroundSize: '150px 150px',
                              backgroundRepeat: 'repeat',
                              backgroundPosition: 'center'
                            }}
                          >
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
                            <div className="flex-1 relative z-10">
                              <div className="font-medium">{voice.label}</div>
                              <div className="text-sm text-muted-foreground">{voice.description}</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="relative z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                const previewText = `Hello! I'm ${voice.label}. This is what I sound like.`;
                                const audio = document.createElement('audio');
                                audio.style.display = 'none';
                                document.body.appendChild(audio);
                                
                                supabase.functions.invoke('text-to-speech', {
                                  body: { text: previewText, voice: voice.value }
                                }).then(({ data, error }) => {
                                  if (error) {
                                    toast({
                                      title: "Preview Error",
                                      description: "Failed to load voice preview",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  if (data?.audioContent) {
                                    const audioBlob = new Blob(
                                      [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
                                      { type: 'audio/mpeg' }
                                    );
                                    const audioUrl = URL.createObjectURL(audioBlob);
                                    audio.src = audioUrl;
                                    audio.play();
                                    audio.onended = () => {
                                      URL.revokeObjectURL(audioUrl);
                                      document.body.removeChild(audio);
                                    };
                                  }
                                });
                              }}
                              title="Preview voice"
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="border-2 shadow-warm">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Password</p>
                  <p className="text-sm text-muted-foreground">Change your account password</p>
                </div>
                <PasswordChangeDialog />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfileSettings;
