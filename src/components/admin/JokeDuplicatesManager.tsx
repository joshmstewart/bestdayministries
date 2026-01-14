import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DuplicateGroup {
  answer: string;
  count: number;
  jokes: {
    id: string;
    question: string;
    answer: string;
    is_reviewed: boolean;
  }[];
}

export const JokeDuplicatesManager: React.FC = () => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Track which jokes to KEEP per group (by answer key) - now allows multiple
  const [keepSelections, setKeepSelections] = useState<Record<string, Set<string>>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      const { data: jokes, error } = await supabase
        .from('joke_library')
        .select('id, question, answer, is_reviewed')
        .eq('is_active', true)
        .order('answer');

      if (error) throw error;

      // Group by normalized answer (lowercase, trimmed)
      const groups: Record<string, DuplicateGroup['jokes']> = {};
      jokes?.forEach(joke => {
        const normalizedAnswer = joke.answer.toLowerCase().trim();
        if (!groups[normalizedAnswer]) {
          groups[normalizedAnswer] = [];
        }
        groups[normalizedAnswer].push(joke);
      });

      // Filter to only groups with duplicates and format
      const duplicates: DuplicateGroup[] = Object.entries(groups)
        .filter(([_, jokeList]) => jokeList.length > 1)
        .map(([answer, jokeList]) => ({
          answer,
          count: jokeList.length,
          jokes: jokeList,
        }))
        .sort((a, b) => b.count - a.count);

      setDuplicateGroups(duplicates);
      
      // Initialize keep selections - default to reviewed jokes or first joke
      const initialSelections: Record<string, Set<string>> = {};
      duplicates.forEach(group => {
        const reviewedJokes = group.jokes.filter(j => j.is_reviewed);
        if (reviewedJokes.length > 0) {
          initialSelections[group.answer] = new Set(reviewedJokes.map(j => j.id));
        } else {
          initialSelections[group.answer] = new Set([group.jokes[0].id]);
        }
      });
      setKeepSelections(initialSelections);
    } catch (error) {
      console.error('Error fetching duplicates:', error);
      toast.error('Failed to load duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleToggleKeep = (groupAnswer: string, jokeId: string) => {
    setKeepSelections(prev => {
      const current = prev[groupAnswer] || new Set<string>();
      const updated = new Set(current);
      if (updated.has(jokeId)) {
        // Don't allow deselecting if it's the last one
        if (updated.size > 1) {
          updated.delete(jokeId);
        } else {
          toast.error("You must keep at least one joke");
          return prev;
        }
      } else {
        updated.add(jokeId);
      }
      return { ...prev, [groupAnswer]: updated };
    });
  };

  // Get all jokes that will be deleted (not selected to keep)
  const getJokesToDelete = (): string[] => {
    const toDelete: string[] = [];
    duplicateGroups.forEach(group => {
      const keepIds = keepSelections[group.answer] || new Set();
      group.jokes.forEach(joke => {
        if (!keepIds.has(joke.id)) {
          toDelete.push(joke.id);
        }
      });
    });
    return toDelete;
  };

  const deleteAllDuplicates = async () => {
    const jokesToDelete = getJokesToDelete();
    if (jokesToDelete.length === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('joke_library')
        .update({ is_active: false })
        .in('id', jokesToDelete);

      if (error) throw error;

      toast.success(`Deactivated ${jokesToDelete.length} duplicate jokes`);
      setShowDeleteDialog(false);
      fetchDuplicates();
    } catch (error) {
      console.error('Error deleting jokes:', error);
      toast.error('Failed to delete jokes');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteGroupDuplicates = async (group: DuplicateGroup) => {
    const keepIds = keepSelections[group.answer] || new Set();
    const toDelete = group.jokes.filter(j => !keepIds.has(j.id)).map(j => j.id);
    
    if (toDelete.length === 0) {
      toast.info("No duplicates to remove - all jokes are marked to keep");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('joke_library')
        .update({ is_active: false })
        .in('id', toDelete);

      if (error) throw error;

      toast.success(`Removed ${toDelete.length} duplicates, kept ${keepIds.size} joke(s)`);
      fetchDuplicates();
    } catch (error) {
      console.error('Error deleting jokes:', error);
      toast.error('Failed to delete jokes');
    }
  };

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.count - 1, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Duplicate Jokes</h3>
          <p className="text-sm text-muted-foreground">
            Found {duplicateGroups.length} groups with {totalDuplicates} total duplicates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDuplicates}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {totalDuplicates > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All Duplicates ({totalDuplicates})
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
        💡 Select which jokes to <strong>keep</strong> in each group (you can keep multiple), then delete the rest.
      </p>

      {duplicateGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No duplicate jokes found! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {duplicateGroups.map((group) => (
              <Card key={group.answer} className="border-yellow-500/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Answer: "{group.answer}"
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{group.count} jokes</Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteGroupDuplicates(group)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Duplicates
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {group.jokes.map((joke) => {
                      const isSelected = keepSelections[group.answer]?.has(joke.id) || false;
                      return (
                        <div 
                          key={joke.id}
                          className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-green-500/10 border border-green-500/30' 
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                          onClick={() => handleToggleKeep(group.answer, joke.id)}
                        >
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => handleToggleKeep(group.answer, joke.id)}
                            className="mt-0.5" 
                          />
                          <Label className="flex-1 min-w-0 cursor-pointer">
                            <p className="text-sm font-medium">{joke.question}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ID: {joke.id.slice(0, 8)}...
                            </p>
                          </Label>
                          <div className="flex items-center gap-1">
                            {isSelected && (
                              <Badge variant="outline" className="text-xs bg-green-500/20 border-green-500/50">
                                <Check className="w-3 h-3 mr-1" />
                                Keep
                              </Badge>
                            )}
                            {joke.is_reviewed && (
                              <Badge className="text-xs bg-green-600">Reviewed</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all {totalDuplicates} duplicates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will keep your selected joke in each group and deactivate all other duplicates. 
              They can be restored later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAllDuplicates}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All Duplicates'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};