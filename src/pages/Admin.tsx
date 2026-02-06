import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Calendar, MessageSquare, Heart, ArrowLeft, HelpCircle, Bell, Megaphone, Activity } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { FeaturedBestieManager } from "@/components/admin/FeaturedBestieManager";
import { SponsorBestieManager } from "@/components/admin/SponsorBestieManager";
import { SponsorPageOrderManager } from "@/components/admin/SponsorPageOrderManager";
import { SupportPageManager } from "@/components/admin/SupportPageManager";
import { SponsorBestiePageManager } from "@/components/admin/SponsorBestiePageManager";
import { ReceiptSettingsManager } from "@/components/admin/ReceiptSettingsManager";
import { SponsorshipTransactionsManager } from "@/components/admin/SponsorshipTransactionsManager";
import { WebhookLogsViewer } from "@/components/admin/WebhookLogsViewer";
import { YearEndSummarySettings } from "@/components/admin/YearEndSummarySettings";
import { YearEndSummarySentHistory } from "@/components/admin/YearEndSummarySentHistory";
import { DataMaintenanceTools } from "@/components/admin/DataMaintenanceTools";
import { UserManagement } from "@/components/admin/UserManagement";
import { AvatarUploader } from "@/components/admin/AvatarUploader";
import { AppSettingsManager } from "@/components/admin/AppSettingsManager";
import { AppConfigManager } from "@/components/admin/AppConfigManager";
import { RoleImpersonator } from "@/components/admin/RoleImpersonator";
import { useModerationCount } from "@/hooks/useModerationCount";
import { usePendingVendorsCount } from "@/hooks/usePendingVendorsCount";
import { useMessageModerationCount } from "@/hooks/useMessageModerationCount";
import { useMessagesCount } from "@/hooks/useMessagesCount";
import { useUnmatchedItemsCount } from "@/hooks/useUnmatchedItemsCount";
import LandingPageOrderManager from "@/components/admin/HomepageOrderManager";
import CommunityOrderManager from "@/components/admin/CommunityOrderManager";
import AboutPageManager from "@/components/admin/AboutPageManager";
import { FeaturedItemManager } from "@/components/admin/FeaturedItemManager";
import { useRoleImpersonation, UserRole } from "@/hooks/useRoleImpersonation";
import { FamilyOrganizationsManager } from "@/components/admin/FamilyOrganizationsManager";
import { FooterLinksManager } from "@/components/admin/FooterLinksManager";
import QuickLinksManager from "@/components/admin/QuickLinksManager";
import { NavigationBarManager } from "@/components/admin/NavigationBarManager";
import { VendorManagement } from "@/components/admin/VendorManagement";
import { MessagesManager } from "@/components/admin/MessagesManager";
import { VideoManager } from "@/components/admin/VideoManager";
import { MessageModerationQueue } from "@/components/admin/MessageModerationQueue";
import { ModerationPolicyManager } from "@/components/admin/ModerationPolicyManager";
import { SavedLocationsManager } from "@/components/admin/SavedLocationsManager";
import { PartnersManager } from "@/components/admin/PartnersManager";
import EmailAuditLog from "@/components/admin/EmailAuditLog";
import ContactFormSettings from "@/components/admin/ContactFormSettings";
import ContactSubmissions from "@/components/admin/ContactSubmissions";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { PageVisitsAnalytics } from "@/components/admin/PageVisitsAnalytics";
import { UserActivityAnalytics } from "@/components/admin/UserActivityAnalytics";
import { TabClickAnalytics } from "@/components/admin/TabClickAnalytics";
import { EmailTemplatePreview } from "@/components/admin/EmailTemplatePreview";
import { HelpCenterManager } from "@/components/admin/HelpCenterManager";
import { ProductUpdateBroadcaster } from "@/components/admin/ProductUpdateBroadcaster";
import { ContentAnnouncementsManager } from "@/components/admin/ContentAnnouncementsManager";
import CoffeeShopManager from "@/components/admin/CoffeeShopManager";
import { StripeModeSwitcher } from "@/components/admin/StripeModeSwitcher";
import { MarketplaceStripeModeSwitcher } from "@/components/admin/MarketplaceStripeModeSwitcher";
import { TestEnvironmentManager } from "@/components/admin/TestEnvironmentManager";
import { TTSVoiceManager } from "@/components/admin/TTSVoiceManager";
import { CoinsManager } from "@/components/admin/CoinsManager";
import { StoreItemsManager } from "@/components/admin/StoreItemsManager";
import { BeatPadSoundsManager } from "@/components/admin/BeatPadSoundsManager";

