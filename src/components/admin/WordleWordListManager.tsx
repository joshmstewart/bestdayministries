import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Search, Loader2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const WordleWordListManager = () => {
  const [words, setWords] = useState<{ id: string; word: string }[]>([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newWord, setNewWord] = useState("");
  const [bulkWords, setBulkWords] = useState("");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const fetchWords = async () => {
    setLoading(true);
    const [wordsResult, usedResult] = await Promise.all([
      supabase.from("wordle_valid_words").select("id, word").order("word", { ascending: true }),
      supabase.from("wordle_daily_words").select("word"),
    ]);

    if (wordsResult.error) {
      toast({ title: "Error loading words", description: wordsResult.error.message, variant: "destructive" });
    } else {
      setWords(wordsResult.data || []);
    }

    setUsedWords(new Set((usedResult.data || []).map(w => w.word.toUpperCase())));
    setLoading(false);
  };

  useEffect(() => { fetchWords(); }, []);

  const addWord = async () => {
    const w = newWord.trim().toUpperCase();
    if (w.length !== 5 || !/^[A-Z]+$/.test(w)) {
      toast({ title: "Invalid word", description: "Must be exactly 5 letters, A-Z only", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("wordle_valid_words").insert({ word: w });
    if (error) {
      toast({ title: "Error adding word", description: error.message.includes("duplicate") ? `"${w}" already exists` : error.message, variant: "destructive" });
    } else {
      toast({ title: "Word added", description: `"${w}" added to the list` });
      setNewWord("");
      fetchWords();
    }
    setAdding(false);
  };

  const addBulkWords = async () => {
    const rawWords = bulkWords
      .split(/[\n,]+/)
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length === 5 && /^[A-Z]+$/.test(w));

    if (rawWords.length === 0) {
      toast({ title: "No valid words", description: "Enter 5-letter words separated by commas or newlines", variant: "destructive" });
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from("wordle_valid_words")
      .insert(rawWords.map(w => ({ word: w })));

    if (error) {
      toast({ title: "Some words may already exist", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Words added", description: `${rawWords.length} words added` });
      setBulkWords("");
    }
    fetchWords();
    setAdding(false);
  };

  const removeWord = async (id: string, word: string) => {
    const { error } = await supabase.from("wordle_valid_words").delete().eq("id", id);
    if (error) {
      toast({ title: "Error removing word", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Word removed", description: `"${word}" removed` });
      setWords(prev => prev.filter(w => w.id !== id));
    }
  };

  const availableWords = words.filter(w => !usedWords.has(w.word));
  const usedWordsList = words.filter(w => usedWords.has(w.word));

  const filterList = (list: typeof words) =>
    search ? list.filter(w => w.word.includes(search.toUpperCase())) : list;

  const renderWordList = (list: typeof words, isUsed: boolean) => {
    const filtered = filterList(list);
    return (
      <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
        {filtered.map(w => (
          <div
            key={w.id}
            className={`group flex items-center gap-1 rounded-md px-2 py-1 text-sm font-mono tracking-wider ${
              isUsed ? "bg-muted/30 text-muted-foreground line-through" : "bg-muted/50"
            }`}
          >
            {isUsed && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
            {w.word}
            {!isUsed && (
              <button
                onClick={() => removeWord(w.id, w.word)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                title={`Remove ${w.word}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {search ? "No words match your search" : isUsed ? "No words used yet" : "No words in the list yet"}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daily Five Word List</h3>
          <p className="text-sm text-muted-foreground">
            Curated list of valid 5-letter words the game can use.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            {availableWords.length} available
          </Badge>
          <Badge variant="outline" className="text-sm">
            {usedWordsList.length} used
          </Badge>
        </div>
      </div>

      {/* Add single word */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a word (5 letters)..."
          value={newWord}
          onChange={e => setNewWord(e.target.value.toUpperCase().slice(0, 5))}
          maxLength={5}
          className="max-w-[200px] font-mono tracking-wider"
          onKeyDown={e => e.key === "Enter" && addWord()}
        />
        <Button onClick={addWord} disabled={adding || newWord.length !== 5} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Bulk add */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Bulk Add (comma or newline separated)</p>
        <textarea
          className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-wider ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="HAPPY, BRAVE, LIGHT, SUNNY..."
          value={bulkWords}
          onChange={e => setBulkWords(e.target.value)}
        />
        <Button onClick={addBulkWords} disabled={adding || !bulkWords.trim()} size="sm" variant="outline">
          {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Add Bulk
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search words..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 font-mono tracking-wider"
        />
      </div>

      {/* Tabbed word lists */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">
              Available ({filterList(availableWords).length})
            </TabsTrigger>
            <TabsTrigger value="used">
              Used ({filterList(usedWordsList).length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="available" className="mt-4">
            {renderWordList(availableWords, false)}
          </TabsContent>
          <TabsContent value="used" className="mt-4">
            {renderWordList(usedWordsList, true)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
