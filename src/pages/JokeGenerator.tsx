import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Eye, Check, X, RefreshCw, Candy, Trophy, ArrowLeft, Save, Share2, Users, BookOpen, Loader2, Trash2, CheckCircle, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { JokeGallery } from '@/components/joke-generator/JokeGallery';
import { JokeCommunityGallery } from '@/components/joke-generator/JokeCommunityGallery';
import { JokeCategorySelector } from '@/components/joke-generator/JokeCategorySelector';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import Footer from '@/components/Footer';
import { TextToSpeech } from '@/components/TextToSpeech';

interface Joke {
  question: string;
  answer: string;
  id?: string; // Library joke ID for deletion
  is_reviewed?: boolean;
}

const JokeGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, isAdmin, isOwner } = useAuth();
  const isAdminOrOwner = isAdmin || isOwner;
  const [joke, setJoke] = useState<Joke | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [guess, setGuess] = useState('');
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const [activeTab, setActiveTab] = useState('create');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingReviewed, setIsMarkingReviewed] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize with all free categories on mount
  useEffect(() => {
    const fetchInitialCategories = async () => {
      const { data, error } = await supabase
        .from('joke_categories')
        .select('id')
        .eq('is_active', true)
        .eq('is_free', true)
        .neq('name', 'random');
      
      if (!error && data) {
        setSelectedCategories(data.map(c => c.id));
      }
    };
    fetchInitialCategories();
  }, []);

  // These functions are now handled server-side in the get-joke edge function

  const generateJoke = async () => {
    setIsLoading(true);
    setShowAnswer(false);
    setGuess('');
    setHasGuessed(false);
    setIsCorrect(false);
    setIsSaved(false);
    setIsShared(false);

    try {
      // Pick a random category from selected ones, or use 'random' behavior
      const categoryToUse = selectedCategories.length > 0 
        ? selectedCategories[Math.floor(Math.random() * selectedCategories.length)]
        : 'random';
      
      // Try to get from library first
      const { data, error } = await supabase.functions.invoke('get-joke', {
        body: { categoryIds: selectedCategories, userId: user?.id },
      });

      if (error) throw error;
      
      // Check if we've seen all jokes
      if (data.error === 'all_jokes_seen') {
        toast.info(data.message || "You've seen all our jokes! Check back later.");
        setJoke(null);
        return;
      }
      
      if (data.error) throw new Error(data.error);

      setJoke(data);
    } catch (error) {
      console.error('Error getting joke:', error);
      toast.error('Failed to get joke. Try again!');
    } finally {
      setIsLoading(false);
    }
  };

  const checkGuess = () => {
    if (!joke || !guess.trim()) return;

    // Enhanced fuzzy matching for better partial credit
    const guessLower = guess.toLowerCase().trim();
    const answerLower = joke.answer.toLowerCase();
    
    // Remove punctuation and common words for comparison
    const cleanString = (s: string) => s.replace(/[^\w\s]/g, '').replace(/\b(the|a|an|it|was|is|because|they|its|im|i)\b/gi, '').trim();
    const cleanGuess = cleanString(guessLower);
    const cleanAnswer = cleanString(answerLower);
    
    // Extract meaningful words (2+ chars for short words like "no", "go")
    const guessWords = cleanGuess.split(/\s+/).filter(w => w.length >= 2);
    const answerWords = cleanAnswer.split(/\s+/).filter(w => w.length >= 2);
    
    // Check for any significant word match (partial match counts)
    const hasKeywordMatch = guessWords.some(gWord => 
      answerWords.some(aWord => {
        // Exact match or one contains the other (for "rock" matching "rock music")
        return gWord === aWord || 
               aWord.includes(gWord) || 
               gWord.includes(aWord) ||
               // Handle plurals and common variations
               gWord + 's' === aWord ||
               aWord + 's' === gWord;
      })
    );
    
    // Also check if entire guess is contained in answer or vice versa
    const containsMatch = cleanAnswer.includes(cleanGuess) || cleanGuess.includes(cleanAnswer);
    
    const correct = hasKeywordMatch || containsMatch;

    setIsCorrect(correct);
    setHasGuessed(true);
    setShowAnswer(true);
    
    if (correct) {
      setCorrectGuesses(prev => prev + 1);
      toast.success('🎉 You got it!');
    }
  };

  const revealAnswer = () => {
    setShowAnswer(true);
  };

  const deleteJokeFromLibrary = async () => {
    if (!joke?.id) {
      toast.error('Cannot delete this joke');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-joke-library', {
        body: { jokeId: joke.id },
      });

      if (error) throw error;

      toast.success('Joke deleted from library');
      // Immediately load a new joke after deleting
      generateJoke();
    } catch (error) {
      console.error('Error deleting joke:', error);
      toast.error('Failed to delete joke');
    } finally {
      setIsDeleting(false);
    }
  };

  const markJokeAsReviewed = async () => {
    if (!joke?.id) {
      toast.error('Cannot mark this joke');
      return;
    }

    setIsMarkingReviewed(true);
    try {
      const { error } = await supabase
        .from('joke_library')
        .update({ is_reviewed: true })
        .eq('id', joke.id);

      if (error) throw error;

      // Update local state to show reviewed status immediately
      setJoke({ ...joke, is_reviewed: true });
      toast.success('Joke marked as reviewed');
    } catch (error) {
      console.error('Error marking joke as reviewed:', error);
      toast.error('Failed to mark joke as reviewed');
    } finally {
      setIsMarkingReviewed(false);
    }
  };

  const openEditDialog = () => {
    if (!joke) return;
    setEditQuestion(joke.question);
    setEditAnswer(joke.answer);
    setIsEditDialogOpen(true);
  };

  const updateJoke = async () => {
    if (!joke?.id) {
      toast.error('Cannot update this joke');
      return;
    }

    if (!editQuestion.trim() || !editAnswer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('joke_library')
        .update({ 
          question: editQuestion.trim(), 
          answer: editAnswer.trim() 
        })
        .eq('id', joke.id);

      if (error) throw error;

      // Update local state
      setJoke({ ...joke, question: editQuestion.trim(), answer: editAnswer.trim() });
      setIsEditDialogOpen(false);
      toast.success('Joke updated successfully');
    } catch (error) {
      console.error('Error updating joke:', error);
      toast.error('Failed to update joke');
    } finally {
      setIsUpdating(false);
    }
  };

  const saveJoke = async (shareWithCommunity: boolean = false) => {
    if (!user || !joke) {
      toast.error('Please sign in to save jokes');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('saved_jokes')
        .insert({
          user_id: user.id,
          question: joke.question,
          answer: joke.answer,
          category: 'mixed', // Multi-select doesn't track individual category
          is_public: shareWithCommunity,
          shared_at: shareWithCommunity ? new Date().toISOString() : null,
        });

      if (error) throw error;

      setIsSaved(true);
      if (shareWithCommunity) {
        setIsShared(true);
        toast.success('Joke saved and shared with the community!');
      } else {
        toast.success('Joke saved to your collection!');
      }
    } catch (error) {
      console.error('Error saving joke:', error);
      toast.error('Failed to save joke');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-2xl mx-auto px-4 space-y-6">
          <Button variant="outline" size="sm" className="gap-2 mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Candy className="w-8 h-8 text-pink-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Joke Generator
              </h1>
              <Candy className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-muted-foreground">Laffy Taffy style jokes! Can you guess the punchline?</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-6">
              <TabsTrigger value="create" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Get Jokes
              </TabsTrigger>
              <TabsTrigger value="community" className="gap-2" disabled={loading || !isAuthenticated}>
                <Users className="w-4 h-4" />
                Community
              </TabsTrigger>
              <TabsTrigger value="my-jokes" className="gap-2" disabled={loading || !isAuthenticated}>
                <BookOpen className="w-4 h-4" />
                My Jokes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              {/* Soft Ribbon Container with Score, Generate Button & Categories */}
              <div className="bg-soft-ribbon rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Generate Button + Score - Left side */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={generateJoke}
                      disabled={isLoading || selectedCategories.length === 0}
                      size="lg"
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white gap-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Unwrapping...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          {joke ? 'New Joke!' : 'Get a Joke!'}
                        </>
                      )}
                    </Button>
                    {/* All-time correct guesses - to the right of button */}
                    {correctGuesses > 0 && (
                      <div className="flex items-center gap-1.5 text-base whitespace-nowrap">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold">{correctGuesses}</span>
                      </div>
                    )}
                  </div>

                  {/* Categories Button - Right */}
                  <JokeCategorySelector
                    selectedCategories={selectedCategories}
                    onCategoriesChange={setSelectedCategories}
                  />
                </div>
              </div>

              {/* Joke Card */}
              {joke && (
                <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-card to-muted/50 overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    {/* Question */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-xl font-medium">{joke.question}</p>
                        <TextToSpeech text={joke.question} size="icon" />
                      </div>
                    </div>

                    {/* Guess Input */}
                    {!showAnswer && (
                      <div className="space-y-3">
                        <Input
                          placeholder="Type your guess..."
                          value={guess}
                          onChange={(e) => setGuess(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && guess.trim() && checkGuess()}
                          className="text-center text-lg"
                        />
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={checkGuess}
                            disabled={!guess.trim()}
                            className="gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Check Guess
                          </Button>
                          <Button
                            variant="outline"
                            onClick={revealAnswer}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Just Tell Me
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Answer Reveal */}
                    {showAnswer && (
                      <div className="space-y-4">
                        {hasGuessed && (
                          <div className={`flex items-center justify-center gap-2 text-lg font-medium ${isCorrect ? 'text-green-500' : 'text-orange-500'}`}>
                            {isCorrect ? (
                              <>
                                <Check className="w-6 h-6" />
                                You got it!
                              </>
                            ) : (
                              <>
                                <X className="w-6 h-6" />
                                Nice try!
                              </>
                            )}
                          </div>
                        )}
                        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <p className="text-lg font-semibold text-foreground">{joke.answer}</p>
                            <TextToSpeech text={joke.answer} size="icon" />
                          </div>
                        </div>

                        {/* Save/Share Buttons */}
                        {isAuthenticated && !isSaved && (
                          <div className="flex gap-2 justify-center flex-wrap">
                            <Button
                              variant="outline"
                              onClick={() => saveJoke(false)}
                              disabled={isSaving}
                              className="gap-2"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Save
                            </Button>
                            <Button
                              onClick={() => saveJoke(true)}
                              disabled={isSaving}
                              className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Share2 className="w-4 h-4" />
                              )}
                              Save & Share
                            </Button>
                          </div>
                        )}

                        {isSaved && (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <Check className="w-5 h-5" />
                            <span>{isShared ? 'Saved & Shared!' : 'Saved!'}</span>
                          </div>
                        )}

                        <div className="flex justify-center gap-2">
                          <Button
                            onClick={generateJoke}
                            variant="outline"
                            className="gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Another One!
                          </Button>

                          {/* Admin Actions */}
                          {isAdminOrOwner && joke?.id && (
                            <>
                              {/* Edit Button */}
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={openEditDialog}
                                title="Edit joke"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              {/* Mark as Reviewed Button */}
                              <Button
                                variant="outline"
                                size="icon"
                                className={joke.is_reviewed 
                                  ? "bg-green-100 text-green-600 cursor-default" 
                                  : "text-green-600 hover:bg-green-100 hover:text-green-700"
                                }
                                onClick={joke.is_reviewed ? undefined : markJokeAsReviewed}
                                disabled={isMarkingReviewed || joke.is_reviewed}
                                title={joke.is_reviewed ? "Already reviewed" : "Mark as reviewed"}
                              >
                                {isMarkingReviewed ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className={`w-4 h-4 ${joke.is_reviewed ? "fill-green-600" : ""}`} />
                                )}
                              </Button>

                              {/* Delete Button */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    disabled={isDeleting}
                                    title="Delete from library"
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this joke?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove this joke from the library. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={deleteJokeFromLibrary}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!joke && !isLoading && (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <Candy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Click the button to unwrap a joke!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="community">
              {user && (
                <JokeCommunityGallery userId={user.id} />
              )}
            </TabsContent>

            <TabsContent value="my-jokes">
              {user && (
                <JokeGallery userId={user.id} />
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Spacer to separate content from footer */}
        <div className="h-24" />
      </main>
      <Footer />

      {/* Edit Joke Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Joke</DialogTitle>
            <DialogDescription>
              Update the question and answer for this joke.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question">Question</Label>
              <Input
                id="edit-question"
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                placeholder="Enter the joke question..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-answer">Answer</Label>
              <Input
                id="edit-answer"
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                placeholder="Enter the punchline..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateJoke} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JokeGenerator;