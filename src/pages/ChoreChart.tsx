import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Trophy, Calendar, Settings, ArrowLeft, Gift, List, CalendarDays, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { ChoreFormDialog } from "@/components/chores/ChoreFormDialog";
import { ChoreManageDialog } from "@/components/chores/ChoreManageDialog";
import { ChoreWeeklyView } from "@/components/chores/ChoreWeeklyView";
import { ChoreStreakDisplay } from "@/components/chores/ChoreStreakDisplay";
import { MonthlyChallengeCard } from "@/components/chores/MonthlyChallengeCard";
import { ChallengeGallery } from "@/components/chores/ChallengeGallery";
import { ChoreCelebrationDialog } from "@/components/chores/ChoreCelebrationDialog";
import { useChoreStreaks } from "@/hooks/useChoreStreaks";
import { Link } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { PackOpeningDialog } from "@/components/PackOpeningDialog";
import { BadgeEarnedDialog } from "@/components/chores/BadgeEarnedDialog";
import { TextToSpeech } from "@/components/TextToSpeech";
import { awardCoinReward } from "@/utils/awardCoinReward";
interface Chore {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  recurrence_type: 'daily' | 'weekly' | 'every_x_days' | 'every_x_weeks';
  recurrence_value: number | null;
  day_of_week: number | null;
  is_active: boolean;
  display_order: number;
  bestie_id: string;
  created_by: string;
}

interface ChoreCompletion {
  id: string;
  chore_id: string;
  completed_date: string;
}

type MSTInfo = {
  mstDate: string;
  tomorrowUtcMidnightIso: string;
};

function getMSTInfo(): MSTInfo {
  const now = new Date();
  const mstOffsetMinutes = -7 * 60; // MST is UTC-7
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const mstTime = new Date(utc + mstOffsetMinutes * 60000);
  const mstDate = mstTime.toISOString().split("T")[0];

  const tomorrowMST = new Date(mstTime);
  tomorrowMST.setDate(tomorrowMST.getDate() + 1);
  tomorrowMST.setHours(0, 0, 0, 0);
  const tomorrowUTC = new Date(tomorrowMST.getTime() - mstOffsetMinutes * 60000);

  return {
    mstDate,
    tomorrowUtcMidnightIso: tomorrowUTC.toISOString(),
  };
}

