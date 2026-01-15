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
  BookOpen,
  EyeOff,
  Clock,
  RefreshCw,
  Sparkles,
  Mic,
  AlertCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours, addWeeks, addDays, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { PrayerRequestDialog } from "./PrayerRequestDialog";
import { AnsweredPrayerDialog } from "./AnsweredPrayerDialog";
import { TextToSpeech } from "@/components/TextToSpeech";
import AudioPlayer from "@/components/AudioPlayer";

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
  is_anonymous: boolean;
  share_duration: string | null;
  expires_at: string | null;
  gratitude_message: string | null;
  audio_url: string | null;
  approval_status: string | null;
}

interface MyPrayersProps {
  userId: string;
  onRefresh: () => void;
}

const getRenewalDays = (shareDuration: string | null): number => {
  switch (shareDuration) {
    case "1_week":
    case "2_weeks":
      return 2;
    case "1_month":
    default:
      return 5;
  }
};

const canRenew = (expiresAt: string | null, shareDuration: string | null): boolean => {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const daysUntilExpiry = differenceInDays(expiryDate, new Date());
  const renewalDays = getRenewalDays(shareDuration);
  return daysUntilExpiry <= renewalDays && daysUntilExpiry >= 0;
};

const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return isPast(new Date(expiresAt));
};

const formatTimeRemaining = (expiresAt: string | null): string | null => {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysRemaining = differenceInDays(expiryDate, now);
  const hoursRemaining = differenceInHours(expiryDate, now);
  
  if (daysRemaining > 1) {
    return `${daysRemaining} days`;
  } else if (daysRemaining === 1) {
    return "1 day";
  } else if (hoursRemaining > 0) {
    return `${hoursRemaining}h`;
  }
  return null;
};

const calculateNewExpiresAt = (shareDuration: string | null): string => {
  const now = new Date();
  switch (shareDuration) {
    case "1_week":
      return addWeeks(now, 1).toISOString();
    case "2_weeks":
      return addWeeks(now, 2).toISOString();
    case "1_month":
    default:
      return addDays(now, 30).toISOString();
  }
};

