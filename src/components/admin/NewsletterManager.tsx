import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsletterCampaigns } from "./newsletter/NewsletterCampaigns";
import { NewsletterSubscribers } from "./newsletter/NewsletterSubscribers";
import { NewsletterAnalytics } from "./newsletter/NewsletterAnalytics";
import { NewsletterSettings } from "./newsletter/NewsletterSettings";
import { NewsletterTemplates } from "./newsletter/NewsletterTemplates";
import { CampaignTemplates } from "./newsletter/CampaignTemplates";
import { AutomatedSendsLog } from "./newsletter/AutomatedSendsLog";
import { NewsletterEmailsLog } from "./newsletter/NewsletterEmailsLog";
import { SponsorshipReceiptsManager } from "./sponsorships/SponsorshipReceiptsManager";

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
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex flex-wrap h-auto">
            <TabsTrigger value="campaigns" className="whitespace-nowrap">Campaigns</TabsTrigger>
            <TabsTrigger value="automated" className="whitespace-nowrap">Automated</TabsTrigger>
            <TabsTrigger value="templates" className="whitespace-nowrap">Templates</TabsTrigger>
            <TabsTrigger value="log" className="whitespace-nowrap">Email Log</TabsTrigger>
            <TabsTrigger value="receipts" className="whitespace-nowrap">Sponsorship Receipts</TabsTrigger>
            <TabsTrigger value="subscribers" className="whitespace-nowrap">Subscribers</TabsTrigger>
            <TabsTrigger value="analytics" className="whitespace-nowrap">Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="campaigns" className="space-y-4">
          <NewsletterCampaigns />
        </TabsContent>

        <TabsContent value="automated" className="space-y-4">
          <CampaignTemplates />
          <AutomatedSendsLog />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <NewsletterTemplates />
        </TabsContent>

        <TabsContent value="log" className="space-y-4">
          <NewsletterEmailsLog />
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <SponsorshipReceiptsManager />
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