import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Calendar, MessageSquare, Heart, ArrowLeft } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { FeaturedBestieManager } from "@/components/admin/FeaturedBestieManager";
import { UserManagement } from "@/components/admin/UserManagement";
import { AvatarUploader } from "@/components/admin/AvatarUploader";
import { AppSettingsManager } from "@/components/admin/AppSettingsManager";
import { RoleImpersonator } from "@/components/admin/RoleImpersonator";
import { useModerationCount } from "@/hooks/useModerationCount";
import HomepageOrderManager from "@/components/admin/HomepageOrderManager";
import { FeaturedItemManager } from "@/components/admin/FeaturedItemManager";
import { useRoleImpersonation, UserRole } from "@/hooks/useRoleImpersonation";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [actualRole, setActualRole] = useState<UserRole | null>(null);
  const { getEffectiveRole, impersonatedRole } = useRoleImpersonation();
  const { count: moderationCount } = useModerationCount();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalPosts: 0,
    totalFeatured: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Update effective permissions when impersonation changes
  useEffect(() => {
    if (actualRole) {
      const effectiveRole = getEffectiveRole(actualRole);
      setIsAdmin(effectiveRole === "admin" || effectiveRole === "owner");
      setIsOwner(effectiveRole === "owner");
    }
  }, [actualRole, impersonatedRole, getEffectiveRole]);

  const checkAdminAccess = async () => {
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

    // Check for admin-level access (owner role automatically has admin access)
    if (profile?.role !== "admin" && profile?.role !== "owner") {
      toast({
        title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate("/community");
        return;
      }

      // Store actual role and calculate effective role with impersonation
      setActualRole(profile?.role as UserRole);
      const effectiveRole = getEffectiveRole(profile?.role as UserRole);
      setIsAdmin(effectiveRole === "admin" || effectiveRole === "owner");
      setIsOwner(effectiveRole === "owner");
      await loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/community");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const [usersCount, eventsCount, postsCount, featuredCount] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("discussion_posts").select("*", { count: "exact", head: true }),
      supabase.from("featured_besties").select("*", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: usersCount.count || 0,
      totalEvents: eventsCount.count || 0,
      totalPosts: postsCount.count || 0,
      totalFeatured: featuredCount.count || 0,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/community")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Community
          </Button>
          <h1 className="text-4xl font-black text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Manage your Best Day Ministries community</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discussion Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPosts}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured Besties</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFeatured}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="featured">Featured Besties</TabsTrigger>
            <TabsTrigger value="featured-item">Featured Item</TabsTrigger>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="moderation" className="relative">
              Moderation
              {moderationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                >
                  {moderationCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Event Management</CardTitle>
                <CardDescription>Create and manage community events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Create and manage events with images, audio, dates, times, and locations.
                  </p>
                  <Button onClick={() => navigate("/admin/events")} className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Manage Events
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="albums">
            <Card>
              <CardHeader>
                <CardTitle>Photo Albums</CardTitle>
                <CardDescription>Create and manage photo albums</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Create photo albums with multiple images, captions, and optional event links.
                  </p>
                  <Button onClick={() => navigate("/admin/albums")} className="gap-2">
                    <Heart className="w-4 h-4" />
                    Manage Albums
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedBestieManager />
          </TabsContent>

          <TabsContent value="featured-item">
            <FeaturedItemManager />
          </TabsContent>

          <TabsContent value="homepage">
            <HomepageOrderManager />
          </TabsContent>

          <TabsContent value="moderation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Moderation</CardTitle>
                <CardDescription>Review and moderate community content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Review posts and comments that have been flagged by our AI moderation system.
                  </p>
                  <Button onClick={() => navigate("/moderation")} className="gap-2 relative">
                    <Shield className="w-4 h-4" />
                    Open Moderation Queue
                    {moderationCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center rounded-full"
                      >
                        {moderationCount}
                      </Badge>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <AvatarUploader />

            <Card>
              <CardHeader>
                <CardTitle>Manage Existing Avatars</CardTitle>
                <CardDescription>Manage avatar categories and visibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Control which avatars are available to users and organize them by category.
                  </p>
                  <Button onClick={() => navigate("/admin/avatars")} className="gap-2">
                    <Users className="w-4 h-4" />
                    Manage Avatars
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <RoleImpersonator />
              <AppSettingsManager />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
