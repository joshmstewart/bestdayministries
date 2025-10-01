import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AvatarDisplay } from "@/components/AvatarDisplay";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      toast.error("Access denied. Admin privileges required.");
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
      toast.error("Failed to load avatars");
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
      toast.error("Failed to update avatar");
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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Avatar Management</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading avatars...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {avatars.map((avatar) => (
                  <Card key={avatar.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <AvatarDisplay
                          avatarNumber={avatar.avatar_number}
                          displayName={`Avatar ${avatar.avatar_number}`}
                          size="lg"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">Avatar {avatar.avatar_number}</p>
                        </div>
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