export const MyPrayers = ({ userId, onRefresh }: MyPrayersProps) => {
  const queryClient = useQueryClient();
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [answeredDialogOpen, setAnsweredDialogOpen] = useState(false);
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
    mutationFn: async ({ id, isPublic, shareDuration }: { id: string; isPublic: boolean; shareDuration?: string }) => {
      const expiresAt = isPublic ? calculateNewExpiresAt(shareDuration || "1_month") : null;
      const { error } = await supabase
        .from("prayer_requests")
        .update({ 
          is_public: isPublic,
          expires_at: expiresAt,
          share_duration: shareDuration || "1_month",
          expiry_notified: false
        })
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

  const renewMutation = useMutation({
    mutationFn: async ({ id, shareDuration }: { id: string; shareDuration: string | null }) => {
      const newExpiresAt = calculateNewExpiresAt(shareDuration);
      const { error } = await supabase
        .from("prayer_requests")
        .update({ 
          expires_at: newExpiresAt,
          renewed_at: new Date().toISOString(),
          expiry_notified: false
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Prayer sharing renewed!");
    },
    onError: () => {
      toast.error("Failed to renew");
    },
  });

  const toggleAnsweredMutation = useMutation({
    mutationFn: async ({ id, isAnswered }: { id: string; isAnswered: boolean }) => {
      const { error } = await supabase
        .from("prayer_requests")
        .update({ 
          is_answered: isAnswered,
          answered_at: isAnswered ? new Date().toISOString() : null,
          gratitude_message: isAnswered ? null : null // Clear gratitude when unmarking
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isAnswered }) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["community-prayers"] });
      if (!isAnswered) {
        toast.success("Unmarked as answered");
      }
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

  const handleAnsweredSuccess = () => {
    setAnsweredDialogOpen(false);
    setSelectedPrayer(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["community-prayers"] });
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
        {prayers.map((prayer) => {
          const expired = prayer.is_public && isExpired(prayer.expires_at);
          const renewable = prayer.is_public && canRenew(prayer.expires_at, prayer.share_duration);
          const timeRemaining = formatTimeRemaining(prayer.expires_at);
          const ttsText = `${prayer.title}. ${prayer.content}`;

          return (
            <Card key={prayer.id} className={`overflow-hidden ${expired ? 'opacity-70' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{prayer.title}</h3>
                      <TextToSpeech text={ttsText} size="sm" />
                      {prayer.audio_url && (
                        <Badge variant="outline" className="gap-1">
                          <Mic className="w-3 h-3 text-red-500" />
                          Audio
                        </Badge>
                      )}
                      {prayer.is_answered && (
                        <Badge className="bg-green-500/90 text-white gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Answered
                        </Badge>
                      )}
                      {prayer.is_anonymous && (
                        <Badge variant="outline" className="gap-1">
                          <EyeOff className="w-3 h-3" />
                          Anonymous
                        </Badge>
                      )}
                      {prayer.approval_status === "pending_approval" && (
                        <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                          <AlertCircle className="w-3 h-3" />
                          Pending Approval
                        </Badge>
                      )}
                      {prayer.approval_status === "rejected" && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </Badge>
                      )}
                      {expired ? (
                        <Badge variant="destructive" className="gap-1">
                          <Clock className="w-3 h-3" />
                          Expired
                        </Badge>
                      ) : prayer.is_public && prayer.approval_status === "approved" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Globe className="w-3 h-3" />
                          Shared
                        </Badge>
                      ) : !prayer.is_public ? (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="w-3 h-3" />
                          Private
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(prayer.created_at), "MMM d, yyyy")}
                      {prayer.likes_count > 0 && ` · ${prayer.likes_count} praying`}
                    </p>
                    {/* Time Remaining Display */}
                    {prayer.is_public && prayer.approval_status === "approved" && timeRemaining && !expired && (
                      <div className={cn(
                        "flex items-center gap-1.5 mt-1 text-sm",
                        renewable ? "text-yellow-600 dark:text-yellow-400 font-medium" : "text-muted-foreground"
                      )}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timeRemaining} remaining</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm line-clamp-3">{prayer.content}</p>

                {/* Audio Player */}
                {prayer.audio_url && (
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <AudioPlayer src={prayer.audio_url} />
                  </div>
                )}

                {/* Gratitude Message Display */}
                {prayer.gratitude_message && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">Your Prayer of Gratitude</span>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-300">{prayer.gratitude_message}</p>
                  </div>
                )}

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

                  {prayer.is_answered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAnsweredMutation.mutate({ 
                        id: prayer.id, 
                        isAnswered: false 
                      })}
                      disabled={toggleAnsweredMutation.isPending}
                      className="text-green-600 gap-1"
                    >
                      {toggleAnsweredMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Answered
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPrayer(prayer);
                        setAnsweredDialogOpen(true);
                      }}
                      className="gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Mark Answered
                    </Button>
                  )}

                  {/* Extend Time Button - always show for shared prayers, disabled until renewal window */}
                  {prayer.is_public && prayer.approval_status === "approved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => renewMutation.mutate({ 
                        id: prayer.id, 
                        shareDuration: prayer.share_duration 
                      })}
                      disabled={renewMutation.isPending || (!renewable && !expired)}
                      className={cn(
                        "gap-1",
                        (renewable || expired) ? "text-primary border-primary hover:bg-primary/10" : "opacity-60"
                      )}
                      title={(!renewable && !expired) ? "Available when nearing expiration" : "Extend sharing time"}
                    >
                      {renewMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Extend Time
                    </Button>
                  )}

                  {!expired && (prayer.is_public ? (
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
                        isPublic: true,
                        shareDuration: prayer.share_duration || "1_month"
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
                  ))}

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
          );
        })}
      </div>

      {/* Edit Dialog */}
      <PrayerRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
        userId={userId}
        editingPrayer={selectedPrayer}
      />

      {/* Answered Prayer Dialog */}
      {selectedPrayer && (
        <AnsweredPrayerDialog
          open={answeredDialogOpen}
          onOpenChange={setAnsweredDialogOpen}
          prayerId={selectedPrayer.id}
          currentGratitude={selectedPrayer.gratitude_message}
          onSuccess={handleAnsweredSuccess}
        />
      )}

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
