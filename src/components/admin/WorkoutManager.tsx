import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutVideosManager } from "./WorkoutVideosManager";
import { WorkoutActivitiesManager } from "./WorkoutActivitiesManager";
import { WorkoutCategoriesManager } from "./WorkoutCategoriesManager";
import { Play, ListChecks, FolderOpen } from "lucide-react";

export const WorkoutManager = () => {
  const [activeTab, setActiveTab] = useState("videos");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Workout Tracker</h2>
        <p className="text-muted-foreground">
          Manage workout videos and quick-log activities
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-6">
          <WorkoutVideosManager />
        </TabsContent>

        <TabsContent value="activities" className="mt-6">
          <WorkoutActivitiesManager />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <WorkoutCategoriesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
