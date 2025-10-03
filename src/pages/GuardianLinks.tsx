import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, Trash2, UserPlus, Star, Heart, Edit, DollarSign, Share2, Plus, Play, Pause } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { FRIEND_CODE_EMOJIS } from "@/lib/friendCodeEmojis";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { FundingProgressBar } from "@/components/FundingProgressBar";
import AudioPlayer from "@/components/AudioPlayer";
import { GuardianFeaturedBestieManager } from "@/components/GuardianFeaturedBestieManager";
import { TextToSpeech } from "@/components/TextToSpeech";

interface BestieLink {
  id: string;
  bestie_id: string;
  relationship: string;
  created_at: string;
  require_post_approval: boolean;
  require_comment_approval: boolean;
  allow_featured_posts: boolean;
  bestie: {
    display_name: string;
    email: string;
    avatar_number: number;
  };
}

interface LinkedBestie {
  id: string;
  display_name: string;
  avatar_number: number;
}

interface Sponsorship {
  id: string;
  bestie_id: string;
  amount: number;
  frequency: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  is_shared?: boolean;
  shared_by?: string;
  bestie: {
    display_name: string;
    email: string;
    avatar_number: number;
  };
  featured_bestie?: {
    id: string;
    description: string;
    image_url: string;
    voice_note_url: string | null;
    monthly_goal: number;
    current_monthly_pledges: number;
  } | null;
}

