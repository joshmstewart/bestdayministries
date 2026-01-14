import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
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
  const [selectedJokes, setSelectedJokes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      // First get all jokes
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

  const toggleJokeSelection = (jokeId: string) => {
    const newSelected = new Set(selectedJokes);
    if (newSelected.has(jokeId)) {
      newSelected.delete(jokeId);
    } else {
      newSelected.add(jokeId);
    }
    setSelectedJokes(newSelected);
  };

  const selectAllDuplicatesInGroup = (group: DuplicateGroup) => {
    const newSelected = new Set(selectedJokes);
    // Keep the first joke (or the reviewed one), select rest for deletion
    const reviewedJoke = group.jokes.find(j => j.is_reviewed);
    const jokeToKeep = reviewedJoke || group.jokes[0];
    
    group.jokes.forEach(joke => {
      if (joke.id !== jokeToKeep.id) {
        newSelected.add(joke.id);
      }
    });
    setSelectedJokes(newSelected);
  };

  const deleteSelectedJokes = async () => {
    if (selectedJokes.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('joke_library')
        .update({ is_active: false })
        .in('id', Array.from(selectedJokes));

      if (error) throw error;

      toast.success(`Deactivated ${selectedJokes.size} duplicate jokes`);
      setSelectedJokes(new Set());
      setShowDeleteDialog(false);
      fetchDuplicates();
    } catch (error) {
      console.error('Error deleting jokes:', error);
      toast.error('Failed to delete jokes');
    } finally {
      setIsDeleting(false);
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
          {selectedJokes.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedJokes.size} Selected
            </Button>
          )}
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No duplicate jokes found! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {duplicateGroups.map((group, groupIndex) => (
              <Card key={groupIndex} className="border-yellow-500/50">
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
                        onClick={() => selectAllDuplicatesInGroup(group)}
                      >
                        Select Duplicates
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {group.jokes.map((joke, jokeIndex) => (
                      <div 
                        key={joke.id}
                        className={`flex items-start gap-3 p-2 rounded-md ${
                          selectedJokes.has(joke.id) 
                            ? 'bg-destructive/10 border border-destructive/30' 
                            : 'bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedJokes.has(joke.id)}
                          onCheckedChange={() => toggleJokeSelection(joke.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{joke.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {joke.id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {jokeIndex === 0 && !group.jokes.some(j => j.is_reviewed) && (
                            <Badge variant="outline" className="text-xs">Keep</Badge>
                          )}
                          {joke.is_reviewed && (
                            <Badge className="text-xs bg-green-600">Reviewed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
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
            <AlertDialogTitle>Delete {selectedJokes.size} jokes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the selected duplicate jokes. They can be restored later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSelectedJokes}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Selected'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
