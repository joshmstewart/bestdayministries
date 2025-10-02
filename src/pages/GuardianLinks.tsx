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
import { Loader2, Link as LinkIcon, Trash2, UserPlus } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { FRIEND_CODE_EMOJIS, formatFriendCode } from "@/lib/friendCodeEmojis";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface BestieLink {
  id: string;
  bestie_id: string;
  relationship: string;
  created_at: string;
  require_post_approval: boolean;
  require_comment_approval: boolean;
  bestie: {
    display_name: string;
    email: string;
    avatar_number: number;
  };
}

interface AvailableBestie {
  id: string;
  display_name: string;
  email: string;
  avatar_number: number;
}

export default function GuardianLinks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<BestieLink[]>([]);
  const [availableBesties, setAvailableBesties] = useState<AvailableBestie[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [friendCodeNumber, setFriendCodeNumber] = useState("");
  const [relationship, setRelationship] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "caregiver") {
        toast({
          title: "Access denied",
          description: "Only guardians can access this page",
          variant: "destructive",
        });
        navigate("/community");
        return;
      }

      setCurrentUserId(user.id);
      await loadLinks(user.id);
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
          bestie:profiles!caregiver_bestie_links_bestie_id_fkey(
            display_name,
            email,
            avatar_number
          )
        `)
        .eq("caregiver_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
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

  const findBestieByFriendCode = async (emoji: string, number: string) => {
    if (!emoji || !number || !currentUserId) return null;

    const numValue = parseInt(number);
    if (isNaN(numValue) || numValue < 1 || numValue > 20) {
      return null;
    }

    try {
      // Check if already linked
      const { data: existingLink } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id")
        .eq("caregiver_id", currentUserId)
        .eq("bestie_id", (await supabase
          .from("profiles")
          .select("id")
          .eq("friend_code_emoji", emoji)
          .eq("friend_code_number", numValue)
          .single()).data?.id || "")
        .maybeSingle();

      if (existingLink) {
        return null; // Already linked
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_number, friend_code_emoji, friend_code_number")
        .eq("role", "bestie")
        .eq("friend_code_emoji", emoji)
        .eq("friend_code_number", numValue)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Error finding bestie:", error);
      return null;
    }
  };

  const handleAddLink = async () => {
    if (!selectedEmoji || !friendCodeNumber || !relationship.trim() || !currentUserId) {
      toast({
        title: "Missing information",
        description: "Please select an emoji, enter the number, and describe your relationship",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      const bestie = await findBestieByFriendCode(selectedEmoji, friendCodeNumber);

      if (!bestie) {
        toast({
          title: "Friend code not found",
          description: "No bestie found with that friend code or already linked",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const { error } = await supabase
        .from("caregiver_bestie_links")
        .insert({
          caregiver_id: currentUserId,
          bestie_id: bestie.id,
          relationship: relationship.trim(),
        });

      if (error) throw error;

      toast({
        title: "Link created",
        description: `Successfully linked to ${bestie.display_name}`,
      });

      setDialogOpen(false);
      setSelectedEmoji("");
      setFriendCodeNumber("");
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

  const handleToggleApproval = async (linkId: string, field: 'require_post_approval' | 'require_comment_approval', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("caregiver_bestie_links")
        .update({ [field]: !currentValue })
        .eq("id", linkId);

      if (error) throw error;

      toast({
        title: "Settings updated",
        description: `${field === 'require_post_approval' ? 'Post' : 'Comment'} approval ${!currentValue ? 'enabled' : 'disabled'}`,
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Linked Besties</h1>
              <p className="text-muted-foreground mt-2">
                Manage the bestie accounts you're connected with as a guardian
              </p>
            </div>
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
                    Enter your bestie's friend code to connect with their account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-3">
                    <Label>Step 1: Select Emoji</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {FRIEND_CODE_EMOJIS.map(({ emoji, name }) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setSelectedEmoji(emoji)}
                          className={cn(
                            "p-4 text-4xl rounded-lg border-2 transition-all hover:scale-110",
                            selectedEmoji === emoji
                              ? "border-primary bg-primary/10 scale-110"
                              : "border-border hover:border-primary/50"
                          )}
                          title={name}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {selectedEmoji && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedEmoji} {FRIEND_CODE_EMOJIS.find(e => e.emoji === selectedEmoji)?.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Step 2: Enter Number (01-20)</Label>
                    <Input
                      id="number"
                      type="number"
                      min="1"
                      max="20"
                      placeholder="Enter 2-digit number"
                      value={friendCodeNumber}
                      onChange={(e) => setFriendCodeNumber(e.target.value)}
                      className="text-xl text-center"
                    />
                    {selectedEmoji && friendCodeNumber && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Friend Code:</p>
                        <p className="text-3xl font-bold">
                          {formatFriendCode(selectedEmoji, parseInt(friendCodeNumber))}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationship">Step 3: Your Relationship</Label>
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
                    setSelectedEmoji("");
                    setFriendCodeNumber("");
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
          </div>

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
                              Are you sure you want to unlink from {link.bestie.display_name}? You will no longer be able to monitor or approve their activity.
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
                            <Label htmlFor={`post-approval-${link.id}`} className="text-sm font-medium">
                              Require Post Approval
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Review and approve posts before they're published
                            </p>
                          </div>
                          <Switch
                            id={`post-approval-${link.id}`}
                            checked={link.require_post_approval}
                            onCheckedChange={() => handleToggleApproval(link.id, 'require_post_approval', link.require_post_approval)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor={`comment-approval-${link.id}`} className="text-sm font-medium">
                              Require Comment Approval
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Review and approve comments before they're visible
                            </p>
                          </div>
                          <Switch
                            id={`comment-approval-${link.id}`}
                            checked={link.require_comment_approval}
                            onCheckedChange={() => handleToggleApproval(link.id, 'require_comment_approval', link.require_comment_approval)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}