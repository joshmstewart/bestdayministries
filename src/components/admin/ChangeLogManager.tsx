import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { SectionLoadingState, CompactEmptyState } from "@/components/common";

interface ChangeLog {
  id: string;
  created_at: string;
  changed_by: string;
  change_type: string;
  change_summary: string;
  change_details: any;
  affected_table: string | null;
  affected_record_id: string | null;
  profiles?: {
    display_name: string;
  };
}

export const ChangeLogManager = () => {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  const [newLog, setNewLog] = useState({
    change_type: "",
    change_summary: "",
    change_details: "",
    affected_table: "",
  });

  const changeTypes = [
    "Content Update",
    "Settings Change",
    "User Management",
    "Feature Addition",
    "Bug Fix",
    "Design Update",
    "Database Migration",
    "Configuration Change",
    "Other"
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("change_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user display names separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(log => log.changed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);
        
        const enrichedData = data.map(log => ({
          ...log,
          profiles: {
            display_name: profileMap.get(log.changed_by) || "Unknown"
          }
        }));
        
        setLogs(enrichedData);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error loading change logs:", error);
      toast({
        title: "Error",
        description: "Failed to load change logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async () => {
    if (!newLog.change_type || !newLog.change_summary) {
      toast({
        title: "Missing Information",
        description: "Please fill in change type and summary",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("change_logs").insert({
        changed_by: user.id,
        change_type: newLog.change_type,
        change_summary: newLog.change_summary,
        change_details: newLog.change_details ? JSON.parse(newLog.change_details) : null,
        affected_table: newLog.affected_table || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Change log added successfully",
      });

      setNewLog({
        change_type: "",
        change_summary: "",
        change_details: "",
        affected_table: "",
      });
      setShowAddForm(false);
      loadLogs();
    } catch (error) {
      console.error("Error adding change log:", error);
      toast({
        title: "Error",
        description: "Failed to add change log",
        variant: "destructive",
      });
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.change_summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.change_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || log.change_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "Content Update": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "Settings Change": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "User Management": "bg-orange-500/10 text-orange-500 border-orange-500/20",
      "Feature Addition": "bg-green-500/10 text-green-500 border-green-500/20",
      "Bug Fix": "bg-red-500/10 text-red-500 border-red-500/20",
      "Design Update": "bg-pink-500/10 text-pink-500 border-pink-500/20",
      "Database Migration": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      "Configuration Change": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    };
    return colors[type] || "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Change Logs
              </CardTitle>
              <CardDescription>
                Track all site updates and changes with timestamps
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log Change
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Change Type</label>
                    <Select
                      value={newLog.change_type}
                      onValueChange={(value) =>
                        setNewLog({ ...newLog, change_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {changeTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Affected Table (Optional)
                    </label>
                    <Input
                      value={newLog.affected_table}
                      onChange={(e) =>
                        setNewLog({ ...newLog, affected_table: e.target.value })
                      }
                      placeholder="e.g., events, albums"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Summary</label>
                  <Input
                    value={newLog.change_summary}
                    onChange={(e) =>
                      setNewLog({ ...newLog, change_summary: e.target.value })
                    }
                    placeholder="Brief description of the change"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Details (Optional JSON)
                  </label>
                  <Textarea
                    value={newLog.change_details}
                    onChange={(e) =>
                      setNewLog({ ...newLog, change_details: e.target.value })
                    }
                    placeholder='{"field": "value"}'
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddLog} size="sm">
                    Add Log Entry
                  </Button>
                  <Button
                    onClick={() => setShowAddForm(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {changeTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <SectionLoadingState message="Loading logs..." />
            ) : filteredLogs.length === 0 ? (
              <CompactEmptyState message="No change logs found" />
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="border-l-4 border-l-primary/50">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge
                                variant="outline"
                                className={getTypeColor(log.change_type)}
                              >
                                {log.change_type}
                              </Badge>
                              {log.affected_table && (
                                <Badge variant="secondary" className="text-xs">
                                  {log.affected_table}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-foreground">
                              {log.change_summary}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(log.created_at), "PPp")}
                          </span>
                          <span>•</span>
                          <span>
                            by {log.profiles?.display_name || "Unknown"}
                          </span>
                        </div>
                        {log.change_details && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto text-xs">
                              {JSON.stringify(log.change_details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
