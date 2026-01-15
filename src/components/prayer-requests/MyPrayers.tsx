import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Trash2, 
  Lock, 
  Globe, 
  Loader2, 
  Share2, 
  CheckCircle2,
  Edit,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PrayerRequestDialog } from "./PrayerRequestDialog";

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  is_answered: boolean;
  answered_at: string | null;
  answer_notes: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

interface MyPrayersProps {
  userId: string;
  onRefresh: () => void;
}

export const MyPrayers = ({ userId, onRefresh }: MyPrayersProps) => {
  const queryClient = useQueryClient();
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prayerToDelete, setPrayerToDelete] = useState<string | null>(null);

  const { data: prayers, isLoading, refetch } = useQuery({
    queryKey: ["my-prayers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PrayerRequest[];
    },
    enabled: !!userId,
  });

  const toggleShareMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("prayer_requests")
        .update({ is_public: isPublic })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isPublic }) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["community-prayers"] });
      toast.success(isPublic ? "Shared with community!" : "Made private");
    },
    onError: () => {
      toast.error("Failed to update sharing status");
    },
  });

  const toggleAnsweredMutation = useMutation({
    mutationFn: async ({ id, isAnswered }: { id: string; isAnswered: boolean }) => {
      const { error } = await supabase
        .from("prayer_requests")
        .update({ 
          is_answered: isAnswered,
          answered_at: isAnswered ? new Date().toISOString() : null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isAnswered }) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["community-prayers"] });
      toast.success(isAnswered ? "Marked as answered! 🙏" : "Unmarked as answered");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const handleDelete = async () => {
    if (!prayerToDelete) return;
    const { error } = await supabase
      .from("prayer_requests")
      .delete()
      .eq("id", prayerToDelete);
    if (error) {
      toast.error("Failed to delete prayer request");
    } else {
      toast.success("Prayer request deleted");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["community-prayers"] });
    }
    setPrayerToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedPrayer(null);
    refetch();
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground mt-2">Loading your prayers...</p>
      </div>
    );
  }

  if (!prayers?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>You haven't created any prayer requests yet.</p>
        <p className="text-sm mt-1">Click "New Prayer Request" to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {prayers.map((prayer) => (
          <Card key={prayer.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{prayer.title}</h3>
                    {prayer.is_answered && (
                      <Badge className="bg-green-500/90 text-white gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Answered
                      </Badge>
                    )}
                    {prayer.is_public ? (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="w-3 h-3" />
                        Shared
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Private
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(prayer.created_at), "MMM d, yyyy")}
                    {prayer.likes_count > 0 && ` · ${prayer.likes_count} praying`}
                  </p>
                </div>
              </div>

              <p className="text-sm line-clamp-3">{prayer.content}</p>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPrayer(prayer);
                    setEditDialogOpen(true);
                  }}
                  className="gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAnsweredMutation.mutate({ 
                    id: prayer.id, 
                    isAnswered: !prayer.is_answered 
                  })}
                  disabled={toggleAnsweredMutation.isPending}
                  className={prayer.is_answered ? "text-green-600" : ""}
                >
                  {toggleAnsweredMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  {prayer.is_answered ? "Answered" : "Mark Answered"}
                </Button>

                {prayer.is_public ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleShareMutation.mutate({ 
                      id: prayer.id, 
                      isPublic: false 
                    })}
                    disabled={toggleShareMutation.isPending}
                    className="gap-1"
                  >
                    {toggleShareMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    Make Private
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleShareMutation.mutate({ 
                      id: prayer.id, 
                      isPublic: true 
                    })}
                    disabled={toggleShareMutation.isPending}
                    className="gap-1 text-green-600"
                  >
                    {toggleShareMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Share2 className="w-3 h-3" />
                    )}
                    Share
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPrayerToDelete(prayer.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive hover:text-destructive gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <PrayerRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
        userId={userId}
        editingPrayer={selectedPrayer}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this prayer request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your prayer request. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
