import { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, Trash2, UserPlus, Star, Heart } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { FRIEND_CODE_EMOJIS } from "@/lib/friendCodeEmojis";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { GuardianFeaturedBestieManager } from "@/components/GuardianFeaturedBestieManager";

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

interface Sponsorship {
  id: string;
  bestie_id: string;
  amount: number;
  frequency: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  bestie: {
    display_name: string;
    email: string;
    avatar_number: number;
  };
}

export default function GuardianLinks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<BestieLink[]>([]);
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

      // Allow caregivers, supporters, admins, and owners
      if (!profile || (profile.role !== "caregiver" && profile.role !== "supporter" && profile.role !== "admin" && profile.role !== "owner")) {
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

  const loadSponsorships = async (userId: string) => {
    try {
      // First get sponsorships
      const { data: sponsorshipsData, error: sponsorshipsError } = await supabase
        .from("sponsorships")
        .select("id, bestie_id, amount, frequency, status, started_at, ended_at")
        .eq("sponsor_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      if (sponsorshipsError) throw sponsorshipsError;

      if (!sponsorshipsData || sponsorshipsData.length === 0) {
        setSponsorships([]);
        return;
      }

      // Then get bestie profiles for those sponsorships
      const bestieIds = sponsorshipsData.map(s => s.bestie_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_number")
        .in("id", bestieIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedData = sponsorshipsData
        .map(sponsorship => {
          const bestie = profilesData?.find(p => p.id === sponsorship.bestie_id);
          if (!bestie) return null; // Filter out if bestie not found
          
          return {
            ...sponsorship,
            bestie: {
              display_name: bestie.display_name,
              email: bestie.email,
              avatar_number: bestie.avatar_number
            }
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

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
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

          {/* Sponsored Besties Section - For all roles */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Sponsored Besties</h2>
            {sponsorships.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Heart className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sponsorships yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Sponsor a bestie to provide direct support for their programs and activities
                  </p>
                  <Button onClick={() => navigate("/sponsor-bestie")}>
                    <Heart className="w-4 h-4 mr-2" />
                    Sponsor a Bestie
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sponsorships.map((sponsorship) => (
                  <Card key={sponsorship.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <AvatarDisplay
                            avatarNumber={sponsorship.bestie.avatar_number}
                            displayName={sponsorship.bestie.display_name}
                            size="lg"
                          />
                          <div>
                            <CardTitle>{sponsorship.bestie.display_name}</CardTitle>
                            <CardDescription>{sponsorship.bestie.email}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
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
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Status:</span>
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                            Active
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />

      {selectedBestieForFeatured && (
        <GuardianFeaturedBestieManager
          bestieId={selectedBestieForFeatured.id}
          bestieName={selectedBestieForFeatured.name}
          open={featuredBestieDialogOpen}
          onOpenChange={setFeaturedBestieDialogOpen}
        />
      )}
    </div>
  );
}