export default function ChoreChart() {
  const { user, isAuthenticated, loading: authLoading, isGuardian, isAdmin, isOwner } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [linkedBesties, setLinkedBesties] = useState<{ id: string; display_name: string }[]>([]);
  const [selectedBestieId, setSelectedBestieId] = useState<string | null>(null);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [rewardCreating, setRewardCreating] = useState(false);
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [rewardCardId, setRewardCardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [earnedBadge, setEarnedBadge] = useState<import("@/lib/choreBadgeDefinitions").BadgeDefinition | null>(null);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showCelebrationDialog, setShowCelebrationDialog] = useState(false);
  const [lastCompletedChore, setLastCompletedChore] = useState<string>("");

  const { mstDate: today } = getMSTInfo();
  const dayOfWeek = new Date().getDay();

  const canManageChores = isGuardian || isAdmin || isOwner;
  
  // Streak tracking - use the target user ID (bestie or self)
  const targetUserId = canManageChores && selectedBestieId ? selectedBestieId : user?.id || null;
  const { streak, badges, loading: streakLoading, updateStreakOnCompletion, refreshStreaks, badgeDefinitions } = useChoreStreaks(targetUserId);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // If guardian/admin, load linked besties
      if (canManageChores) {
        const { data: links } = await supabase
          .from('caregiver_bestie_links')
          .select('bestie_id, profiles!caregiver_bestie_links_bestie_id_fkey(id, display_name)')
          .eq('caregiver_id', user.id);

        if (links && links.length > 0) {
          const besties = links.map(l => ({
            id: l.bestie_id,
            display_name: (l.profiles as any)?.display_name || 'Unknown'
          }));
          setLinkedBesties(besties);
          // Default to user's own chores if not already set
          if (!selectedBestieId) {
            setSelectedBestieId(user.id);
          }
        }
      }

      // Load chores for the user (either their own or selected bestie's)
      const targetUserId = canManageChores && selectedBestieId ? selectedBestieId : user.id;
      
      const { data: choresData, error: choresError } = await supabase
        .from('chores')
        .select('*')
        .eq('bestie_id', targetUserId)
        .eq('is_active', true)
        .order('display_order');

      if (choresError) throw choresError;
      setChores(choresData || []);

      // Load today's completions
      const { data: completionsData, error: completionsError } = await supabase
        .from('chore_completions')
        .select('*')
        .eq('completed_date', today)
        .eq('user_id', targetUserId);

      if (completionsError) throw completionsError;
      setCompletions(completionsData || []);

      // Check if daily reward already claimed
      const { data: rewardData } = await supabase
        .from('chore_daily_rewards')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('reward_date', today)
        .single();

      setDailyRewardClaimed(!!rewardData);

      // Check for unscratched bonus card from chore rewards
      if (rewardData) {
        const { data: bonusCard } = await supabase
          .from('daily_scratch_cards')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('date', today)
          .eq('is_bonus_card', true)
          .eq('is_scratched', false)
          .single();

        if (bonusCard) {
          setRewardCardId(bonusCard.id);
        }
      }
    } catch (error) {
      console.error('Error loading chore data:', error);
      toast.error('Failed to load chores');
    } finally {
      setLoading(false);
    }
  }, [user, canManageChores, selectedBestieId, today]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, loadData]);

  const getApplicableChores = useCallback(() => {
    return chores.filter(chore => {
      switch (chore.recurrence_type) {
        case 'daily':
          return true;
        case 'weekly':
          return chore.day_of_week === dayOfWeek;
        case 'every_x_days':
          // For simplicity, show every_x_days chores daily (can enhance with start date tracking)
          return true;
        case 'every_x_weeks':
          // Show on same day of week as created
          return chore.day_of_week === dayOfWeek;
        default:
          return true;
      }
    });
  }, [chores, dayOfWeek]);

  const applicableChores = getApplicableChores();
  const completedChoreIds = new Set(completions.map(c => c.chore_id));
  const allCompleted = applicableChores.length > 0 && 
    applicableChores.every(c => completedChoreIds.has(c.id));

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const fireBigCelebration = () => {
    // Multiple confetti bursts
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const toggleChoreCompletion = async (choreId: string) => {
    if (!user) return;

    const targetUserId = canManageChores && selectedBestieId ? selectedBestieId : user.id;
    const isCompleted = completedChoreIds.has(choreId);

    try {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from('chore_completions')
          .delete()
          .eq('chore_id', choreId)
          .eq('completed_date', today)
          .eq('user_id', targetUserId);

        if (error) throw error;
        setCompletions(prev => prev.filter(c => c.chore_id !== choreId));
        toast.info('Chore unmarked');
      } else {
        // Add completion
        const { data, error } = await supabase
          .from('chore_completions')
          .insert({
            chore_id: choreId,
            user_id: targetUserId,
            completed_date: today
          })
          .select()
          .single();

        if (error) throw error;
        const newCompletions = [...completions, data];
        setCompletions(newCompletions);
        
        fireConfetti();
        toast.success('Great job! 🎉');
        
        // Award coins for completing a chore
        await awardCoinReward(targetUserId, 'chore_complete', 'Completed a chore');

        // Track the completed chore title for celebration
        const completedChore = chores.find(c => c.id === choreId);
        if (completedChore) {
          setLastCompletedChore(completedChore.title);
        }

        // Check if all chores are now completed - update streak
        const newCompletedIds = new Set(newCompletions.map(c => c.chore_id));
        const allNowCompleted = applicableChores.length > 0 && 
          applicableChores.every(c => newCompletedIds.has(c.id));
        
        if (allNowCompleted) {
          // Update streak when all chores completed for the day
          const result = await updateStreakOnCompletion(today);
          if (result?.newBadges && result.newBadges.length > 0) {
            // Show the first badge in the celebration dialog
            const firstBadge = result.newBadges[0];
            const badgeDef = badgeDefinitions.find(b => b.type === firstBadge.badge_type);
            if (badgeDef) {
              setEarnedBadge(badgeDef);
              setShowBadgeDialog(true);
            }
            
            // If there are more badges, show toasts for the rest
            if (result.newBadges.length > 1) {
              result.newBadges.slice(1).forEach(badge => {
                toast.success(
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{badge.badge_icon}</span>
                    <div>
                      <p className="font-medium">Badge Earned!</p>
                      <p className="text-sm">{badge.badge_name}</p>
                    </div>
                  </div>,
                  { duration: 5000 }
                );
              });
            }
          } else {
            // No badges earned but still show celebration dialog
            setTimeout(() => setShowCelebrationDialog(true), 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast.error('Failed to update chore');
    }
  };

  const claimDailyReward = async (userId: string) => {
    try {
      setRewardCreating(true);

      // Use backend function to claim reward and create bonus card
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in again to claim your reward');
        return;
      }

      const response = await supabase.functions.invoke('claim-chore-reward', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Error claiming reward:', response.error);
        toast.error('Failed to create your sticker pack');
        return;
      }

      const result = response.data as
        | { success: true; cardId: string; alreadyClaimed?: boolean }
        | { success?: false; error?: string };

      if (!result || (result as any).success !== true || !(result as any).cardId) {
        console.error('Unexpected claim-chore-reward response:', result);
        toast.error('Failed to create your sticker pack');
        return;
      }

      setDailyRewardClaimed(true);
      setRewardCardId((result as any).cardId);
      setShowPackDialog(true);

      fireBigCelebration();
      toast.success(
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>Sticker pack ready — open it now!</span>
        </div>,
        { duration: 4000 }
      );
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to create your sticker pack');
    } finally {
      setRewardCreating(false);
    }
  };

  const handleEditChore = (chore: Chore) => {
    setEditingChore(chore);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingChore(null);
  };

  const getRecurrenceLabel = (chore: Chore) => {
    switch (chore.recurrence_type) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Every ${days[chore.day_of_week || 0]}`;
      case 'every_x_days':
        return `Every ${chore.recurrence_value} days`;
      case 'every_x_weeks':
        return `Every ${chore.recurrence_value} weeks`;
      default:
        return '';
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <UnifiedHeader />
        <main className="min-h-screen bg-background pt-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <UnifiedHeader />
        <main className="min-h-screen bg-background pt-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <Button variant="outline" size="sm" className="mb-6" asChild>
              <Link to="/community"><ArrowLeft className="h-4 w-4 mr-2" />Back to Community</Link>
            </Button>
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Please log in to view your chore chart.</p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <UnifiedHeader />
      <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button variant="outline" size="sm" className="mb-6" asChild>
          <Link to="/community"><ArrowLeft className="h-4 w-4 mr-2" />Back to Community</Link>
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              My Chore Chart
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button 
                variant={viewMode === 'week' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('week')}
                className="rounded-none"
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Week
              </Button>
            </div>

            {/* Guardians can manage all chores; besties see manage only if they have chores they created */}
            {(canManageChores || chores.some(c => c.created_by === user?.id)) && (
              <Button variant="outline" onClick={() => setManageOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
            {/* Anyone can add chores */}
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Chore
            </Button>
          </div>
        </div>

        {/* Bestie selector for guardians - always show if guardian with any besties, plus "My Chores" option */}
        {canManageChores && linkedBesties.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {/* My Chores tab - shows the logged-in user's own chores */}
            <Button
              variant={selectedBestieId === user?.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBestieId(user?.id || null)}
            >
              My Chores
            </Button>
            {linkedBesties.map(bestie => (
              <Button
                key={bestie.id}
                variant={selectedBestieId === bestie.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBestieId(bestie.id)}
              >
                {bestie.display_name}
              </Button>
            ))}
          </div>
        )}

        {/* Progress indicator */}
        {applicableChores.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Today's Progress</span>
                <span className="text-lg font-bold">
                  {completions.length} / {applicableChores.length}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${(completions.length / applicableChores.length) * 100}%` }}
                />
              </div>
              {allCompleted && (
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Trophy className="h-5 w-5" />
                    {dailyRewardClaimed ? 'Reward claimed!' : 'All done! Your reward is ready.'}
                  </div>

                  {rewardCardId ? (
                    <Button
                      onClick={() => setShowPackDialog(true)}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Open Your Sticker Pack!
                    </Button>
                  ) : dailyRewardClaimed ? (
                    <Link to="/games/sticker-album">
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                        <Sparkles className="h-4 w-4 mr-2" />
                        View Sticker Album
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => {
                        const targetUserId = canManageChores && selectedBestieId ? selectedBestieId : user?.id;
                        if (targetUserId) claimDailyReward(targetUserId);
                      }}
                      disabled={rewardCreating}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      {rewardCreating ? 'Creating pack…' : 'Get Sticker Pack'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Monthly Challenge Card */}
        <MonthlyChallengeCard userId={targetUserId || undefined} />

        {/* Gallery Button */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={() => setShowGallery(true)}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Community Creations
          </Button>
        </div>

        {/* Streak and Badges Display */}
        <ChoreStreakDisplay 
          streak={streak} 
          badges={badges} 
          loading={streakLoading}
          badgeDefinitions={badgeDefinitions}
        />

        {/* View content */}
        {viewMode === 'week' ? (
          <ChoreWeeklyView
            chores={chores}
            completions={completions}
            onToggleCompletion={toggleChoreCompletion}
            today={today}
          />
        ) : (
          <>
            {/* Chores list */}
            {applicableChores.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No chores for today!</h3>
                  <p className="text-muted-foreground mb-4">
                    Add some chores to get started and track your daily tasks!
                  </p>
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Chore
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {applicableChores.map(chore => {
                  const isCompleted = completedChoreIds.has(chore.id);
                  
                  return (
                    <Card 
                      key={chore.id}
                      className={`transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          {/* Large checkbox on the far left */}
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => toggleChoreCompletion(chore.id)}
                            className="h-8 w-8 shrink-0"
                          />
                          
                          {/* Large emoji */}
                          <div className="flex items-center justify-center text-5xl shrink-0">
                            {chore.icon}
                          </div>
                          
                          {/* Content to the right */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-lg font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {chore.title}
                              </h3>
                              <TextToSpeech 
                                text={`${chore.title}${chore.description ? `. ${chore.description}` : ''}`}
                                size="icon"
                              />
                              <Badge variant="outline" className="text-xs">
                                {getRecurrenceLabel(chore)}
                              </Badge>
                              {isCompleted && (
                                <span className="text-xl">✅</span>
                              )}
                            </div>
                            {chore.description && (
                              <p className={`text-sm mt-1 ${isCompleted ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
                                {chore.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Form dialog */}
        <ChoreFormDialog
          open={formOpen}
          onOpenChange={handleFormClose}
          chore={editingChore}
          bestieId={selectedBestieId || user?.id || ''}
          onSuccess={loadData}
        />

        {/* Manage dialog */}
        <ChoreManageDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          chores={chores}
          onEdit={handleEditChore}
          onRefresh={loadData}
          currentUserId={user?.id}
          canManageAll={canManageChores}
        />

        {/* Pack Opening Dialog for chore reward */}
        {rewardCardId && (
          <PackOpeningDialog
            open={showPackDialog}
            onOpenChange={setShowPackDialog}
            cardId={rewardCardId}
            onOpened={() => {
              setRewardCardId(null);
              loadData();
            }}
          />
        )}

        {/* Badge Earned Celebration Dialog */}
        <BadgeEarnedDialog
          badge={earnedBadge}
          open={showBadgeDialog}
          onOpenChange={setShowBadgeDialog}
        />

        {/* Challenge Gallery */}
        <ChallengeGallery
          open={showGallery}
          onOpenChange={setShowGallery}
        />

        {/* Chore Celebration Dialog */}
        <ChoreCelebrationDialog
          open={showCelebrationDialog}
          onOpenChange={setShowCelebrationDialog}
          userId={targetUserId || user?.id || ""}
          completedChoreTitle={lastCompletedChore}
        />
      </div>
    </main>
    <Footer />
  </>
  );
}