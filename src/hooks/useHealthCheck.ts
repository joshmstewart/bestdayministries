import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FUNCTION_REGISTRY, getCriticalFunctions, type FunctionTier } from '@/lib/edgeFunctionRegistry';

export interface HealthResult {
  name: string;
  status: 'alive' | 'dead' | 'slow';
  responseTimeMs: number;
  httpStatus?: number;
  error?: string;
  tier: FunctionTier;
}

export interface HealthCheckReport {
  checkedAt: string;
  summary: { total: number; alive: number; slow: number; dead: number };
  results: HealthResult[];
}

export function useHealthCheck() {
  const [report, setReport] = useState<HealthCheckReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async (scope: 'critical' | 'all' = 'all') => {
    setLoading(true);
    setError(null);

    const functions = scope === 'critical'
      ? getCriticalFunctions()
      : FUNCTION_REGISTRY;

    const functionNames = functions
      .filter(f => f.name !== 'health-check')
      .map(f => f.name);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('health-check', {
        body: { functionNames, timeoutMs: 5000 },
      });

      if (fnError) throw fnError;

      // Enrich results with tier info
      const enriched: HealthResult[] = (data.results || []).map((r: any) => {
        const entry = FUNCTION_REGISTRY.find(f => f.name === r.name);
        return { ...r, tier: entry?.tier ?? 'utility' };
      });

      const newReport: HealthCheckReport = {
        checkedAt: data.checkedAt,
        summary: data.summary,
        results: enriched,
      };

      setReport(newReport);

      // Persist to DB so badge/alerts update via realtime
      const deadCritical = enriched.filter(r => r.tier === 'critical' && r.status === 'dead').length;
      const deadNames = enriched.filter(r => r.status === 'dead').map(r => r.name);
      await supabase.from('health_check_results').insert({
        scope,
        total_checked: enriched.length,
        alive_count: data.summary.alive,
        dead_count: data.summary.dead,
        slow_count: data.summary.slow,
        dead_critical_count: deadCritical,
        dead_function_names: deadNames,
        alert_sent: false,
      });

      return newReport;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Health check failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deadCriticalCount = report?.results.filter(
    r => r.tier === 'critical' && r.status === 'dead'
  ).length ?? 0;

  const deadCount = report?.results.filter(r => r.status === 'dead').length ?? 0;

  return { report, loading, error, runCheck, deadCriticalCount, deadCount };
}
