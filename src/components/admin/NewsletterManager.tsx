import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsletterCampaigns } from "./newsletter/NewsletterCampaigns";
import { NewsletterSubscribers } from "./newsletter/NewsletterSubscribers";
import { NewsletterAnalytics } from "./newsletter/NewsletterAnalytics";
import { NewsletterSettings } from "./newsletter/NewsletterSettings";
import { NewsletterTemplates } from "./newsletter/NewsletterTemplates";

export const NewsletterManager = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Newsletter</h2>
        <p className="text-muted-foreground">
          Manage your email campaigns, subscribers, and analytics
        </p>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <NewsletterCampaigns />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <NewsletterTemplates />
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-4">
          <NewsletterSubscribers />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <NewsletterAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <NewsletterSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};