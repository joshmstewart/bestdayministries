import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutVideosManager } from "./WorkoutVideosManager";
import { WorkoutActivitiesManager } from "./WorkoutActivitiesManager";
import { WorkoutCategoriesManager } from "./WorkoutCategoriesManager";
import { FitnessAvatarManager } from "./FitnessAvatarManager";
import { WorkoutLocationsManager } from "./WorkoutLocationsManager";
import { AvatarCelebrationImagesManager } from "./AvatarCelebrationImagesManager";
import { AvatarCropManager } from "./AvatarCropManager";
import { Play, ListChecks, FolderOpen, Sparkles, MapPin, PartyPopper, Crop } from "lucide-react";

export const WorkoutManager = () => {
  const [activeTab, setActiveTab] = useState("videos");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Workout Tracker</h2>
        <p className="text-muted-foreground">
          Manage workout videos, activities, and fitness avatars
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
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
          <TabsTrigger value="avatars" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Avatars
          </TabsTrigger>
          <TabsTrigger value="crop" className="flex items-center gap-2">
            <Crop className="h-4 w-4" />
            Crop
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="celebrations" className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4" />
            Celebrations
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

        <TabsContent value="avatars" className="mt-6">
          <FitnessAvatarManager />
        </TabsContent>

        <TabsContent value="crop" className="mt-6">
          <AvatarCropManager />
        </TabsContent>

        <TabsContent value="locations" className="mt-6">
          <WorkoutLocationsManager />
        </TabsContent>

        <TabsContent value="celebrations" className="mt-6">
          <AvatarCelebrationImagesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
