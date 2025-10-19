import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, BookOpen, HelpCircle, Plus } from "lucide-react";
import { TourManager } from "./help/TourManager";
import { GuideManager } from "./help/GuideManager";
import { FAQManager } from "./help/FAQManager";
import { useToast } from "@/hooks/use-toast";

export function HelpCenterManager() {
  const [activeTab, setActiveTab] = useState("tours");
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Help Center Management</h2>
        <p className="text-muted-foreground">
          Manage product tours, guides, and FAQs
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex flex-wrap h-auto">
          <TabsTrigger value="tours" className="gap-2 whitespace-nowrap">
            <PlayCircle className="h-4 w-4" />
            Tours
          </TabsTrigger>
          <TabsTrigger value="guides" className="gap-2 whitespace-nowrap">
            <BookOpen className="h-4 w-4" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-2 whitespace-nowrap">
            <HelpCircle className="h-4 w-4" />
            FAQs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tours" className="mt-6">
          <TourManager />
        </TabsContent>

        <TabsContent value="guides" className="mt-6">
          <GuideManager />
        </TabsContent>

        <TabsContent value="faqs" className="mt-6">
          <FAQManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
