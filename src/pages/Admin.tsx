import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Calendar, MessageSquare, Heart, ArrowLeft, HelpCircle, Bell, Megaphone } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { FeaturedBestieManager } from "@/components/admin/FeaturedBestieManager";
import { SponsorBestieManager } from "@/components/admin/SponsorBestieManager";
import { SponsorPageOrderManager } from "@/components/admin/SponsorPageOrderManager";
import { SupportPageManager } from "@/components/admin/SupportPageManager";
import { SponsorBestiePageManager } from "@/components/admin/SponsorBestiePageManager";
import { ReceiptSettingsManager } from "@/components/admin/ReceiptSettingsManager";
import { SponsorshipTransactionsManager } from "@/components/admin/SponsorshipTransactionsManager";
import { DonationRecoveryManager } from "@/components/admin/DonationRecoveryManager";
import { WebhookLogsViewer } from "@/components/admin/WebhookLogsViewer";
import { YearEndSummarySettings } from "@/components/admin/YearEndSummarySettings";
import { YearEndSummarySentHistory } from "@/components/admin/YearEndSummarySentHistory";
import { RecalculateAmountsTest } from "@/components/admin/RecalculateAmountsTest";
import { DonationDebugger } from "@/components/admin/DonationDebugger";
import { DuplicateTransactionsDetector } from "@/components/admin/DuplicateTransactionsDetector";
import { StripeCustomerChecker } from "@/components/admin/StripeCustomerChecker";
import { UserManagement } from "@/components/admin/UserManagement";
import { AvatarUploader } from "@/components/admin/AvatarUploader";
import { AppSettingsManager } from "@/components/admin/AppSettingsManager";
import { RoleImpersonator } from "@/components/admin/RoleImpersonator";
import { useModerationCount } from "@/hooks/useModerationCount";
import { usePendingVendorsCount } from "@/hooks/usePendingVendorsCount";
import { useMessageModerationCount } from "@/hooks/useMessageModerationCount";
import { useMessagesCount } from "@/hooks/useMessagesCount";
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
import { EmailTemplatePreview } from "@/components/admin/EmailTemplatePreview";
import { HelpCenterManager } from "@/components/admin/HelpCenterManager";
import { ProductUpdateBroadcaster } from "@/components/admin/ProductUpdateBroadcaster";
import CoffeeShopManager from "@/components/admin/CoffeeShopManager";
import { StripeModeSwitcher } from "@/components/admin/StripeModeSwitcher";
import { TestEnvironmentManager } from "@/components/admin/TestEnvironmentManager";
import { TTSVoiceManager } from "@/components/admin/TTSVoiceManager";
import { CoinsManager } from "@/components/admin/CoinsManager";
import { StoreItemsManager } from "@/components/admin/StoreItemsManager";
import { PetTypesManager } from "@/components/admin/PetTypesManager";
import { SocialSharingGuide } from "@/components/admin/SocialSharingGuide";
import { StaticMetaTagsManager } from "@/components/admin/StaticMetaTagsManager";
import { DeleteFakeDonations } from "@/components/admin/DeleteFakeDonations";
import { ChangeLogManager } from "@/components/admin/ChangeLogManager";
import { ErrorLogsManager } from "@/components/admin/ErrorLogsManager";
import IssueReportsManager from "@/components/admin/IssueReportsManager";
import TestRunsManager from "@/components/admin/TestRunsManager";
import { StickerCollectionManager } from "@/components/admin/StickerCollectionManager";
import { NewsletterManager } from "@/components/admin/NewsletterManager";
import { AudioClipsManager } from "@/components/admin/AudioClipsManager";
import { SoundEffectsManager } from "@/components/admin/SoundEffectsManager";

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
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

      // Fetch role from user_roles table (security requirement)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    // Check for admin-level access (owner role automatically has admin access)
    if (roleData?.role !== "admin" && roleData?.role !== "owner") {
      toast({
        title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate("/community");
        return;
      }

      // Store actual role and calculate effective role with impersonation
      setActualRole(roleData?.role as UserRole);
      const effectiveRole = getEffectiveRole(roleData?.role as UserRole);
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
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="featured">Besties</TabsTrigger>
            <TabsTrigger value="sponsorships">Donations</TabsTrigger>
            <TabsTrigger value="featured-item">Featured Item</TabsTrigger>
            <TabsTrigger value="stickers">Stickers</TabsTrigger>
            <TabsTrigger value="vendors" className="relative">
              Vendors
              {pendingVendorsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                >
                  {pendingVendorsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            <TabsTrigger value="format-pages">Format Pages</TabsTrigger>
            <TabsTrigger value="moderation" className="relative">
              Moderation
              {(moderationCount + messageModerationCount) > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                >
                  {moderationCount + messageModerationCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-2">
              <Megaphone className="w-4 h-4" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              Messages
              {messagesCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                >
                  {messagesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>Comprehensive insights into your platform's performance</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsDashboard />
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
                    <TabsTrigger value="sound-effects">Sound Effects</TabsTrigger>
                  </TabsList>

                  <TabsContent value="videos">
                    <VideoManager />
                  </TabsContent>

                  <TabsContent value="audio">
                    <AudioClipsManager />
                  </TabsContent>

                  <TabsContent value="sound-effects">
                    <SoundEffectsManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedBestieManager />
          </TabsContent>

          <TabsContent value="sponsorships">
            <Card>
              <CardHeader>
                <CardTitle>Donations</CardTitle>
                <CardDescription>Manage sponsor page content and active sponsorships</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="transactions" className="space-y-4">
                  <TabsList className="flex flex-wrap h-auto w-full">
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
                    <TabsTrigger value="webhook-logs">Webhook Logs</TabsTrigger>
                    <TabsTrigger value="recovery">Recovery Tool</TabsTrigger>
                    <TabsTrigger value="sponsorships">Sponsor Besties</TabsTrigger>
                    <TabsTrigger value="page-content">Sponsor Page</TabsTrigger>
                    <TabsTrigger value="page-order">Page Order</TabsTrigger>
                    <TabsTrigger value="receipts">Receipt Settings</TabsTrigger>
                    <TabsTrigger value="year-end-settings">Year-End Settings</TabsTrigger>
                    <TabsTrigger value="sent-history">Sent History</TabsTrigger>
                    <TabsTrigger value="support-page">Support Us Page</TabsTrigger>
                    <TabsTrigger value="test-recalc">Test Recalc</TabsTrigger>
                    <TabsTrigger value="debug">Debug Reconciliation</TabsTrigger>
                    <TabsTrigger value="cleanup">Delete Fake Donations</TabsTrigger>
                  </TabsList>

                  <TabsContent value="transactions">
                    <SponsorshipTransactionsManager />
                  </TabsContent>

                  <TabsContent value="duplicates">
                    <DuplicateTransactionsDetector />
                  </TabsContent>

                  <TabsContent value="debug">
                    <div className="space-y-6">
                      <StripeCustomerChecker />
                      <DonationDebugger />
                    </div>
                  </TabsContent>

                  <TabsContent value="cleanup">
                    <DeleteFakeDonations />
                  </TabsContent>

                  <TabsContent value="webhook-logs">
                    <WebhookLogsViewer />
                  </TabsContent>

                  <TabsContent value="recovery">
                    <DonationRecoveryManager />
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

                  <TabsContent value="test-recalc">
                    <RecalculateAmountsTest />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="featured-item">
            <FeaturedItemManager />
          </TabsContent>

          <TabsContent value="stickers">
            <StickerCollectionManager />
          </TabsContent>

          <TabsContent value="vendors">
            <VendorManagement />
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
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="community">Community</TabsTrigger>
                    <TabsTrigger value="coffee-shop">Coffee Shop</TabsTrigger>
                    <TabsTrigger value="navigation">Navigation Bar</TabsTrigger>
                    <TabsTrigger value="family-orgs">Family Orgs</TabsTrigger>
                    <TabsTrigger value="partners">Partners</TabsTrigger>
                    <TabsTrigger value="footer">Footer</TabsTrigger>
                    <TabsTrigger value="quick-links">Quick Links</TabsTrigger>
                  </TabsList>

                  <TabsContent value="homepage">
                    <LandingPageOrderManager />
                  </TabsContent>

                  <TabsContent value="about">
                    <AboutPageManager />
                  </TabsContent>

                  <TabsContent value="community">
                    <CommunityOrderManager />
                  </TabsContent>

                  <TabsContent value="coffee-shop">
                    <CoffeeShopManager />
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
                <Tabs defaultValue="product-updates" className="space-y-4">
                  <TabsList className="inline-flex flex-wrap h-auto">
                    <TabsTrigger value="product-updates" className="whitespace-nowrap">Product Updates</TabsTrigger>
                    <TabsTrigger value="change-logs" className="whitespace-nowrap">Change Logs</TabsTrigger>
                  </TabsList>

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
                    <TabsTrigger value="stripe">Stripe Mode</TabsTrigger>
                    <TabsTrigger value="social-sharing">Social Sharing</TabsTrigger>
                    <TabsTrigger value="static-meta">Static Meta Tags</TabsTrigger>
                    <TabsTrigger value="avatars">Avatars</TabsTrigger>
                    <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
                    <TabsTrigger value="coins">Coins</TabsTrigger>
                    <TabsTrigger value="store">Store Items</TabsTrigger>
                    <TabsTrigger value="pet-types">Pet Types</TabsTrigger>
                    <TabsTrigger value="locations">Locations</TabsTrigger>
                    <TabsTrigger value="impersonation">Impersonation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="app">
                    <AppSettingsManager />
                  </TabsContent>

                  <TabsContent value="stripe">
                    <StripeModeSwitcher />
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

                  <TabsContent value="tts">
                    <TTSVoiceManager />
                  </TabsContent>

                  <TabsContent value="coins">
                    <CoinsManager />
                  </TabsContent>

                  <TabsContent value="store">
                    <StoreItemsManager />
                  </TabsContent>

                  <TabsContent value="pet-types">
                    <PetTypesManager />
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
