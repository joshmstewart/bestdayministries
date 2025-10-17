import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Trash2, Edit, Users } from "lucide-react";
import { toast } from "sonner";
import { DripSequenceDialog } from "./DripSequenceDialog";
import { format } from "date-fns";

export const NewsletterDripSequences = () => {
  const queryClient = useQueryClient();
  const [selectedSequence, setSelectedSequence] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: sequences, isLoading } = useQuery({
    queryKey: ["newsletter-drip-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_drip_sequences")
        .select(`
          *,
          newsletter_drip_steps(
            id,
            step_number,
            delay_value,
            delay_unit,
            newsletter_campaigns(title)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("newsletter_drip_sequences")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sequence status updated");
      queryClient.invalidateQueries({ queryKey: ["newsletter-drip-sequences"] });
    },
  });

  const deleteSequenceMutation = useMutation({
    mutationFn: async (sequenceId: string) => {
      const { error } = await supabase
        .from("newsletter_drip_sequences")
        .delete()
        .eq("id", sequenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sequence deleted");
      queryClient.invalidateQueries({ queryKey: ["newsletter-drip-sequences"] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "active":
        return "default";
      case "paused":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Drip Sequences</h3>
          <p className="text-sm text-muted-foreground">
            Multi-step email campaigns with delays
          </p>
        </div>
        <Button onClick={() => { setSelectedSequence(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Sequence
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading sequences...</div>
      ) : sequences?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No drip sequences yet</p>
          <Button onClick={() => { setSelectedSequence(null); setIsDialogOpen(true); }}>
            Create Your First Sequence
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences?.map((sequence) => (
            <Card key={sequence.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{sequence.name}</h4>
                    <Badge variant={getStatusColor(sequence.status)}>
                      {sequence.status}
                    </Badge>
                  </div>
                  {sequence.description && (
                    <p className="text-sm text-muted-foreground">{sequence.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span>{sequence.newsletter_drip_steps?.length || 0} steps</span>
                    <span>•</span>
                    <span><Users className="inline h-3 w-3 mr-1" />{sequence.total_enrolled} enrolled</span>
                    <span>•</span>
                    <span>{sequence.total_completed} completed</span>
                    <span>•</span>
                    <span>Created {format(new Date(sequence.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {sequence.status === "draft" || sequence.status === "paused" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: sequence.id, status: "active" })}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: sequence.id, status: "paused" })}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSequence(sequence);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSequenceMutation.mutate(sequence.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DripSequenceDialog
        sequence={selectedSequence}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};
