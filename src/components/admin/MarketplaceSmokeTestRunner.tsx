import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [history, setHistory] = useState<RunRow[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase.from("e2e_test_runs")
      .select("*").eq("test_type", "marketplace")
      .order("started_at", { ascending: false }).limit(10);
    setHistory((data ?? []) as unknown as RunRow[]);
  };

  useEffect(() => { loadHistory(); }, []);

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Marketplace E2E Smoke Test</h3>
        <p className="text-sm text-muted-foreground">
          Test environment tools are disabled on the live site.
        </p>
      </div>

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
