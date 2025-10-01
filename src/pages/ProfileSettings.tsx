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
import { ArrowLeft, Save, Volume2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  avatar_number?: number;
  role: string;
  tts_voice?: string;
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
      <Navigation />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/community")}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Community
            </Button>
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
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <AvatarDisplay 
                  avatarNumber={selectedAvatar} 
                  displayName={displayName}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-foreground">{displayName || "Your Name"}</p>
                  <p className="text-xs text-muted-foreground">
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

              {/* Voice Preference */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Text-to-Speech Voice
                </Label>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred voice - click the speaker icon to preview
                </p>
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfileSettings;
