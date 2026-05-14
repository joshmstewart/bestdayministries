import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showErrorToast } from "@/lib/errorToast";
import { toast } from "sonner";

interface Stage { name: string; status: "pass" | "fail" | "skip"; detail: string; ms: number }
interface RunRow {
  id: string; started_at: string; finished_at: string | null;
  overall_status: string; stages: Stage[]; order_id: string | null; error: string | null;
}

const StatusIcon = ({ s }: { s: Stage["status"] }) =>
  s === "pass" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
  s === "fail" ? <XCircle className="h-4 w-4 text-destructive" /> :
  <MinusCircle className="h-4 w-4 text-muted-foreground" />;

export const MarketplaceSmokeTestRunner = () => {
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState<{ stages: Stage[]; overall: string } | null>(null);
  const [history, setHistory] = useState<RunRow[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase.from("e2e_test_runs")
      .select("*").eq("test_type", "marketplace")
      .order("started_at", { ascending: false }).limit(10);
    setHistory((data ?? []) as unknown as RunRow[]);
  };

  useEffect(() => { loadHistory(); }, []);

  const run = async () => {
    setRunning(true);
    setLatest(null);
    try {
      const { data, error } = await supabase.functions.invoke("e2e-marketplace-smoke-test", { body: {} });
      if (error) throw error;
      setLatest({ stages: data.stages ?? [], overall: data.overall });
      toast.success(`Smoke test ${data.overall.toUpperCase()} — ${data.passed} pass / ${data.failed} fail / ${data.skipped} skip`);
      loadHistory();
    } catch (e: any) {
      showErrorToast({ title: "Smoke test failed to run", message: e?.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Marketplace E2E Smoke Test</h3>
          <p className="text-sm text-muted-foreground">
            Exhaustively exercises every downstream stage that fires after a marketplace payment.
            Creates and cleans up a synthetic test order. Safe to run anytime.
          </p>
        </div>
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          {running ? "Running…" : "Run smoke test"}
        </Button>
      </div>

      {latest && (
        <div className="border rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={latest.overall === "pass" ? "default" : "destructive"}>
              {latest.overall.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">{latest.stages.length} stages</span>
          </div>
          <div className="space-y-1.5">
            {latest.stages.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <StatusIcon s={s.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{s.name} <span className="text-xs text-muted-foreground">({s.ms}ms)</span></div>
                  <div className="text-xs text-muted-foreground break-words">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Recent runs</h4>
          <div className="space-y-1">
            {history.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs border rounded px-2 py-1">
                <Badge variant={r.overall_status === "pass" ? "default" : r.overall_status === "running" ? "secondary" : "destructive"}>
                  {r.overall_status}
                </Badge>
                <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span>
                <span className="ml-auto text-muted-foreground">
                  {Array.isArray(r.stages) ? `${r.stages.filter(s => s.status === "pass").length}/${r.stages.length} passed` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
