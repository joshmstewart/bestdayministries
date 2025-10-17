import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Trash2, BarChart } from "lucide-react";
import { toast } from "sonner";
import { AutomationDialog } from "./AutomationDialog";
import { format } from "date-fns";

export const NewsletterAutomations = () => {
  const queryClient = useQueryClient();
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: automations, isLoading } = useQuery({
    queryKey: ["newsletter-automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_automations")
        .select("*, newsletter_campaigns(title), newsletter_drip_sequences(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("newsletter_automations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automation status updated");
      queryClient.invalidateQueries({ queryKey: ["newsletter-automations"] });
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (automationId: string) => {
      const { error } = await supabase
        .from("newsletter_automations")
        .delete()
        .eq("id", automationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automation deleted");
      queryClient.invalidateQueries({ queryKey: ["newsletter-automations"] });
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

  const getTriggerLabel = (automation: any) => {
    if (automation.trigger_type === "event") {
      return `Event: ${automation.trigger_event || "Not set"}`;
    }
    return "Drip Sequence";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Automations</h3>
          <p className="text-sm text-muted-foreground">
            Event-triggered and drip campaigns
          </p>
        </div>
        <Button onClick={() => { setSelectedAutomation(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Automation
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading automations...</div>
      ) : automations?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No automations yet</p>
          <Button onClick={() => { setSelectedAutomation(null); setIsDialogOpen(true); }}>
            Create Your First Automation
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {automations?.map((automation) => (
            <Card key={automation.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{automation.name}</h4>
                    <Badge variant={getStatusColor(automation.status)}>
                      {automation.status}
                    </Badge>
                  </div>
                  {automation.description && (
                    <p className="text-sm text-muted-foreground">{automation.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span>{getTriggerLabel(automation)}</span>
                    <span>•</span>
                    <span>{automation.total_enrolled} enrolled</span>
                    <span>•</span>
                    <span>{automation.total_sent} sent</span>
                    <span>•</span>
                    <span>Created {format(new Date(automation.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {automation.status === "draft" || automation.status === "paused" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: automation.id, status: "active" })}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: automation.id, status: "paused" })}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Show analytics dialog
                      toast.info("Analytics coming soon");
                    }}
                  >
                    <BarChart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAutomationMutation.mutate(automation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AutomationDialog
        automation={selectedAutomation}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};
