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

interface BestieLink {
  id: string;
  bestie_id: string;
  relationship: string;
  created_at: string;
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
  const [selectedBestie, setSelectedBestie] = useState("");
  const [relationship, setRelationship] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      await loadAvailableBesties(user.id);
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

  const loadAvailableBesties = async (userId: string) => {
    try {
      // Get all besties that are not already linked to this guardian
      const { data: allBesties, error: bestiesError } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_number")
        .eq("role", "bestie");

      if (bestiesError) throw bestiesError;

      // Get already linked bestie IDs
      const { data: linkedIds, error: linksError } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id")
        .eq("caregiver_id", userId);

      if (linksError) throw linksError;

      const linkedBestieIds = new Set(linkedIds?.map(l => l.bestie_id) || []);
      const available = (allBesties || []).filter(b => !linkedBestieIds.has(b.id));

      setAvailableBesties(available);
    } catch (error: any) {
      toast({
        title: "Error loading besties",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddLink = async () => {
    if (!selectedBestie || !relationship.trim() || !currentUserId) {
      toast({
        title: "Missing information",
        description: "Please select a bestie and enter your relationship",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("caregiver_bestie_links")
        .insert({
          caregiver_id: currentUserId,
          bestie_id: selectedBestie,
          relationship: relationship.trim(),
        });

      if (error) throw error;

      toast({
        title: "Link created",
        description: "Successfully linked to bestie account",
      });

      setDialogOpen(false);
      setSelectedBestie("");
      setRelationship("");
      
      await loadLinks(currentUserId);
      await loadAvailableBesties(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error creating link",
        description: error.message,
        variant: "destructive",
      });
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
      await loadAvailableBesties(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error removing link",
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Bestie Account</DialogTitle>
                  <DialogDescription>
                    Connect with a bestie account to help monitor and support their activity
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bestie">Select Bestie</Label>
                    <Select value={selectedBestie} onValueChange={setSelectedBestie}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a bestie to link" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBesties.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No available besties to link
                          </div>
                        ) : (
                          availableBesties.map((bestie) => (
                            <SelectItem key={bestie.id} value={bestie.id}>
                              {bestie.display_name} ({bestie.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLink}>
                    Create Link
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Relationship:</span>
                      <span>{link.relationship}</span>
                      <span className="mx-2">•</span>
                      <span>Linked {new Date(link.created_at).toLocaleDateString()}</span>
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