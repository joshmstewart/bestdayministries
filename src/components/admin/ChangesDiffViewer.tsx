import { Badge } from "@/components/ui/badge";

interface ChangesDiffViewerProps {
  beforeState: any;
  afterState: any;
}

export function ChangesDiffViewer({ beforeState, afterState }: ChangesDiffViewerProps) {
  const allKeys = new Set([
    ...Object.keys(beforeState || {}),
    ...Object.keys(afterState || {}),
  ]);

  const getChangeType = (key: string) => {
    const before = beforeState?.[key];
    const after = afterState?.[key];
    
    if (before === null && after !== null) return "added";
    if (before !== null && after === null) return "removed";
    if (before !== after) return "changed";
    return "unchanged";
  };

  const formatValue = (value: any) => {
    if (value === null) return <span className="text-muted-foreground italic">null</span>;
    if (value === undefined) return <span className="text-muted-foreground italic">undefined</span>;
    if (typeof value === "boolean") return value.toString();
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-2">
      {Array.from(allKeys).map((key) => {
        const changeType = getChangeType(key);
        if (changeType === "unchanged") return null;

        return (
          <div key={key} className="flex items-start gap-4 text-sm border-l-4 pl-3 py-2" 
               style={{
                 borderColor: 
                   changeType === "added" ? "hsl(var(--success))" :
                   changeType === "removed" ? "hsl(var(--destructive))" :
                   "hsl(var(--warning))"
               }}>
            <div className="min-w-[140px] font-mono font-semibold">{key}</div>
            <div className="flex-1 space-y-1">
              {changeType !== "added" && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">BEFORE</Badge>
                  <code className="text-xs">{formatValue(beforeState?.[key])}</code>
                </div>
              )}
              {changeType !== "removed" && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{
                      backgroundColor: changeType === "added" 
                        ? "hsl(var(--success) / 0.1)" 
                        : "hsl(var(--warning) / 0.1)"
                    }}
                  >
                    AFTER
                  </Badge>
                  <code className="text-xs font-semibold">{formatValue(afterState?.[key])}</code>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
