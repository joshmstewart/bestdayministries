import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, HandHeart, BookOpen, Sparkles } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { MyPrayers } from "@/components/prayer-requests/MyPrayers";
import { CommunityPrayers } from "@/components/prayer-requests/CommunityPrayers";
import { AnsweredPrayersGallery } from "@/components/prayer-requests/AnsweredPrayersGallery";
import { PrayerRequestDialog } from "@/components/prayer-requests/PrayerRequestDialog";

const PrayerRequests = () => {
  const { user, role } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePrayerCreated = () => {
    setRefreshKey(prev => prev + 1);
    setCreateDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <BackButton to="/community" />
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold">Prayer Requests</h1>
              <p className="text-muted-foreground">
                Share your heart, support others, and watch prayers be answered
              </p>
            </div>

            {/* Create Button */}
            {user && (
              <div className="flex justify-center">
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2 bg-gradient-warm"
                >
                  <Plus className="w-4 h-4" />
                  New Prayer Request
                </Button>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="community" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="community" className="gap-2">
                  <HandHeart className="w-4 h-4" />
                  <span className="hidden sm:inline">Community Board</span>
                  <span className="sm:hidden">Community</span>
                </TabsTrigger>
                <TabsTrigger value="my-prayers" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">My Prayers</span>
                  <span className="sm:hidden">My Prayers</span>
                </TabsTrigger>
                <TabsTrigger value="answered" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Answered</span>
                  <span className="sm:hidden">Answered</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="community">
                <CommunityPrayers key={`community-${refreshKey}`} userId={user?.id} />
              </TabsContent>

              <TabsContent value="my-prayers">
                {user ? (
                  <MyPrayers 
                    key={`my-${refreshKey}`} 
                    userId={user.id} 
                    onRefresh={() => setRefreshKey(prev => prev + 1)} 
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Sign in to see your prayer requests</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="answered">
                <AnsweredPrayersGallery key={`answered-${refreshKey}`} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Create Dialog */}
      <PrayerRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handlePrayerCreated}
        userId={user?.id}
        userRole={role}
      />
    </div>
  );
};

export default PrayerRequests;
