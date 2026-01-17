import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomActivityForm } from "./CustomActivityForm";

interface AllActivitiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  todayLogs: string[];
  onSelectActivity: (activity: { id: string; name: string }) => void;
  isPending?: boolean;
}

export function AllActivitiesDialog({
  open,
  onOpenChange,
  userId,
  todayLogs,
  onSelectActivity,
  isPending,
}: AllActivitiesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");

  // Fetch all activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["all-workout-activities", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_activities")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("display_order");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Group activities by category
  const groupedActivities = activities.reduce((acc, activity) => {
    const category = activity.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  // Filter activities by search
  const filteredCategories = Object.entries(groupedActivities).reduce(
    (acc, [category, acts]) => {
      const filtered = acts.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, typeof activities>
  );

  const handleSelectActivity = (activity: { id: string; name: string }) => {
    onSelectActivity(activity);
    onOpenChange(false);
  };

  const handleCustomActivityCreated = (activity: { id: string; name: string }) => {
    handleSelectActivity(activity);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Log an Activity</DialogTitle>
          <DialogDescription>
            Choose from all activities or create a custom one
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "browse" | "create")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            <TabsTrigger value="create" className="gap-1">
              <Plus className="h-3 w-3" />
              Create Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(filteredCategories).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities found. Try creating a custom one!
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {Object.entries(filteredCategories).map(([category, acts]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {category}
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {acts.map((activity) => {
                          const isLoggedToday = todayLogs.includes(activity.id);
                          return (
                            <Button
                              key={activity.id}
                              variant="outline"
                              className={cn(
                                "h-auto flex-col gap-1 py-3 px-2 relative",
                                isLoggedToday && "bg-green-100 dark:bg-green-900/30 border-green-500"
                              )}
                              onClick={() => handleSelectActivity({ id: activity.id, name: activity.name })}
                              disabled={isLoggedToday || isPending}
                            >
                              <span className="text-2xl">{activity.icon}</span>
                              <span className="text-xs font-medium text-center leading-tight">
                                {activity.name}
                              </span>
                              {isLoggedToday && (
                                <CheckCircle2 className="absolute top-1 right-1 h-3 w-3 text-green-500" />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-4">
            <CustomActivityForm
              userId={userId}
              onSuccess={handleCustomActivityCreated}
              onCancel={() => setActiveTab("browse")}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
