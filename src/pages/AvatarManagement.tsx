import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, ArrowLeft } from "lucide-react";

type AvatarCategory = "humans" | "animals" | "monsters" | "shapes";

interface Avatar {
  id: string;
  avatar_number: number;
  category: AvatarCategory;
  is_active: boolean;
}

export default function AvatarManagement() {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch role from user_roles table (security requirement)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    // Check for admin-level access (owner role automatically has admin access)
    if (!roleData || (roleData.role !== "admin" && roleData.role !== "owner")) {
      showErrorToast("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    loadAvatars();
  };

  const loadAvatars = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .order("avatar_number");

    if (error) {
      showErrorToastWithCopy("Failed to load avatars", error);
      console.error(error);
    } else {
      setAvatars(data || []);
    }
    setLoading(false);
  };

  const updateAvatar = async (id: string, updates: Partial<Avatar>) => {
    const { error } = await supabase
      .from("avatars")
      .update(updates)
      .eq("id", id);

    if (error) {
      showErrorToastWithCopy("Failed to update avatar", error);
      console.error(error);
    } else {
      toast.success("Avatar updated successfully");
      loadAvatars();
    }
  };

  const handleCategoryChange = (avatarId: string, category: string) => {
    updateAvatar(avatarId, { category: category as AvatarCategory });
  };

  const handleActiveToggle = (avatarId: string, isActive: boolean) => {
    updateAvatar(avatarId, { is_active: isActive });
  };

  const handleDelete = async (avatarId: string, avatarNumber: number) => {
    const { error } = await supabase
      .from("avatars")
      .delete()
      .eq("id", avatarId);

    if (error) {
      showErrorToastWithCopy("Failed to delete avatar", error);
      console.error(error);
    } else {
      toast.success(`Avatar ${avatarNumber} deleted successfully`);
      loadAvatars();
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 container mx-auto px-4 pt-20 pb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Avatar Management</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                  <p className="text-muted-foreground">Loading avatars...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {avatars.map((avatar) => (
                  <Card key={avatar.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <AvatarDisplay
                          displayName={`Avatar ${avatar.avatar_number}`}
                          size="lg"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">Avatar {avatar.avatar_number}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Avatar {avatar.avatar_number}</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this avatar? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(avatar.id, avatar.avatar_number)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`category-${avatar.id}`}>Category</Label>
                          <Select
                            value={avatar.category}
                            onValueChange={(value) => handleCategoryChange(avatar.id, value)}
                          >
                            <SelectTrigger id={`category-${avatar.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="humans">Humans</SelectItem>
                              <SelectItem value="animals">Animals</SelectItem>
                              <SelectItem value="monsters">Monsters & Aliens</SelectItem>
                              <SelectItem value="shapes">Shapes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`active-${avatar.id}`}>Active</Label>
                          <Switch
                            id={`active-${avatar.id}`}
                            checked={avatar.is_active}
                            onCheckedChange={(checked) => handleActiveToggle(avatar.id, checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
