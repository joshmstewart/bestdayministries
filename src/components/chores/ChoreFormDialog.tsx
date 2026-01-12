import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
}

interface ChoreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chore: Chore | null;
  bestieId: string;
  onSuccess: () => void;
}

const EMOJI_OPTIONS = ['✅', '🧹', '🍽️', '🛏️', '🚿', '📚', '🎒', '🐕', '🌱', '🧺', '🗑️', '📦', '💊', '🦷', '🧼', '👕', '🍳', '🧽', '🚗', '📝'];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ChoreFormDialog({ open, onOpenChange, chore, bestieId, onSuccess }: ChoreFormDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('✅');
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'every_x_days' | 'every_x_weeks'>('daily');
  const [recurrenceValue, setRecurrenceValue] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(0);

  useEffect(() => {
    if (chore) {
      setTitle(chore.title);
      setDescription(chore.description || '');
      setIcon(chore.icon);
      setRecurrenceType(chore.recurrence_type);
      setRecurrenceValue(chore.recurrence_value || 1);
      setDayOfWeek(chore.day_of_week || 0);
    } else {
      setTitle('');
      setDescription('');
      setIcon('✅');
      setRecurrenceType('daily');
      setRecurrenceValue(1);
      setDayOfWeek(new Date().getDay());
    }
  }, [chore, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setSaving(true);
    try {
      const choreData = {
        title: title.trim(),
        description: description.trim() || null,
        icon,
        recurrence_type: recurrenceType,
        recurrence_value: ['every_x_days', 'every_x_weeks'].includes(recurrenceType) ? recurrenceValue : null,
        day_of_week: ['weekly', 'every_x_weeks'].includes(recurrenceType) ? dayOfWeek : null,
        bestie_id: bestieId,
        created_by: user.id,
      };

      if (chore) {
        const { error } = await supabase
          .from('chores')
          .update(choreData)
          .eq('id', chore.id);

        if (error) throw error;
        toast.success('Chore updated!');
      } else {
        const { error } = await supabase
          .from('chores')
          .insert(choreData);

        if (error) throw error;
        toast.success('Chore added!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving chore:', error);
      toast.error('Failed to save chore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{chore ? 'Edit Chore' : 'Add Chore'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Make bed"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this chore..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-md transition-colors ${
                    icon === emoji 
                      ? 'bg-primary/20 ring-2 ring-primary' 
                      : 'hover:bg-muted'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>How Often?</Label>
            <Select value={recurrenceType} onValueChange={(v: any) => setRecurrenceType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every Day</SelectItem>
                <SelectItem value="weekly">Once a Week</SelectItem>
                <SelectItem value="every_x_days">Every X Days</SelectItem>
                <SelectItem value="every_x_weeks">Every X Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label>Which Day?</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {recurrenceType === 'every_x_days' && (
            <div className="space-y-2">
              <Label>Every how many days?</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={recurrenceValue}
                onChange={(e) => setRecurrenceValue(Number(e.target.value))}
              />
            </div>
          )}

          {recurrenceType === 'every_x_weeks' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Every how many weeks?</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={recurrenceValue}
                  onChange={(e) => setRecurrenceValue(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>On which day?</Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {chore ? 'Update' : 'Add'} Chore
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}