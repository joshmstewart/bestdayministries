import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TextToSpeech } from "@/components/TextToSpeech";

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
  created_by: string;
}

interface ChoreManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chores: Chore[];
  onEdit: (chore: Chore) => void;
  onRefresh: () => void;
  currentUserId?: string;
  canManageAll?: boolean; // true for guardians/admins
}

export function ChoreManageDialog({ open, onOpenChange, chores, onEdit, onRefresh, currentUserId, canManageAll = false }: ChoreManageDialogProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggleActive = async (chore: Chore) => {
    setUpdating(chore.id);
    try {
      const { error } = await supabase
        .from('chores')
        .update({ is_active: !chore.is_active })
        .eq('id', chore.id);

      if (error) throw error;
      onRefresh();
      toast.success(chore.is_active ? 'Chore hidden' : 'Chore shown');
    } catch (error) {
      console.error('Error toggling chore:', error);
      toast.error('Failed to update chore');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      onRefresh();
      toast.success('Chore deleted');
    } catch (error) {
      console.error('Error deleting chore:', error);
      toast.error('Failed to delete chore');
    } finally {
      setDeleteId(null);
    }
  };

  const getRecurrenceLabel = (chore: Chore) => {
    switch (chore.recurrence_type) {
      case 'once':
        return 'Just Once';
      case 'daily':
        return 'Daily';
      case 'weekly':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Weekly (${days[chore.day_of_week || 0]})`;
      case 'every_x_days':
        return `Every ${chore.recurrence_value} days`;
      case 'every_x_weeks':
        return `Every ${chore.recurrence_value} weeks`;
      default:
        return '';
    }
  };

  // Sort to show active first, then inactive
  const sortedChores = [...chores].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.display_order - b.display_order;
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Chores</DialogTitle>
          </DialogHeader>

          {sortedChores.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No chores yet. Add some to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {sortedChores.map(chore => {
                const canEditThis = canManageAll || chore.created_by === currentUserId;
                return (
                  <div 
                    key={chore.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      chore.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    
                    <span className="text-xl">{chore.icon}</span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{chore.title}</span>
                        <TextToSpeech 
                          text={`${chore.title}${chore.description ? `. ${chore.description}` : ''}. ${getRecurrenceLabel(chore)}`}
                          size="icon"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getRecurrenceLabel(chore)}
                      </div>
                    </div>

                    {canEditThis ? (
                      <>
                        <Switch
                          checked={chore.is_active}
                          onCheckedChange={() => handleToggleActive(chore)}
                          disabled={updating === chore.id}
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            onEdit(chore);
                            onOpenChange(false);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(chore.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Added by guardian</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chore?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chore and all its completion history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}