export default function GuardianLinks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<BestieLink[]>([]);
  const [linkedBesties, setLinkedBesties] = useState<LinkedBestie[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emoji1, setEmoji1] = useState("");
  const [emoji2, setEmoji2] = useState("");
  const [emoji3, setEmoji3] = useState("");
  const [relationship, setRelationship] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [featuredBestieDialogOpen, setFeaturedBestieDialogOpen] = useState(false);
  const [selectedBestieForFeatured, setSelectedBestieForFeatured] = useState<{ id: string; name: string } | null>(null);
  const [changingAmountFor, setChangingAmountFor] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState<string>("");
  const [isUpdatingAmount, setIsUpdatingAmount] = useState(false);
  const [sharingFor, setSharingFor] = useState<string | null>(null);
  const [selectedBesties, setSelectedBesties] = useState<Set<string>>(new Set());
  const [existingShares, setExistingShares] = useState<Map<string, Set<string>>>(new Map());
  const [isSavingShares, setIsSavingShares] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      const user = session.user;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Allow caregivers, supporters, besties, admins, and owners
      if (!profile || !['caregiver', 'supporter', 'bestie', 'admin', 'owner'].includes(profile.role)) {
        toast({
          title: "Access denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate("/community");
        return;
      }

      setUserRole(profile.role);
      setCurrentUserId(user.id);
      
      // Only caregivers have guardian links
      if (profile.role === "caregiver") {
        await loadLinks(user.id);
        await loadLinkedBesties(user.id);
      }
      
      // Load sponsorships for all roles
      await loadSponsorships(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("caregiver_bestie_links")
        .select(`
          id,
          bestie_id,
          relationship,
          created_at,
          require_post_approval,
          require_comment_approval,
          allow_featured_posts,
          bestie:profiles!caregiver_bestie_links_bestie_id_fkey(
            display_name,
            email,
            avatar_number
          )
        `)
        .eq("caregiver_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map(link => ({
        ...link,
        bestie: Array.isArray(link.bestie) ? link.bestie[0] : link.bestie
      }));

      setLinks(transformedData as BestieLink[]);
    } catch (error: any) {
      toast({
        title: "Error loading links",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadLinkedBesties = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("caregiver_bestie_links")
        .select(`
          bestie:profiles!caregiver_bestie_links_bestie_id_fkey(
            id,
            display_name,
            avatar_number
          )
        `)
        .eq("caregiver_id", userId);

      if (error) throw error;

      if (data) {
        const besties = data
          .map(link => Array.isArray(link.bestie) ? link.bestie[0] : link.bestie)
          .filter(Boolean);
        setLinkedBesties(besties as LinkedBestie[]);
      }
    } catch (error: any) {
      console.error("Error loading linked besties:", error);
    }
  };

  const loadSponsorships = async (userId: string) => {
    try {
      // Load sponsorships where user is sponsor
      const { data: ownSponsorshipsData, error: ownError } = await supabase
        .from("sponsorships")
        .select("id, bestie_id, amount, frequency, status, started_at, ended_at")
        .eq("sponsor_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      if (ownError) throw ownError;

      // Load shared sponsorships (where user is a bestie who has been given access)
      const { data: sharedSponsorshipsData, error: sharedError } = await supabase
        .from("sponsorship_shares")
        .select(`
          sponsorship:sponsorships(
            id,
            bestie_id,
            amount,
            frequency,
            status,
            started_at,
            ended_at
          ),
          shared_by
        `)
        .eq("bestie_id", userId);

      if (sharedError) throw sharedError;

      // Combine own and shared sponsorships
      const allSponsorships = [
        ...(ownSponsorshipsData || []).map(s => ({ ...s, is_shared: false })),
        ...(sharedSponsorshipsData || [])
          .filter(s => s.sponsorship && s.sponsorship.status === 'active')
          .map(s => ({ 
            ...s.sponsorship, 
            is_shared: true,
            shared_by: s.shared_by 
          }))
      ];

      if (allSponsorships.length === 0) {
        setSponsorships([]);
        return;
      }

      // Load existing shares for own sponsorships
      if (ownSponsorshipsData && ownSponsorshipsData.length > 0) {
        const { data: sharesData } = await supabase
          .from("sponsorship_shares")
          .select("sponsorship_id, bestie_id")
          .in("sponsorship_id", ownSponsorshipsData.map(s => s.id));

        const sharesMap = new Map<string, Set<string>>();
        (sharesData || []).forEach(share => {
          if (!sharesMap.has(share.sponsorship_id)) {
            sharesMap.set(share.sponsorship_id, new Set());
          }
          sharesMap.get(share.sponsorship_id)!.add(share.bestie_id);
        });
        setExistingShares(sharesMap);
      }

      // Get bestie profiles
      const bestieIds = allSponsorships.map(s => s.bestie_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_number")
        .in("id", bestieIds);

      if (profilesError) throw profilesError;

      // Get featured bestie data and funding progress
      const { data: featuredBestiesData } = await supabase
        .from("featured_besties")
        .select("id, bestie_id, description, image_url, voice_note_url, monthly_goal")
        .in("bestie_id", bestieIds)
        .eq("approval_status", "approved")
        .eq("is_active", true);

      const { data: fundingData } = await supabase
        .from("bestie_funding_progress")
        .select("bestie_id, current_monthly_pledges, monthly_goal")
        .in("bestie_id", bestieIds);

      // Combine the data
      const transformedData = allSponsorships
        .map(sponsorship => {
          const bestie = profilesData?.find(p => p.id === sponsorship.bestie_id);
          if (!bestie) return null;
          
          const featuredBestie = featuredBestiesData?.find(fb => fb.bestie_id === sponsorship.bestie_id);
          const funding = fundingData?.find(f => f.bestie_id === sponsorship.bestie_id);
          
          return {
            ...sponsorship,
            bestie: {
              display_name: bestie.display_name,
              email: bestie.email,
              avatar_number: bestie.avatar_number
            },
            featured_bestie: featuredBestie ? {
              id: featuredBestie.id,
              description: featuredBestie.description,
              image_url: featuredBestie.image_url,
              voice_note_url: featuredBestie.voice_note_url,
              monthly_goal: funding?.monthly_goal || featuredBestie.monthly_goal || 0,
              current_monthly_pledges: funding?.current_monthly_pledges || 0
            } : null
          };
        })
        .filter(s => s !== null) as Sponsorship[];

      setSponsorships(transformedData);
    } catch (error: any) {
      toast({
        title: "Error loading sponsorships",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddLink = async () => {
    if (!emoji1 || !emoji2 || !emoji3 || !relationship.trim() || !currentUserId) {
      toast({
        title: "Missing information",
        description: "Please select all 3 emojis and describe your relationship",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      const friendCode = `${emoji1}${emoji2}${emoji3}`;
      
      const { data: bestie, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "bestie")
        .eq("friend_code", friendCode)
        .maybeSingle();

      if (error) throw error;
      if (!bestie) {
        toast({
          title: "Friend code not found",
          description: "No bestie found with that friend code",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("caregiver_bestie_links")
        .select("id")
        .eq("caregiver_id", currentUserId)
        .eq("bestie_id", bestie.id)
        .maybeSingle();

      if (existingLink) {
        toast({
          title: "Link already exists",
          description: `You are already connected to ${bestie.display_name}`,
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("caregiver_bestie_links")
        .insert({
          caregiver_id: currentUserId,
          bestie_id: bestie.id,
          relationship: relationship.trim(),
        });

      if (insertError) throw insertError;

      toast({
        title: "Link created",
        description: `Successfully linked to ${bestie.display_name}`,
      });

      setDialogOpen(false);
      setEmoji1("");
      setEmoji2("");
      setEmoji3("");
      setRelationship("");
      
      await loadLinks(currentUserId);
      await loadLinkedBesties(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error creating link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("caregiver_bestie_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast({
        title: "Link removed",
        description: "Bestie account has been unlinked",
      });

      await loadLinks(currentUserId);
      await loadLinkedBesties(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error removing link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleApproval = async (linkId: string, field: 'require_post_approval' | 'require_comment_approval' | 'allow_featured_posts', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("caregiver_bestie_links")
        .update({ [field]: !currentValue })
        .eq("id", linkId);

      if (error) throw error;

      const fieldNames = {
        require_post_approval: 'Post approval',
        require_comment_approval: 'Comment approval',
        allow_featured_posts: 'Featured posts'
      };

      toast({
        title: "Settings updated",
        description: `${fieldNames[field]} ${!currentValue ? 'enabled' : 'disabled'}`,
      });

      if (currentUserId) {
        await loadLinks(currentUserId);
      }
    } catch (error: any) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManageFeaturedPosts = (bestieId: string, bestieName: string) => {
    setSelectedBestieForFeatured({ id: bestieId, name: bestieName });
    setFeaturedBestieDialogOpen(true);
  };

  const handlePlayAudio = (sponsorshipId: string, audioUrl: string) => {
    const audio = audioRefs.current.get(sponsorshipId);
    
    if (playingAudio === sponsorshipId && audio) {
      // Pause the current audio
      audio.pause();
      setPlayingAudio(null);
    } else {
      // Stop any currently playing audio
      if (playingAudio) {
        const currentAudio = audioRefs.current.get(playingAudio);
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }
      
      // Play or create new audio
      let audioElement = audio;
      if (!audioElement) {
        audioElement = new Audio(audioUrl);
        audioElement.addEventListener('ended', () => {
          setPlayingAudio(null);
        });
        audioRefs.current.set(sponsorshipId, audioElement);
      }
      
      audioElement.play().catch(error => {
        console.error('Error playing audio:', error);
        toast({
          title: "Error",
          description: "Could not play audio",
          variant: "destructive",
        });
      });
      setPlayingAudio(sponsorshipId);
    }
  };


  const handleUpdateAmount = async () => {
    if (!changingAmountFor || !newAmount || !currentUserId) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum sponsorship amount is $10",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingAmount(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke('update-sponsorship', {
        body: {
          sponsorship_id: changingAmountFor,
          new_amount: amount,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sponsorship amount updated. Changes will take effect next billing cycle.",
      });

      setChangingAmountFor(null);
      setNewAmount("");
      
      if (currentUserId) {
        await loadSponsorships(currentUserId);
      }
    } catch (error: any) {
      toast({
        title: "Error updating sponsorship",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAmount(false);
    }
  };

  const handleShareClick = (sponsorshipId: string) => {
    setSharingFor(sponsorshipId);
    const shares = existingShares.get(sponsorshipId) || new Set();
    setSelectedBesties(new Set(shares));
  };

  const handleSaveShares = async () => {
    if (!sharingFor) return;

    setIsSavingShares(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentShares = existingShares.get(sharingFor) || new Set();
      
      // Find besties to add and remove
      const toAdd = Array.from(selectedBesties).filter(id => !currentShares.has(id));
      const toRemove = Array.from(currentShares).filter(id => !selectedBesties.has(id));

      // Add new shares
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("sponsorship_shares")
          .insert(
            toAdd.map(bestie_id => ({
              sponsorship_id: sharingFor,
              bestie_id,
              shared_by: user.id
            }))
          );
        
        if (insertError) throw insertError;
      }

      // Remove shares
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("sponsorship_shares")
          .delete()
          .eq("sponsorship_id", sharingFor)
          .in("bestie_id", toRemove);
        
        if (deleteError) throw deleteError;
      }

      // Update local state
      const newShares = new Map(existingShares);
      newShares.set(sharingFor, new Set(selectedBesties));
      setExistingShares(newShares);

      toast({
        title: "Sharing settings updated",
        description: "Your besties can now view this sponsorship",
      });
      
      setSharingFor(null);
    } catch (error: any) {
      console.error("Error updating shares:", error);
      toast({
        title: "Error updating sharing settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingShares(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            <p className="text-muted-foreground">Loading your links...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const ownSponsorships = sponsorships.filter(s => !s.is_shared);
  const sharedWithMe = sponsorships.filter(s => s.is_shared);

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Besties</h1>
              <p className="text-muted-foreground mt-2">
                {userRole === "caregiver" 
                  ? "Manage your guardian relationships and sponsorships"
                  : userRole === "bestie" && sharedWithMe.length > 0
                  ? "View sponsorships shared with you"
                  : "Manage the besties you sponsor"}
              </p>
            </div>
            {userRole === "caregiver" && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Link Bestie
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Link Bestie Account</DialogTitle>
                    <DialogDescription>
                      Enter your bestie's 3-emoji friend code to connect
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>First Emoji</Label>
                        <Select value={emoji1} onValueChange={setEmoji1}>
                          <SelectTrigger className="h-20 text-4xl">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent>
                            {FRIEND_CODE_EMOJIS.map((item) => (
                              <SelectItem key={`1-${item.emoji}`} value={item.emoji} className="text-3xl">
                                {item.emoji}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Second Emoji</Label>
                        <Select value={emoji2} onValueChange={setEmoji2}>
                          <SelectTrigger className="h-20 text-4xl">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent>
                            {FRIEND_CODE_EMOJIS.map((item) => (
                              <SelectItem key={`2-${item.emoji}`} value={item.emoji} className="text-3xl">
                                {item.emoji}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Third Emoji</Label>
                        <Select value={emoji3} onValueChange={setEmoji3}>
                          <SelectTrigger className="h-20 text-4xl">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent>
                            {FRIEND_CODE_EMOJIS.map((item) => (
                              <SelectItem key={`3-${item.emoji}`} value={item.emoji} className="text-3xl">
                                {item.emoji}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {emoji1 && emoji2 && emoji3 && (
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Friend Code Preview:</p>
                        <p className="text-5xl tracking-wider">{emoji1}{emoji2}{emoji3}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="relationship">Your Relationship</Label>
                      <Input
                        id="relationship"
                        placeholder="e.g., Parent, Sibling, Friend"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setDialogOpen(false);
                      setEmoji1("");
                      setEmoji2("");
                      setEmoji3("");
                      setRelationship("");
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddLink} disabled={isSearching}>
                      {isSearching ? (
                        <>
                          <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                          Searching...
                        </>
                      ) : (
                        "Create Link"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Guardian Links Section - Only for caregivers */}
          {userRole === "caregiver" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Guardian Relationships</h2>
              {links.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <LinkIcon className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No linked besties yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Link with bestie accounts to help monitor and approve their posts and comments
                    </p>
                    <Button onClick={() => setDialogOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Link Your First Bestie
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {links.map((link) => (
                    <Card key={link.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <AvatarDisplay
                              avatarNumber={link.bestie.avatar_number}
                              displayName={link.bestie.display_name}
                              size="lg"
                            />
                            <div>
                              <CardTitle>{link.bestie.display_name}</CardTitle>
                              <CardDescription>{link.bestie.email}</CardDescription>
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Link?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to unlink from {link.bestie.display_name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveLink(link.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove Link
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">Relationship:</span>
                            <span>{link.relationship}</span>
                            <span className="mx-2">•</span>
                            <span>Linked {new Date(link.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="space-y-3 pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">
                                  Require Post Approval
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Review and approve posts before they're published
                                </p>
                              </div>
                              <Switch
                                checked={link.require_post_approval}
                                onCheckedChange={() => handleToggleApproval(link.id, 'require_post_approval', link.require_post_approval)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">
                                  Require Comment Approval
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Review and approve comments before they're published
                                </p>
                              </div>
                              <Switch
                                checked={link.require_comment_approval}
                                onCheckedChange={() => handleToggleApproval(link.id, 'require_comment_approval', link.require_comment_approval)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">
                                  Allow Featured Posts
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Allow creating featured posts for this bestie
                                </p>
                              </div>
                              <Switch
                                checked={link.allow_featured_posts}
                                onCheckedChange={() => handleToggleApproval(link.id, 'allow_featured_posts', link.allow_featured_posts)}
                              />
                            </div>
                            {link.allow_featured_posts && (
                              <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => handleManageFeaturedPosts(link.bestie_id, link.bestie.display_name)}
                              >
                                <Star className="w-4 h-4" />
                                Manage Featured Posts
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sponsored Besties Section */}
          {ownSponsorships.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">My Sponsorships</h2>
                <Button onClick={() => navigate("/sponsor-bestie")} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Sponsor Another Bestie
                </Button>
              </div>
              <div className="grid gap-4">
                {ownSponsorships.map((sponsorship) => (
                  <Card key={sponsorship.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <AvatarDisplay
                            avatarNumber={sponsorship.bestie.avatar_number}
                            displayName={sponsorship.bestie.display_name}
                            size="lg"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <CardTitle>{sponsorship.bestie.display_name}</CardTitle>
                            {sponsorship.featured_bestie && (
                              <TextToSpeech 
                                text={`${sponsorship.bestie.display_name}. ${sponsorship.featured_bestie.description}`} 
                                size="icon" 
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {sponsorship.frequency === 'monthly' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setChangingAmountFor(sponsorship.id);
                                setNewAmount(sponsorship.amount.toString());
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Change Amount
                            </Button>
                          )}
                          {linkedBesties.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShareClick(sponsorship.id)}
                            >
                              <Share2 className="w-4 h-4 mr-1" />
                              Share With Besties
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Amount:</span>
                          <span className="text-lg font-bold text-primary">${sponsorship.amount}{sponsorship.frequency === 'monthly' ? '/month' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Type:</span>
                          <span className="capitalize">{sponsorship.frequency}</span>
                          <span className="mx-2">•</span>
                          <span>Started {new Date(sponsorship.started_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {sponsorship.featured_bestie && (
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="font-semibold text-sm text-muted-foreground">Featured Post</h4>
                          
                          <div 
                            className="relative aspect-video w-full overflow-hidden rounded-lg group cursor-pointer"
                            onClick={() => sponsorship.featured_bestie?.voice_note_url && handlePlayAudio(sponsorship.id, sponsorship.featured_bestie.voice_note_url)}
                          >
                            <img 
                              src={sponsorship.featured_bestie.image_url}
                              alt={sponsorship.bestie.display_name}
                              className="w-full h-full object-contain bg-muted"
                            />
                            {sponsorship.featured_bestie.voice_note_url && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                <Button
                                  size="lg"
                                  className="h-16 w-16 rounded-full bg-white/90 hover:bg-white text-primary hover:scale-110 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayAudio(sponsorship.id, sponsorship.featured_bestie!.voice_note_url!);
                                  }}
                                >
                                  {playingAudio === sponsorship.id ? (
                                    <Pause className="w-8 h-8" />
                                  ) : (
                                    <Play className="w-8 h-8 ml-1" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-base text-muted-foreground">
                            {sponsorship.featured_bestie.description}
                          </p>

                          {sponsorship.featured_bestie.monthly_goal > 0 && (
                            <FundingProgressBar
                              currentAmount={sponsorship.featured_bestie.current_monthly_pledges}
                              goalAmount={sponsorship.featured_bestie.monthly_goal}
                              className="mt-4"
                            />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Shared Sponsorships Section */}
          {sharedWithMe.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Shared With Me</h2>
              <div className="grid gap-4">
                {sharedWithMe.map((sponsorship) => (
                  <Card key={sponsorship.id} className="border-2 border-accent/30">
                    <CardHeader>
                      <div className="flex items-center gap-4 flex-1">
                        <AvatarDisplay
                          avatarNumber={sponsorship.bestie.avatar_number}
                          displayName={sponsorship.bestie.display_name}
                          size="lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{sponsorship.bestie.display_name}</CardTitle>
                            {sponsorship.featured_bestie && (
                              <TextToSpeech 
                                text={`${sponsorship.bestie.display_name}. ${sponsorship.featured_bestie.description}`} 
                                size="icon" 
                              />
                            )}
                          </div>
                          <CardDescription>View only • Shared by guardian</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {sponsorship.featured_bestie && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm text-muted-foreground">Featured Post</h4>
                          
                          <div
                            className="relative aspect-video w-full overflow-hidden rounded-lg group cursor-pointer"
                            onClick={() => sponsorship.featured_bestie?.voice_note_url && handlePlayAudio(sponsorship.id, sponsorship.featured_bestie.voice_note_url)}
                          >
                            <img 
                              src={sponsorship.featured_bestie.image_url}
                              alt={sponsorship.bestie.display_name}
                              className="w-full h-full object-contain bg-muted"
                            />
                            {sponsorship.featured_bestie.voice_note_url && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                <Button
                                  size="lg"
                                  className="h-16 w-16 rounded-full bg-white/90 hover:bg-white text-primary hover:scale-110 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayAudio(sponsorship.id, sponsorship.featured_bestie!.voice_note_url!);
                                  }}
                                >
                                  {playingAudio === sponsorship.id ? (
                                    <Pause className="w-8 h-8" />
                                  ) : (
                                    <Play className="w-8 h-8 ml-1" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-base text-muted-foreground">
                            {sponsorship.featured_bestie.description}
                          </p>

                          {sponsorship.featured_bestie.monthly_goal > 0 && (
                            <FundingProgressBar
                              currentAmount={sponsorship.featured_bestie.current_monthly_pledges}
                              goalAmount={sponsorship.featured_bestie.monthly_goal}
                              className="mt-4"
                            />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {ownSponsorships.length === 0 && sharedWithMe.length === 0 && userRole !== "caregiver" && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sponsorships yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {userRole === "bestie" 
                    ? "No sponsorships have been shared with you yet"
                    : "Sponsor a bestie to provide direct support for their programs and activities"}
                </p>
                {userRole !== "bestie" && (
                  <Button onClick={() => navigate("/sponsor-bestie")}>
                    <Heart className="w-4 h-4 mr-2" />
                    Sponsor a Bestie
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />

      {/* Featured Bestie Manager Dialog */}
      {selectedBestieForFeatured && (
        <GuardianFeaturedBestieManager
          bestieId={selectedBestieForFeatured.id}
          bestieName={selectedBestieForFeatured.name}
          open={featuredBestieDialogOpen}
          onOpenChange={setFeaturedBestieDialogOpen}
        />
      )}

      {/* Change Amount Dialog */}
      <Dialog open={changingAmountFor !== null} onOpenChange={(open) => !open && setChangingAmountFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Monthly Amount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">New Monthly Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min="10"
                step="1"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <p className="text-sm text-muted-foreground">
                Minimum $10/month. Changes take effect on your next billing cycle.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangingAmountFor(null)}
              disabled={isUpdatingAmount}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAmount}
              disabled={isUpdatingAmount || !newAmount || parseFloat(newAmount) < 10}
            >
              {isUpdatingAmount ? (
                <>
                  <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                  Updating...
                </>
              ) : (
                "Update Amount"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share with Besties Dialog */}
      <Dialog open={sharingFor !== null} onOpenChange={(open) => !open && setSharingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with Besties</DialogTitle>
            <DialogDescription>
              Select which besties can view this sponsorship (read-only)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {linkedBesties.map((bestie) => (
                <div key={bestie.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={bestie.id}
                    checked={selectedBesties.has(bestie.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedBesties);
                      if (checked) {
                        newSelected.add(bestie.id);
                      } else {
                        newSelected.delete(bestie.id);
                      }
                      setSelectedBesties(newSelected);
                    }}
                  />
                  <Label
                    htmlFor={bestie.id}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <AvatarDisplay
                      avatarNumber={bestie.avatar_number}
                      displayName={bestie.display_name}
                      size="sm"
                    />
                    <span>{bestie.display_name}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSharingFor(null)}
              disabled={isSavingShares}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveShares}
              disabled={isSavingShares}
            >
              {isSavingShares ? (
                <>
                  <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
