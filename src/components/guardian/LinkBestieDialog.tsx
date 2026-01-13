import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkBestieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emojiOptions: string[];
  onSubmit: (emoji1: string, emoji2: string, emoji3: string, relationship: string) => Promise<void>;
  isSearching: boolean;
}

export function LinkBestieDialog({
  open,
  onOpenChange,
  emojiOptions,
  onSubmit,
  isSearching,
}: LinkBestieDialogProps) {
  const [emoji1, setEmoji1] = useState("");
  const [emoji2, setEmoji2] = useState("");
  const [emoji3, setEmoji3] = useState("");
  const [relationship, setRelationship] = useState("");

  const handleSubmit = async () => {
    await onSubmit(emoji1, emoji2, emoji3, relationship);
    // Reset form on close
    setEmoji1("");
    setEmoji2("");
    setEmoji3("");
    setRelationship("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setEmoji1("");
      setEmoji2("");
      setEmoji3("");
      setRelationship("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Link a Bestie
          </DialogTitle>
          <DialogDescription>
            Enter the bestie's 3-emoji friend code and your relationship to them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Emoji Selection */}
          <div className="space-y-2">
            <Label>Friend Code (3 emojis)</Label>
            <div className="flex gap-2">
              {[
                { value: emoji1, setter: setEmoji1, label: "First" },
                { value: emoji2, setter: setEmoji2, label: "Second" },
                { value: emoji3, setter: setEmoji3, label: "Third" },
              ].map((item, index) => (
                <Select key={index} value={item.value} onValueChange={item.setter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={item.value || "🔮"} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="grid grid-cols-5 gap-1 p-2 max-h-60 overflow-y-auto">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className={cn(
                            "w-10 h-10 text-2xl flex items-center justify-center rounded-lg hover:bg-muted transition-colors",
                            item.value === emoji && "bg-primary/20 ring-2 ring-primary"
                          )}
                          onClick={() => item.setter(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              ))}
            </div>
            {emoji1 && emoji2 && emoji3 && (
              <p className="text-center text-2xl mt-2">
                {emoji1} {emoji2} {emoji3}
              </p>
            )}
          </div>

          {/* Relationship Input */}
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Input
              id="relationship"
              placeholder="e.g., parent, sibling, caregiver, friend"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!emoji1 || !emoji2 || !emoji3 || !relationship || isSearching}
          >
            {isSearching ? "Searching..." : "Link Bestie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
