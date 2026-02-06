import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHealthCheck, type HealthResult } from '@/hooks/useHealthCheck';
import { TIER_CONFIG, type FunctionTier, FUNCTION_REGISTRY } from '@/lib/edgeFunctionRegistry';
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle, Clock } from 'lucide-react';

function StatusIcon({ status }: { status: HealthResult['status'] }) {
  switch (status) {
    case 'alive': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'slow': return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'dead': return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function TierSection({ tier, results }: { tier: FunctionTier; results: HealthResult[] }) {
  const config = TIER_CONFIG[tier];
  const dead = results.filter(r => r.status === 'dead').length;
  const slow = results.filter(r => r.status === 'slow').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={config.color}>{config.label}</Badge>
        <span className="text-xs text-muted-foreground">{config.description}</span>
        {dead > 0 && <Badge variant="destructive" className="text-xs">{dead} down</Badge>}
        {slow > 0 && <Badge variant="outline" className="text-xs text-yellow-600">{slow} slow</Badge>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {results.map(r => {
          const entry = FUNCTION_REGISTRY.find(f => f.name === r.name);
          return (
            <TooltipProvider key={r.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs border ${
                    r.status === 'dead' ? 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800' :
                    r.status === 'slow' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800' :
                    'border-border bg-card'
                  }`}>
                    <StatusIcon status={r.status} />
                    <span className="truncate font-mono">{r.name}</span>
                    <span className="ml-auto text-muted-foreground whitespace-nowrap">
                      {r.responseTimeMs}ms
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{entry?.description || r.name}</p>
                  {r.error && <p className="text-red-400 text-xs">{r.error}</p>}
                  <p className="text-xs text-muted-foreground">{r.responseTimeMs}ms • HTTP {r.httpStatus || 'N/A'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

export function SystemHealthManager() {
  const { report, loading, error, runCheck, deadCriticalCount, deadCount } = useHealthCheck();
  const [autoChecked, setAutoChecked] = useState(false);

  // Auto-check critical functions on mount
  useEffect(() => {
    if (!autoChecked) {
      setAutoChecked(true);
      runCheck('critical');
    }
  }, [autoChecked, runCheck]);

  const criticalResults = report?.results.filter(r => r.tier === 'critical') ?? [];
  const importantResults = report?.results.filter(r => r.tier === 'important') ?? [];
  const utilityResults = report?.results.filter(r => r.tier === 'utility') ?? [];

  return (
    <div className="space-y-4">
      {/* Warning banner for dead functions */}
      {deadCount > 0 && (
        <Card className={`${deadCriticalCount > 0 ? 'border-red-400 bg-red-50 dark:bg-red-950/30' : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'}`}>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-6 w-6 shrink-0 ${deadCriticalCount > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
              <div className="flex-1">
                <p className={`font-semibold ${deadCriticalCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                  {deadCount} function{deadCount > 1 ? 's are' : ' is'} DOWN
                  {deadCriticalCount > 0 && ` (${deadCriticalCount} critical)`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {report?.results.filter(r => r.status === 'dead').map(r => r.name).join(', ')}
                </p>
              </div>
            </div>
            <div className="rounded-md bg-card border p-3 text-sm space-y-1.5">
              <p className="font-medium">🔧 How to fix:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Copy the dead function name(s) above</li>
                <li>Ask Lovable to <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">"redeploy [function-name]"</span></li>
                <li>Re-run the health check to verify</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Dead functions usually mean a deployment failed silently. Redeploying fixes it.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle className="text-lg">System Health</CardTitle>
              {report && (
                <Badge variant={deadCount > 0 ? 'destructive' : 'outline'} className="ml-2">
                  {report.summary.alive} alive
                  {report.summary.slow > 0 && ` • ${report.summary.slow} slow`}
                  {report.summary.dead > 0 && ` • ${report.summary.dead} dead`}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCheck('critical')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Check Critical
              </Button>
              <Button
                size="sm"
                onClick={() => runCheck('all')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Check All ({FUNCTION_REGISTRY.length - 1})
              </Button>
            </div>
          </div>
          {report && (
            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(report.checkedAt).toLocaleString()}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && !report && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Checking functions...
            </div>
          )}

          {report && (
            <>
              {criticalResults.length > 0 && <TierSection tier="critical" results={criticalResults} />}
              {importantResults.length > 0 && <TierSection tier="important" results={importantResults} />}
              {utilityResults.length > 0 && <TierSection tier="utility" results={utilityResults} />}
            </>
          )}

          {!loading && !report && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Click "Check Critical" or "Check All" to run a health check</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
