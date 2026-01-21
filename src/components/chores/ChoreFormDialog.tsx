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
  recurrence_type: 'once' | 'daily' | 'weekly' | 'every_x_days' | 'every_x_weeks';
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

const EMOJI_OPTIONS = ['✅', '🧹', '🍽️', '🛏️', '🚿', '📚', '🎒', '🐕', '🌱', '🧺', '🗑️', '📦', '💊', '🦷', '🧼', '👕', '🍳', '🧽', '🚗', '📝', '🧸', '🎮', '📱', '🛒', '🪥', '💤', '🏃', '🎵', '🐱', '🐟'];

// Pre-existing chore templates organized by category
const CHORE_TEMPLATES = [
  // Morning Routine
  { title: 'Make Bed', icon: '🛏️', description: 'Make your bed neatly', recurrence: 'daily' as const },
  { title: 'Brush Teeth (Morning)', icon: '🦷', description: 'Brush teeth for 2 minutes', recurrence: 'daily' as const },
  { title: 'Get Dressed', icon: '👕', description: 'Get dressed for the day', recurrence: 'daily' as const },
  { title: 'Eat Breakfast', icon: '🍳', description: 'Eat a healthy breakfast', recurrence: 'daily' as const },
  { title: 'Take Medication', icon: '💊', description: 'Take daily medication', recurrence: 'daily' as const },
  
  // Personal Hygiene
  { title: 'Shower', icon: '🚿', description: 'Take a shower', recurrence: 'daily' as const },
  { title: 'Brush Teeth (Night)', icon: '🪥', description: 'Brush teeth before bed', recurrence: 'daily' as const },
  { title: 'Wash Hands', icon: '🧼', description: 'Wash hands before meals', recurrence: 'daily' as const },
  { title: 'Wash Face', icon: '🧼', description: 'Wash face morning and night', recurrence: 'daily' as const },
  
  // Bedroom & Living Space
  { title: 'Tidy Room', icon: '🧹', description: 'Pick up items and tidy room', recurrence: 'daily' as const },
  { title: 'Put Away Clothes', icon: '👕', description: 'Put clean clothes away', recurrence: 'daily' as const },
  { title: 'Clean Desk/Table', icon: '🧽', description: 'Wipe down desk or table', recurrence: 'weekly' as const },
  { title: 'Change Bed Sheets', icon: '🛏️', description: 'Change bed sheets', recurrence: 'weekly' as const },
  { title: 'Vacuum Room', icon: '🧹', description: 'Vacuum the floor', recurrence: 'weekly' as const },
  
  // Kitchen & Meals
  { title: 'Set the Table', icon: '🍽️', description: 'Set the table for meals', recurrence: 'daily' as const },
  { title: 'Clear Table', icon: '🍽️', description: 'Clear dishes after eating', recurrence: 'daily' as const },
  { title: 'Load Dishwasher', icon: '🍽️', description: 'Load dirty dishes', recurrence: 'daily' as const },
  { title: 'Unload Dishwasher', icon: '🍽️', description: 'Put clean dishes away', recurrence: 'daily' as const },
  { title: 'Wash Dishes', icon: '🧽', description: 'Hand wash dishes', recurrence: 'daily' as const },
  { title: 'Wipe Kitchen Counter', icon: '🧽', description: 'Wipe down counters', recurrence: 'daily' as const },
  { title: 'Help Cook Dinner', icon: '🍳', description: 'Help prepare dinner', recurrence: 'daily' as const },
  { title: 'Pack Lunch', icon: '🎒', description: 'Pack lunch for tomorrow', recurrence: 'daily' as const },
  
  // Laundry
  { title: 'Put Dirty Clothes in Hamper', icon: '🧺', description: 'Put dirty clothes in the laundry basket', recurrence: 'daily' as const },
  { title: 'Fold Laundry', icon: '🧺', description: 'Fold clean laundry', recurrence: 'weekly' as const },
  { title: 'Start Laundry', icon: '🧺', description: 'Put clothes in washing machine', recurrence: 'weekly' as const },
  
  // Trash & Recycling
  { title: 'Take Out Trash', icon: '🗑️', description: 'Take trash to the bin', recurrence: 'weekly' as const },
  { title: 'Empty Bedroom Trash', icon: '🗑️', description: 'Empty trash can in bedroom', recurrence: 'weekly' as const },
  { title: 'Sort Recycling', icon: '📦', description: 'Sort recyclables', recurrence: 'weekly' as const },
  
  // Pets
  { title: 'Feed Pet', icon: '🐕', description: 'Feed your pet', recurrence: 'daily' as const },
  { title: 'Give Pet Water', icon: '🐕', description: 'Refill pet water bowl', recurrence: 'daily' as const },
  { title: 'Walk Dog', icon: '🐕', description: 'Take dog for a walk', recurrence: 'daily' as const },
  { title: 'Clean Litter Box', icon: '🐱', description: 'Scoop the litter box', recurrence: 'daily' as const },
  { title: 'Feed Fish', icon: '🐟', description: 'Feed the fish', recurrence: 'daily' as const },
  
  // Plants & Garden
  { title: 'Water Plants', icon: '🌱', description: 'Water indoor plants', recurrence: 'weekly' as const },
  { title: 'Pull Weeds', icon: '🌱', description: 'Pull weeds in the garden', recurrence: 'weekly' as const },
  
  // School & Learning
  { title: 'Do Homework', icon: '📚', description: 'Complete homework assignments', recurrence: 'daily' as const },
  { title: 'Read for 15 Minutes', icon: '📚', description: 'Read a book or magazine', recurrence: 'daily' as const },
  { title: 'Pack Backpack', icon: '🎒', description: 'Pack backpack for tomorrow', recurrence: 'daily' as const },
  { title: 'Practice Instrument', icon: '🎵', description: 'Practice your instrument', recurrence: 'daily' as const },
  
  // Screen Time & Electronics
  { title: 'Charge Devices', icon: '📱', description: 'Put devices on charger', recurrence: 'daily' as const },
  { title: 'Put Away Electronics', icon: '🎮', description: 'Put electronics away before bed', recurrence: 'daily' as const },
  
  // Exercise & Health
  { title: 'Exercise', icon: '🏃', description: 'Do physical activity', recurrence: 'daily' as const },
  { title: 'Go Outside', icon: '🌱', description: 'Spend time outside', recurrence: 'daily' as const },
  
  // Evening Routine
  { title: 'Put Away Toys', icon: '🧸', description: 'Put toys away before bed', recurrence: 'daily' as const },
  { title: 'Pick Out Clothes for Tomorrow', icon: '👕', description: 'Choose outfit for tomorrow', recurrence: 'daily' as const },
  { title: 'Go to Bed on Time', icon: '💤', description: 'Get in bed at bedtime', recurrence: 'daily' as const },
  
  // Errands & Helping Out
  { title: 'Help with Groceries', icon: '🛒', description: 'Help carry or put away groceries', recurrence: 'weekly' as const },
  { title: 'Help Wash Car', icon: '🚗', description: 'Help wash the car', recurrence: 'weekly' as const },
];

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
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'daily' | 'weekly' | 'every_x_days' | 'every_x_weeks'>('once');
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
      setRecurrenceType('once');
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

  const handleSelectTemplate = (template: typeof CHORE_TEMPLATES[0]) => {
    setTitle(template.title);
    setDescription(template.description);
    setIcon(template.icon);
    setRecurrenceType(template.recurrence);
    setRecurrenceValue(1);
    setDayOfWeek(new Date().getDay());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chore ? 'Edit Chore' : 'Add Chore'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pre-existing chore templates - only show when adding new chore */}
          {!chore && (
            <div className="space-y-2">
              <Label>Quick Add (or create your own below)</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 bg-muted/30">
                <div className="grid grid-cols-1 gap-1">
                  {CHORE_TEMPLATES.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={`flex items-center gap-2 p-2 rounded-md text-left transition-colors hover:bg-primary/10 ${
                        title === template.title ? 'bg-primary/20 ring-1 ring-primary' : ''
                      }`}
                    >
                      <span className="text-xl">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{template.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {template.recurrence === 'daily' ? 'Daily' : 'Weekly'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                <SelectItem value="once">Just Once</SelectItem>
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