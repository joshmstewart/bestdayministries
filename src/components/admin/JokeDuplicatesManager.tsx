import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  // Track which joke to KEEP per group (by answer key)
  const [keepSelections, setKeepSelections] = useState<Record<string, string>>({});
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
      
      // Initialize keep selections - default to reviewed joke or first joke
      const initialSelections: Record<string, string> = {};
      duplicates.forEach(group => {
        const reviewedJoke = group.jokes.find(j => j.is_reviewed);
        initialSelections[group.answer] = reviewedJoke?.id || group.jokes[0].id;
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

  const handleKeepSelection = (groupAnswer: string, jokeId: string) => {
    setKeepSelections(prev => ({
      ...prev,
      [groupAnswer]: jokeId
    }));
  };

  // Get all jokes that will be deleted (not selected to keep)
  const getJokesToDelete = (): string[] => {
    const toDelete: string[] = [];
    duplicateGroups.forEach(group => {
      const keepId = keepSelections[group.answer];
      group.jokes.forEach(joke => {
        if (joke.id !== keepId) {
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
    const keepId = keepSelections[group.answer];
    const toDelete = group.jokes.filter(j => j.id !== keepId).map(j => j.id);
    
    if (toDelete.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('joke_library')
        .update({ is_active: false })
        .in('id', toDelete);

      if (error) throw error;

      toast.success(`Removed ${toDelete.length} duplicates, kept your selection`);
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
        💡 Select which joke to <strong>keep</strong> in each group, then delete the duplicates.
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
                  <RadioGroup 
                    value={keepSelections[group.answer] || ''} 
                    onValueChange={(value) => handleKeepSelection(group.answer, value)}
                    className="space-y-2"
                  >
                    {group.jokes.map((joke) => {
                      const isSelected = keepSelections[group.answer] === joke.id;
                      return (
                        <div 
                          key={joke.id}
                          className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-green-500/10 border border-green-500/30' 
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                          onClick={() => handleKeepSelection(group.answer, joke.id)}
                        >
                          <RadioGroupItem value={joke.id} id={joke.id} className="mt-0.5" />
                          <Label htmlFor={joke.id} className="flex-1 min-w-0 cursor-pointer">
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
                  </RadioGroup>
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