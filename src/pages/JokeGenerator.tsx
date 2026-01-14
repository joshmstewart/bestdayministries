import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Eye, Check, X, RefreshCw, Candy, Trophy, ArrowLeft, Save, Share2, Users, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { JokeGallery } from '@/components/joke-generator/JokeGallery';
import { JokeCommunityGallery } from '@/components/joke-generator/JokeCommunityGallery';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import Footer from '@/components/Footer';

const CATEGORIES = [
  { id: 'random', label: '🎲 Random', color: 'from-purple-500 to-pink-500' },
  { id: 'food', label: '🍕 Food', color: 'from-orange-500 to-yellow-500' },
  { id: 'animals', label: '🐶 Animals', color: 'from-green-500 to-teal-500' },
  { id: 'school', label: '📚 School', color: 'from-blue-500 to-indigo-500' },
  { id: 'sports', label: '⚽ Sports', color: 'from-red-500 to-orange-500' },
  { id: 'music', label: '🎵 Music', color: 'from-pink-500 to-purple-500' },
];

interface Joke {
  question: string;
  answer: string;
}

const JokeGenerator: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [joke, setJoke] = useState<Joke | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [guess, setGuess] = useState('');
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('random');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [activeTab, setActiveTab] = useState('create');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isShared, setIsShared] = useState(false);

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
      // Try to get from library first
      const { data, error } = await supabase.functions.invoke('get-joke', {
        body: { category: selectedCategory, userId: user?.id },
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

    // Simple fuzzy match - check if key words match
    const guessLower = guess.toLowerCase().trim();
    const answerLower = joke.answer.toLowerCase();
    
    // Remove punctuation and common words for comparison
    const cleanString = (s: string) => s.replace(/[^\w\s]/g, '').replace(/\b(the|a|an|it|was|is|because)\b/g, '').trim();
    const cleanGuess = cleanString(guessLower);
    const cleanAnswer = cleanString(answerLower);
    
    // Check if they share significant words
    const guessWords = cleanGuess.split(/\s+/).filter(w => w.length > 2);
    const answerWords = cleanAnswer.split(/\s+/).filter(w => w.length > 2);
    
    const matchingWords = guessWords.filter(word => 
      answerWords.some(aw => aw.includes(word) || word.includes(aw))
    );
    
    const correct = matchingWords.length >= Math.min(2, guessWords.length) || 
                   cleanAnswer.includes(cleanGuess) || 
                   cleanGuess.includes(cleanAnswer);

    setIsCorrect(correct);
    setHasGuessed(true);
    setShowAnswer(true);
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    if (correct) {
      toast.success('🎉 You got it!');
    }
  };

  const revealAnswer = () => {
    setShowAnswer(true);
    if (!hasGuessed) {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
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
          category: selectedCategory,
          is_public: shareWithCommunity,
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
          <Link to="/community">
            <Button variant="outline" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Community
            </Button>
          </Link>
          
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
                Create
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
              {/* Score */}
              {score.total > 0 && (
                <div className="flex items-center justify-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold">{score.correct}</span>
                  <span className="text-muted-foreground">/ {score.total} correct</span>
                </div>
              )}

              {/* Categories */}
              <div className="flex flex-wrap justify-center gap-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={selectedCategory === cat.id ? `bg-gradient-to-r ${cat.color} border-0` : ''}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Generate Button */}
              <div className="flex justify-center">
                <Button
                  onClick={generateJoke}
                  disabled={isLoading}
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
              </div>

              {/* Joke Card */}
              {joke && (
                <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-card to-muted/50 overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    {/* Question */}
                    <div className="text-center">
                      <p className="text-xl font-medium">{joke.question}</p>
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
                          <p className="text-lg font-semibold text-foreground">{joke.answer}</p>
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

                        <div className="flex justify-center">
                          <Button
                            onClick={generateJoke}
                            variant="outline"
                            className="gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Another One!
                          </Button>
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
      </main>
      <Footer />
    </div>
  );
};

export default JokeGenerator;