import { SocialSharingGuide } from "@/components/admin/SocialSharingGuide";
import { StaticMetaTagsManager } from "@/components/admin/StaticMetaTagsManager";

import { ChangeLogManager } from "@/components/admin/ChangeLogManager";
import { ErrorLogsManager } from "@/components/admin/ErrorLogsManager";
import IssueReportsManager from "@/components/admin/IssueReportsManager";
import TestRunsManager from "@/components/admin/TestRunsManager";
import { StickerCollectionManager } from "@/components/admin/StickerCollectionManager";
import { ColoringManager } from "@/components/admin/ColoringManager";
import { NewsletterManager } from "@/components/admin/NewsletterManager";
import { AudioClipsManager } from "@/components/admin/AudioClipsManager";
import { SoundEffectsManager } from "@/components/admin/SoundEffectsManager";
import { DrinkIngredientsManager } from "@/components/admin/DrinkIngredientsManager";
import { DrinkVibesManager } from "@/components/admin/DrinkVibesManager";
import { RecipeIngredientsManager } from "@/components/admin/RecipeIngredientsManager";
import { RecipeToolsManager } from "@/components/admin/RecipeToolsManager";
import { RecipeUnmatchedItemsManager } from "@/components/admin/RecipeUnmatchedItemsManager";
import { CashRegisterStoresManager } from "@/components/admin/CashRegisterStoresManager";
import { CurrencyImagesManager } from "@/components/admin/CurrencyImagesManager";
import { CashRegisterCustomersManager } from "@/components/admin/CashRegisterCustomersManager";
import { CashRegisterPacksManager } from "@/components/admin/CashRegisterPacksManager";
import { CashRegisterRewardsManager } from "@/components/admin/CashRegisterRewardsManager";
import { MemoryMatchPackManager } from "@/components/admin/MemoryMatchPackManager";
import { JokeLibraryManager } from "@/components/admin/JokeLibraryManager";
import { JokeCategoriesManager } from "@/components/admin/JokeCategoriesManager";
import { JokeDuplicatesManager } from "@/components/admin/JokeDuplicatesManager";
import { CoinRewardsManager } from "@/components/admin/CoinRewardsManager";
import { FortunesManager } from "@/components/admin/FortunesManager";
import { DailyBarIconsManager } from "@/components/admin/DailyBarIconsManager";
import { DailyEngagementSettingsManager } from "@/components/admin/DailyEngagementSettingsManager";
import { CoinTransactionsManager } from "@/components/admin/CoinTransactionsManager";
import WelcomeModalManager from "@/components/admin/WelcomeModalManager";
import { StoreAccessManager } from "@/components/admin/StoreAccessManager";
import { PicturePasswordImagesViewer } from "@/components/admin/PicturePasswordImagesViewer";
import { ChoreBadgeManager } from "@/components/admin/ChoreBadgeManager";
import { ChoreChallengeManager } from "@/components/admin/ChoreChallengeManager";
import { ChoreRewardWheelManager } from "@/components/admin/ChoreRewardWheelManager";
import { WorkoutManager } from "@/components/admin/WorkoutManager";
import { CardManager } from "@/components/admin/CardManager";
import { GuardianResourcesManager } from "@/components/admin/GuardianResourcesManager";
import JoyHouseStoresManager from "@/components/admin/JoyHouseStoresManager";
import { AiUsageManager } from "@/components/admin/AiUsageManager";
import { CoffeeVendorManager } from "@/components/admin/CoffeeVendorManager";
import { AvatarEmojisManager } from "@/components/admin/AvatarEmojisManager";
import { SystemHealthManager } from "@/components/admin/SystemHealthManager";
import { useHealthAlertBadge } from "@/hooks/useHealthAlertBadge";
const Admin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, role, isAdmin: authIsAdmin, isOwner: authIsOwner, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [actualRole, setActualRole] = useState<UserRole | null>(null);
  const { getEffectiveRole, impersonatedRole } = useRoleImpersonation();
  
  // Get tab from URL query parameter or default to "users"
  const defaultTab = searchParams.get('tab') || 'users';
  const { count: moderationCount } = useModerationCount();
  const { count: pendingVendorsCount } = usePendingVendorsCount();
  const { count: messageModerationCount } = useMessageModerationCount();
  const { count: messagesCount } = useMessagesCount();
  const { count: unmatchedItemsCount } = useUnmatchedItemsCount();
  const { deadCount: healthDeadCount } = useHealthAlertBadge();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalPosts: 0,
    totalFeatured: 0,
  });

  // Check admin access using AuthContext
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check for admin-level access using role from AuthContext
    if (!authIsAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/community");
      return;
    }

    // Store actual role and calculate effective role with impersonation
    setActualRole(role as UserRole);
    const effectiveRole = getEffectiveRole(role as UserRole);
    setIsAdmin(effectiveRole === "admin" || effectiveRole === "owner");
    setIsOwner(effectiveRole === "owner");
    loadStats();
    setLoading(false);
  }, [authLoading, user, role, authIsAdmin, navigate, toast, getEffectiveRole]);

  // Update effective permissions when impersonation changes
  useEffect(() => {
    if (actualRole) {
      const effectiveRole = getEffectiveRole(actualRole);
      setIsAdmin(effectiveRole === "admin" || effectiveRole === "owner");
      setIsOwner(effectiveRole === "owner");
    }
  }, [actualRole, impersonatedRole, getEffectiveRole]);

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
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 pt-20 pb-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
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
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="analytics" className="text-sm px-2.5 py-1.5">Analytics</TabsTrigger>
            <TabsTrigger value="users" className="text-sm px-2.5 py-1.5">Users</TabsTrigger>
            <TabsTrigger value="media" className="text-sm px-2.5 py-1.5">Media</TabsTrigger>
            <TabsTrigger value="events" className="text-sm px-2.5 py-1.5">Events</TabsTrigger>
            <TabsTrigger value="albums" className="text-sm px-2.5 py-1.5">Albums</TabsTrigger>
            <TabsTrigger value="featured" className="text-sm px-2.5 py-1.5">Besties</TabsTrigger>
            <TabsTrigger value="sponsorships" className="text-sm px-2.5 py-1.5">Donations</TabsTrigger>
            <TabsTrigger value="games" className="text-sm px-2.5 py-1.5">Games</TabsTrigger>
            <TabsTrigger value="resources" className="relative text-sm px-2.5 py-1.5">
              Resources
              {unmatchedItemsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]"
                >
                  {unmatchedItemsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vendors" className="relative text-sm px-2.5 py-1.5">
              Store
              {pendingVendorsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]"
                >
                  {pendingVendorsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="text-sm px-2.5 py-1.5">Newsletter</TabsTrigger>
            <TabsTrigger value="format-pages" className="text-sm px-2.5 py-1.5">Format</TabsTrigger>
            <TabsTrigger value="moderation" className="relative text-sm px-2.5 py-1.5">
              Moderation
              {(moderationCount + messageModerationCount) > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]"
                >
                  {moderationCount + messageModerationCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-sm px-2.5 py-1.5">
              <Bell className="w-3 h-3" />
              Notifs
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-1.5 text-sm px-2.5 py-1.5">
              <Megaphone className="w-3 h-3" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="testing" className="text-sm px-2.5 py-1.5">Testing</TabsTrigger>
            <TabsTrigger value="messages" className="relative text-sm px-2.5 py-1.5">
              Messages
              {messagesCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]"
                >
                  {messagesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-1.5 text-sm px-2.5 py-1.5">
              <HelpCircle className="w-3 h-3" />
              Help
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-sm px-2.5 py-1.5">Issues</TabsTrigger>
            <TabsTrigger value="system-health" className="gap-1.5 text-sm px-2.5 py-1.5 relative">
              <Activity className="w-3 h-3" />
              Health
              {healthDeadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">
                  {healthDeadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm px-2.5 py-1.5">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>Comprehensive insights into your platform's performance</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="flex-wrap">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="page-visits">Page Visits</TabsTrigger>
                    <TabsTrigger value="user-activity">User Activity</TabsTrigger>
                    <TabsTrigger value="tab-clicks">Tab Clicks</TabsTrigger>
                    <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <AnalyticsDashboard />
                  </TabsContent>
                  <TabsContent value="page-visits">
                    <PageVisitsAnalytics />
                  </TabsContent>
                  <TabsContent value="user-activity">
                    <UserActivityAnalytics />
                  </TabsContent>
                  <TabsContent value="tab-clicks">
                    <TabClickAnalytics />
                  </TabsContent>
                  <TabsContent value="ai-usage">
                    <AiUsageManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle>Media Management</CardTitle>
                <CardDescription>Upload and manage videos and audio clips</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="videos" className="space-y-4">
                  <TabsList className="inline-flex flex-wrap h-auto">
                    <TabsTrigger value="videos">Videos</TabsTrigger>
                    <TabsTrigger value="audio">Audio Clips</TabsTrigger>
                  </TabsList>

                  <TabsContent value="videos">
                    <VideoManager />
                  </TabsContent>

                  <TabsContent value="audio">
                    <AudioClipsManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedBestieManager />
          </TabsContent>

          <TabsContent value="sponsorships">
            <div className="space-y-6">
              <StripeModeSwitcher />
              <Card>
                <CardHeader>
                  <CardTitle>Donations</CardTitle>
                  <CardDescription>Manage sponsor page content and active sponsorships</CardDescription>
                </CardHeader>
                <CardContent>
                <Tabs defaultValue="transactions" className="space-y-4">
                  <TabsList className="flex flex-wrap h-auto w-full">
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="webhook-logs">Webhook Logs</TabsTrigger>
                    <TabsTrigger value="sponsorships">Sponsor Besties</TabsTrigger>
                    <TabsTrigger value="page-content">Sponsor Page</TabsTrigger>
                    <TabsTrigger value="page-order">Page Order</TabsTrigger>
                    <TabsTrigger value="receipts">Receipt Settings</TabsTrigger>
                    <TabsTrigger value="year-end-settings">Year-End Settings</TabsTrigger>
                    <TabsTrigger value="sent-history">Sent History</TabsTrigger>
                    <TabsTrigger value="support-page">Support Us Page</TabsTrigger>
                    <TabsTrigger value="data-maintenance">Data Maintenance</TabsTrigger>
                  </TabsList>

                  <TabsContent value="transactions">
                    <SponsorshipTransactionsManager />
                  </TabsContent>

                  <TabsContent value="webhook-logs">
                    <WebhookLogsViewer />
                  </TabsContent>

                  <TabsContent value="sponsorships">
                    <SponsorBestieManager />
                  </TabsContent>

                  <TabsContent value="page-content">
                    <SponsorBestiePageManager />
                  </TabsContent>

                  <TabsContent value="page-order">
                    <SponsorPageOrderManager />
                  </TabsContent>

                  <TabsContent value="receipts">
                    <ReceiptSettingsManager />
                  </TabsContent>

                  <TabsContent value="year-end-settings">
                    <YearEndSummarySettings />
                  </TabsContent>

                  <TabsContent value="sent-history">
                    <YearEndSummarySentHistory />
                  </TabsContent>

                  <TabsContent value="support-page">
                    <SupportPageManager />
                  </TabsContent>

                  <TabsContent value="data-maintenance">
                    <DataMaintenanceTools />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            </div>
          </TabsContent>


          <TabsContent value="games">
            <Card>
              <CardHeader>
                <CardTitle>Games Management</CardTitle>
                <CardDescription>Manage game assets and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="earn-coins" className="space-y-4">
                  <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="earn-coins">Earn Coins</TabsTrigger>
                    <TabsTrigger value="coins">Manage Coins</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="store-items">Store Items</TabsTrigger>
                    <TabsTrigger value="beat-pad">Beat Pad</TabsTrigger>
                    <TabsTrigger value="memory-match">Memory Match</TabsTrigger>
                    <TabsTrigger value="jokes">Jokes</TabsTrigger>
                    <TabsTrigger value="stickers">Stickers</TabsTrigger>
                    <TabsTrigger value="drink">Drinks</TabsTrigger>
                    <TabsTrigger value="coloring">Coloring</TabsTrigger>
                  </TabsList>

                  <TabsContent value="earn-coins">
                    <CoinRewardsManager />
                  </TabsContent>
                  
                  <TabsContent value="coins">
                    <CoinsManager />
                  </TabsContent>
                  
                  <TabsContent value="store-items">
                    <StoreItemsManager />
                  </TabsContent>

                  <TabsContent value="transactions">
                    <CoinTransactionsManager />
                  </TabsContent>

                  <TabsContent value="beat-pad">
                    <BeatPadSoundsManager />
                  </TabsContent>

                  <TabsContent value="memory-match">
                    <MemoryMatchPackManager />
                  </TabsContent>

                  <TabsContent value="jokes">
                    <Tabs defaultValue="library" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="library">Jokes</TabsTrigger>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                        <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
                      </TabsList>
                      <TabsContent value="library">
                        <JokeLibraryManager />
                      </TabsContent>
                      <TabsContent value="categories">
                        <JokeCategoriesManager />
                      </TabsContent>
                      <TabsContent value="duplicates">
                        <JokeDuplicatesManager />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                  
                  <TabsContent value="stickers">
                    <StickerCollectionManager />
                  </TabsContent>

                  <TabsContent value="drink">
                    <Tabs defaultValue="ingredients" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                        <TabsTrigger value="vibes">Vibes</TabsTrigger>
                      </TabsList>
                      <TabsContent value="ingredients">
                        <DrinkIngredientsManager />
                      </TabsContent>
                      <TabsContent value="vibes">
                        <DrinkVibesManager />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="coloring">
                    <ColoringManager />
                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>Resources Management</CardTitle>
                <CardDescription>Manage resources like recipes and chore tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="guardian-resources" className="space-y-4">
                  <TabsList className="inline-flex flex-wrap h-auto">
                    <TabsTrigger value="guardian-resources">Guardian Resources</TabsTrigger>
                    <TabsTrigger value="recipes" className="relative">
                      Recipes
                      {unmatchedItemsCount > 0 && (
                        <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                          {unmatchedItemsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="cash-register">Cash Register</TabsTrigger>
                    <TabsTrigger value="chores">Chores</TabsTrigger>
                    <TabsTrigger value="emotions">Emotions</TabsTrigger>
                    <TabsTrigger value="daily-features">Daily Features</TabsTrigger>
                    <TabsTrigger value="workout">Workout</TabsTrigger>
                    <TabsTrigger value="cards">Card Creator</TabsTrigger>
                  </TabsList>

                  <TabsContent value="guardian-resources">
                    <GuardianResourcesManager />
                  </TabsContent>

                  <TabsContent value="cash-register">
                    <Tabs defaultValue="stores" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="stores">Stores</TabsTrigger>
                        <TabsTrigger value="customers">Customers</TabsTrigger>
                        <TabsTrigger value="packs">Packs</TabsTrigger>
                        <TabsTrigger value="currency">Currency</TabsTrigger>
                        <TabsTrigger value="rewards">Rewards</TabsTrigger>
                      </TabsList>
                      <TabsContent value="stores">
                        <CashRegisterStoresManager />
                      </TabsContent>
                      <TabsContent value="customers">
                        <CashRegisterCustomersManager />
                      </TabsContent>
                      <TabsContent value="packs">
                        <CashRegisterPacksManager />
                      </TabsContent>
                      <TabsContent value="currency">
                        <CurrencyImagesManager />
                      </TabsContent>
                      <TabsContent value="rewards">
                        <CashRegisterRewardsManager />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="recipes">
                    <Tabs defaultValue="ingredients" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                        <TabsTrigger value="tools">Tools</TabsTrigger>
                        <TabsTrigger value="unmatched" className="relative">
                          Unmatched Items
                          {unmatchedItemsCount > 0 && (
                            <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                              {unmatchedItemsCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="ingredients">
                        <RecipeIngredientsManager />
                      </TabsContent>
                      <TabsContent value="tools">
                        <RecipeToolsManager />
                      </TabsContent>
                      <TabsContent value="unmatched">
                        <RecipeUnmatchedItemsManager />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="chores">
                    <Tabs defaultValue="badges" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="badges">Badges</TabsTrigger>
                        <TabsTrigger value="challenges">Monthly Challenges</TabsTrigger>
                        <TabsTrigger value="reward-wheel">Reward Wheel</TabsTrigger>
                      </TabsList>
                      <TabsContent value="badges">
                        <ChoreBadgeManager />
                      </TabsContent>
                      <TabsContent value="challenges">
                        <ChoreChallengeManager />
                      </TabsContent>
                      <TabsContent value="reward-wheel">
                        <ChoreRewardWheelManager />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="emotions">
                    <Tabs defaultValue="avatar-emojis" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="avatar-emojis">Avatar Emojis</TabsTrigger>
                      </TabsList>
                      <TabsContent value="avatar-emojis">
                        <AvatarEmojisManager />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="daily-features" className="space-y-6">
                    <DailyEngagementSettingsManager />
                    <DailyBarIconsManager />
                    <FortunesManager />
                  </TabsContent>

                  <TabsContent value="workout">
                    <WorkoutManager />
                  </TabsContent>

                  <TabsContent value="cards">
                    <CardManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <CardTitle>Store & Vendors</CardTitle>
                <CardDescription>Manage marketplace settings and vendors</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="vendors" className="space-y-4">
                  <TabsList className="inline-flex flex-wrap h-auto">
                    <TabsTrigger value="vendors">Vendors</TabsTrigger>
                    <TabsTrigger value="coffee">Coffee</TabsTrigger>
                    <TabsTrigger value="marketplace">Marketplace Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="vendors">
                    <div className="space-y-6">
                      <MarketplaceStripeModeSwitcher />
                      <VendorManagement />
                    </div>
                  </TabsContent>

                  <TabsContent value="coffee">
                    <CoffeeVendorManager />
                  </TabsContent>
                  
                  <TabsContent value="marketplace">
                    <StoreAccessManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="newsletter">
            <NewsletterManager />
          </TabsContent>

          <TabsContent value="format-pages">
            <Card>
              <CardHeader>
                <CardTitle>Format Pages</CardTitle>
                <CardDescription>Manage landing page sections, about page, community page, family organizations, footer links, and quick links. Click the edit button on Community Features to manage individual features.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="homepage" className="space-y-4">
                  <TabsList className="flex flex-wrap h-auto">
                    <TabsTrigger value="homepage">Landing Page</TabsTrigger>
                    <TabsTrigger value="featured-item">Featured Item</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="community">Community</TabsTrigger>
                    <TabsTrigger value="apps-grid">Apps Grid</TabsTrigger>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="coffee-shop">Coffee Shop</TabsTrigger>
                    <TabsTrigger value="joy-house-stores">Joy House Stores</TabsTrigger>
                    <TabsTrigger value="welcome-modal">Welcome Modal</TabsTrigger>
                    <TabsTrigger value="navigation">Navigation Bar</TabsTrigger>
                    <TabsTrigger value="family-orgs">Family Orgs</TabsTrigger>
                    <TabsTrigger value="partners">Partners</TabsTrigger>
                    <TabsTrigger value="footer">Footer</TabsTrigger>
                    <TabsTrigger value="quick-links">Quick Links</TabsTrigger>
                  </TabsList>

                  <TabsContent value="homepage">
                    <LandingPageOrderManager />
                  </TabsContent>

                  <TabsContent value="featured-item">
                    <FeaturedItemManager />
                  </TabsContent>

                  <TabsContent value="about">
                    <AboutPageManager />
                  </TabsContent>

                  <TabsContent value="community">
                    <CommunityOrderManager />
                  </TabsContent>

                  <TabsContent value="apps-grid">
                    <AppConfigManager />
                  </TabsContent>

                  <TabsContent value="daily" className="space-y-6">
                    <DailyBarIconsManager />
                    <DailyEngagementSettingsManager />
                  </TabsContent>

                  <TabsContent value="coffee-shop">
                    <CoffeeShopManager />
                  </TabsContent>

                  <TabsContent value="joy-house-stores">
                    <JoyHouseStoresManager />
                  </TabsContent>

                  <TabsContent value="welcome-modal">
                    <WelcomeModalManager />
                  </TabsContent>

                  <TabsContent value="navigation">
                    <NavigationBarManager />
                  </TabsContent>

                  <TabsContent value="family-orgs">
                    <FamilyOrganizationsManager />
                  </TabsContent>

                  <TabsContent value="partners">
                    <PartnersManager />
                  </TabsContent>

                  <TabsContent value="footer">
                    <FooterLinksManager />
                  </TabsContent>

                  <TabsContent value="quick-links">
                    <QuickLinksManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation" className="space-y-4">
            <ModerationPolicyManager />
            
            <MessageModerationQueue />

            <Card>
              <CardHeader>
                <CardTitle>Posts & Comments - Moderation</CardTitle>
                <CardDescription>Review and moderate discussion posts and comments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Review discussion posts and comments that have been flagged by AI moderation.
                  </p>
                  <Button onClick={() => navigate("/moderation")} className="gap-2 relative">
                    <Shield className="w-4 h-4" />
                    Open Post/Comment Queue
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
          </TabsContent>

          <TabsContent value="notifications">
            <EmailTemplatePreview />
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Manage contact form messages and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="all">All Messages</TabsTrigger>
                    <TabsTrigger value="settings">Contact Form Settings</TabsTrigger>
                    <TabsTrigger value="email-audit">Email Audit</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <ContactSubmissions />
                  </TabsContent>

                  <TabsContent value="settings">
                    <ContactFormSettings />
                  </TabsContent>

                  <TabsContent value="email-audit">
                    <EmailAuditLog />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help">
            <HelpCenterManager />
          </TabsContent>

          <TabsContent value="updates">
            <Card>
              <CardHeader>
                <CardTitle>Product Updates & Change Logs</CardTitle>
                <CardDescription>Broadcast updates to users and track system changes</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="announcements" className="space-y-4">
                  <TabsList className="inline-flex flex-wrap h-auto">
                    <TabsTrigger value="announcements" className="whitespace-nowrap">Content Announcements</TabsTrigger>
                    <TabsTrigger value="product-updates" className="whitespace-nowrap">Product Updates</TabsTrigger>
                    <TabsTrigger value="change-logs" className="whitespace-nowrap">Change Logs</TabsTrigger>
                  </TabsList>

                  <TabsContent value="announcements">
                    <ContentAnnouncementsManager />
                  </TabsContent>

                  <TabsContent value="product-updates">
                    <ProductUpdateBroadcaster />
                  </TabsContent>

                  <TabsContent value="change-logs">
                    <ChangeLogManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test Environment Management</CardTitle>
                  <CardDescription>Reset test data and manage test accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <TestEnvironmentManager />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Automated Test Runs</CardTitle>
                  <CardDescription>View GitHub Actions test run history and results</CardDescription>
                </CardHeader>
                <CardContent>
                  <TestRunsManager />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Issue Reports & System Logs</CardTitle>
                <CardDescription>View user-reported issues and system error logs</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="issue-reports" className="space-y-4">
                  <TabsList className="inline-flex flex-wrap h-auto">
                    <TabsTrigger value="issue-reports" className="whitespace-nowrap">Issue Reports</TabsTrigger>
                    <TabsTrigger value="system-logs" className="whitespace-nowrap">System Logs</TabsTrigger>
                  </TabsList>

                  <TabsContent value="issue-reports">
                    <IssueReportsManager />
                  </TabsContent>

                  <TabsContent value="system-logs">
                    <ErrorLogsManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system-health">
            <SystemHealthManager />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage app settings, avatars, and impersonation</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="app" className="space-y-4">
                  <TabsList className="flex flex-wrap h-auto">
                    <TabsTrigger value="app">App Settings</TabsTrigger>
                    <TabsTrigger value="social-sharing">Social Sharing</TabsTrigger>
                    <TabsTrigger value="static-meta">Static Meta Tags</TabsTrigger>
                    <TabsTrigger value="avatars">Avatars</TabsTrigger>
                    <TabsTrigger value="picture-passwords">Picture Passwords</TabsTrigger>
                    <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
                    <TabsTrigger value="sound-effects">Sound Effects</TabsTrigger>
                    <TabsTrigger value="locations">Locations</TabsTrigger>
                    <TabsTrigger value="impersonation">Impersonation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="app">
                    <AppSettingsManager />
                  </TabsContent>

                  <TabsContent value="social-sharing">
                    <SocialSharingGuide />
                  </TabsContent>

                  <TabsContent value="static-meta">
                    <StaticMetaTagsManager />
                  </TabsContent>

                  <TabsContent value="avatars" className="space-y-6">
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

                  <TabsContent value="picture-passwords">
                    <PicturePasswordImagesViewer />
                  </TabsContent>

                  <TabsContent value="tts">
                    <TTSVoiceManager />
                  </TabsContent>

                  <TabsContent value="sound-effects">
                    <SoundEffectsManager />
                  </TabsContent>

                  <TabsContent value="locations">
                    <SavedLocationsManager />
                  </TabsContent>

                  <TabsContent value="impersonation">
                    <RoleImpersonator />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
