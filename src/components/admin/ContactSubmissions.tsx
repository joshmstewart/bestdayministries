import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Eye, Reply, RefreshCw, Mail, MailOpen, Globe, Inbox, MoreVertical, Filter, X, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  display_name: string;
}
interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  message_type: string | null;
  image_url: string | null;
  replied_at: string | null;
  reply_message: string | null;
  admin_notes: string | null;
  cc_emails: string[] | null;
  assigned_to: string | null;
  reply_count?: number;
  unread_user_replies?: number;
  source?: string;
  latest_activity_date?: string;
  assigned_admin_name?: string;
}

interface Reply {
  id: string;
  sender_type: 'admin' | 'user';
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
  cc_emails?: string[] | null;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Unread', variant: 'destructive' as const },
  { value: 'read', label: 'Read', variant: 'secondary' as const },
  { value: 'backlog', label: 'Backlog', variant: 'outline' as const },
  { value: 'in_progress', label: 'In Progress', variant: 'default' as const },
  { value: 'done', label: 'Done', variant: 'secondary' as const },
  { value: 'wont_fix', label: "Won't Fix", variant: 'outline' as const },
];

type AssignmentFilter = 'all' | 'mine' | 'unassigned' | string; // string for specific user ID

export default function ContactSubmissions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    loadSubmissions();
    loadAdminUsers();
    
    const submissionsChannel = supabase
      .channel('contact_submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_form_submissions' }, () => {
        loadSubmissions();
      })
      .subscribe();
    
    const repliesChannel = supabase
      .channel('contact_replies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_form_replies' }, () => {
        loadSubmissions();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(repliesChannel);
    };
  }, []);

  const loadAdminUsers = async () => {
    // Get all admin and owner role users
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);
    
    if (roles && roles.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", roles.map(r => r.user_id));
      
      if (profiles) {
        setAdminUsers(profiles.map(p => ({ id: p.id, display_name: p.display_name || "Unknown" })));
      }
    }
  };

  const loadSubmissions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    const { data } = await supabase
      .from("contact_form_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const submissionIds = data.map(s => s.id);
      const assignedUserIds = data.map(s => s.assigned_to).filter(Boolean) as string[];
      
      // Fetch replies and assigned admin names in parallel
      const [repliesResult, profilesResult] = await Promise.all([
        supabase
          .from("contact_form_replies")
          .select("submission_id, sender_type, created_at")
          .in("submission_id", submissionIds),
        assignedUserIds.length > 0 
          ? supabase.from("profiles").select("id, display_name").in("id", assignedUserIds)
          : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] })
      ]);
      
      const allReplies = repliesResult.data || [];
      const assignedProfiles = new Map(
        (profilesResult.data || []).map(p => [p.id, p.display_name || "Unknown"])
      );
      
      const replyCounts = new Map<string, { total: number; unread: number; latestDate: string }>();
      
      data.forEach(submission => {
        const submissionReplies = allReplies.filter(r => r.submission_id === submission.id) || [];
        const repliedAt = submission.replied_at || "1970-01-01";
        const unreadUserReplies = submissionReplies.filter(
          r => r.sender_type === "user" && r.created_at >= repliedAt
        ).length;
        
        // Find the latest date (either submission or latest reply)
        const latestReplyDate = submissionReplies.length > 0 
          ? Math.max(...submissionReplies.map(r => new Date(r.created_at).getTime()))
          : 0;
        const submissionDate = new Date(submission.created_at).getTime();
        const latestDate = new Date(Math.max(submissionDate, latestReplyDate)).toISOString();
        
        replyCounts.set(submission.id, {
          total: submissionReplies.length,
          unread: unreadUserReplies,
          latestDate
        });
      });
      
      const submissionsWithCounts = data.map(submission => ({
        ...submission,
        reply_count: replyCounts.get(submission.id)?.total || 0,
        unread_user_replies: replyCounts.get(submission.id)?.unread || 0,
        latest_activity_date: replyCounts.get(submission.id)?.latestDate || submission.created_at,
        assigned_admin_name: submission.assigned_to ? assignedProfiles.get(submission.assigned_to) : undefined
      }));
      
      // Sort by latest activity date
      submissionsWithCounts.sort((a, b) => 
        new Date(b.latest_activity_date).getTime() - new Date(a.latest_activity_date).getTime()
      );
      
      setSubmissions(submissionsWithCounts);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  const assignSubmission = async (id: string, assignedTo: string | null, submission?: Submission) => {
    const previousAssignedTo = submission?.assigned_to;
    
    const { error } = await supabase
      .from("contact_form_submissions")
      .update({ assigned_to: assignedTo })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Failed to assign", variant: "destructive" });
      return;
    }
    
    const adminName = assignedTo ? adminUsers.find(a => a.id === assignedTo)?.display_name : null;
    
    // Update local state immediately
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === id 
          ? { ...sub, assigned_to: assignedTo, assigned_admin_name: adminName || undefined } 
          : sub
      )
    );
    
    toast({ title: assignedTo ? `Assigned to ${adminName}` : "Unassigned" });
    
    // Send notification if assigning to someone new (not unassigning, not same person)
    if (assignedTo && assignedTo !== previousAssignedTo && user) {
      const targetSubmission = submission || submissions.find(s => s.id === id);
      supabase.functions.invoke('notify-admin-assignment', {
        body: {
          submissionId: id,
          assignedToUserId: assignedTo,
          assignedByUserId: user.id,
          submissionSubject: targetSubmission?.subject,
          senderName: targetSubmission?.name || "Unknown",
        },
      }).catch(err => console.error("Failed to send assignment notification:", err));
    }
  };

  const loadReplies = async (submissionId: string) => {
    setLoadingReplies(true);
    const { data } = await supabase
      .from("contact_form_replies")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true });

    setReplies((data || []) as Reply[]);
    setLoadingReplies(false);
    
    // Update replied_at to mark all replies as viewed (add 1 second buffer for timing)
    const now = new Date();
    now.setSeconds(now.getSeconds() + 1);
    await supabase
      .from("contact_form_submissions")
      .update({ replied_at: now.toISOString() })
      .eq("id", submissionId);
    
    // Mark notifications as read
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("type", ["contact_form_submission", "contact_form_reply"])
      .eq("metadata->>submission_id", submissionId);
    
    // Update local state to remove red dot immediately
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, unread_user_replies: 0, replied_at: now.toISOString() } 
          : sub
      )
    );
  };

  const openDialogForSubmission = (sub: Submission) => {
    setSelectedSubmission(sub);
    setReplyMessage("");
    setAdminNotes(sub.admin_notes || "");
    setCcEmails(sub.cc_emails || []);
    setNewCcEmail("");
    setDialogOpen(true);
    loadReplies(sub.id);
  };

  const addCcEmail = () => {
    const email = newCcEmail.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !ccEmails.includes(email)) {
      setCcEmails([...ccEmails, email]);
      setNewCcEmail("");
    }
  };

  const removeCcEmail = (emailToRemove: string) => {
    setCcEmails(ccEmails.filter((e) => e !== emailToRemove));
  };

  const updateStatus = async (id: string, status: string) => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + 1);
    await supabase
      .from("contact_form_submissions")
      .update({ 
        status,
        replied_at: status !== 'new' ? now.toISOString() : null // Clear unread when not new
      })
      .eq("id", id);
    
    // Update local state immediately
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === id 
          ? { ...sub, status, unread_user_replies: status !== 'new' ? 0 : sub.unread_user_replies, replied_at: status !== 'new' ? now.toISOString() : null } 
          : sub
      )
    );
    
    const statusLabel = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    toast({ title: `Status updated to ${statusLabel}` });
  };

  const toggleStatusFilter = (status: string) => {
    const newFilter = new Set(statusFilter);
    if (newFilter.has(status)) {
      newFilter.delete(status);
    } else {
      newFilter.add(status);
    }
    setStatusFilter(newFilter);
  };

  // Apply both status and assignment filters
  const filteredSubmissions = submissions.filter(sub => {
    // Status filter
    if (statusFilter.size > 0 && !statusFilter.has(sub.status)) {
      return false;
    }
    
    // Assignment filter
    if (assignmentFilter === 'mine' && sub.assigned_to !== user?.id) {
      return false;
    }
    if (assignmentFilter === 'unassigned' && sub.assigned_to !== null) {
      return false;
    }
    // If it's a specific user ID (not 'all', 'mine', or 'unassigned')
    if (assignmentFilter !== 'all' && assignmentFilter !== 'mine' && assignmentFilter !== 'unassigned') {
      if (sub.assigned_to !== assignmentFilter) {
        return false;
      }
    }
    
    return true;
  });

  const getAssignmentFilterLabel = () => {
    if (assignmentFilter === 'all') return 'All';
    if (assignmentFilter === 'mine') return 'Mine';
    if (assignmentFilter === 'unassigned') return 'Unassigned';
    const admin = adminUsers.find(a => a.id === assignmentFilter);
    return admin?.display_name || 'Unknown';
  };

  const deleteSubmission = async (id: string) => {
    await supabase.from("contact_form_submissions").delete().eq("id", id);
    loadSubmissions();
    toast({ title: "Deleted" });
  };

  const sendReply = async () => {
    if (!selectedSubmission || !replyMessage.trim()) return;

    setSending(true);
    try {
      await supabase.functions.invoke('send-contact-reply', {
        body: {
          submissionId: selectedSubmission.id,
          replyMessage: replyMessage.trim(),
          adminNotes: adminNotes.trim() || undefined,
          ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
        },
      });

      // Persist for future replies in the same thread
      await supabase
        .from("contact_form_submissions")
        .update({ cc_emails: ccEmails, admin_notes: adminNotes.trim() || null })
        .eq("id", selectedSubmission.id);

      const ccText = ccEmails.length > 0 ? ` (CC: ${ccEmails.length})` : "";
      toast({ title: `Reply sent!${ccText}` });
      setReplyMessage("");
      loadReplies(selectedSubmission.id);
      loadSubmissions();
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const updateSelectedStatus = async (status: string) => {
    setBulkProcessing(true);
    const now = new Date();
    now.setSeconds(now.getSeconds() + 1);
    await supabase
      .from("contact_form_submissions")
      .update({ 
        status,
        replied_at: status !== 'new' ? now.toISOString() : null
      })
      .in("id", Array.from(selectedIds));
    
    // Update local state immediately
    setSubmissions(prev => 
      prev.map(sub => 
        selectedIds.has(sub.id) 
          ? { ...sub, status, unread_user_replies: status !== 'new' ? 0 : sub.unread_user_replies, replied_at: status !== 'new' ? now.toISOString() : null } 
          : sub
      )
    );
    
    setSelectedIds(new Set());
    const statusLabel = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    toast({ title: `${selectedIds.size} updated to ${statusLabel}` });
    setBulkProcessing(false);
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} submissions?`)) return;
    
    setBulkProcessing(true);
    await supabase.from("contact_form_submissions").delete().in("id", Array.from(selectedIds));
    setSelectedIds(new Set());
    loadSubmissions();
    toast({ title: `${selectedIds.size} deleted` });
    setBulkProcessing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Messages</CardTitle>
                <CardDescription>
                  Messages from contact form and emails sent to your domain
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Status {statusFilter.size > 0 && `(${statusFilter.size})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {STATUS_OPTIONS.map(option => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={statusFilter.has(option.value)}
                        onCheckedChange={() => toggleStatusFilter(option.value)}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {statusFilter.size > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setStatusFilter(new Set())}>
                          <X className="h-4 w-4 mr-2" />
                          Clear Filters
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {getAssignmentFilterLabel()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Assignment</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={assignmentFilter === 'all'}
                      onCheckedChange={() => setAssignmentFilter('all')}
                    >
                      All
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={assignmentFilter === 'mine'}
                      onCheckedChange={() => setAssignmentFilter('mine')}
                    >
                      Assigned to Me
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={assignmentFilter === 'unassigned'}
                      onCheckedChange={() => setAssignmentFilter('unassigned')}
                    >
                      Unassigned
                    </DropdownMenuCheckboxItem>
                    {adminUsers.filter(a => a.id !== user?.id).length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs">Other Admins</DropdownMenuLabel>
                        {adminUsers.filter(a => a.id !== user?.id).map(admin => (
                          <DropdownMenuCheckboxItem
                            key={admin.id}
                            checked={assignmentFilter === admin.id}
                            onCheckedChange={() => setAssignmentFilter(admin.id)}
                          >
                            {admin.display_name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => loadSubmissions(true)} disabled={refreshing} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex gap-2 ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" disabled={bulkProcessing}>
                        Update Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUS_OPTIONS.map(option => (
                        <DropdownMenuItem key={option.value} onClick={() => updateSelectedStatus(option.value)}>
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={bulkProcessing}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter.size > 0 || assignmentFilter !== 'all' ? 'No messages match the selected filters' : 'No submissions yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                      onChange={() => setSelectedIds(selectedIds.size === filteredSubmissions.length ? new Set() : new Set(filteredSubmissions.map(s => s.id)))}
                    />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDialogForSubmission(sub)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(sub.id)} onChange={() => toggleSelection(sub.id)} />
                    </TableCell>
                    <TableCell>
                      {(sub.status === 'new' || sub.unread_user_replies! > 0) && <div className="w-2 h-2 rounded-full bg-destructive" />}
                    </TableCell>
                    <TableCell>{format(new Date(sub.latest_activity_date || sub.created_at), 'M/d/yy')}</TableCell>
                    <TableCell>{sub.name}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={sub.subject || undefined}>
                        {sub.subject || <span className="text-muted-foreground italic">No subject</span>}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {sub.assigned_admin_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="cursor-pointer" onClick={() => assignSubmission(sub.id, null, sub)}>
                                {sub.assigned_admin_name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Click to unassign</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sub.message_type?.replace(/_/g, ' ') || 'general'}</Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex">
                              {sub.source === 'email' ? <Mail className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {sub.source === 'email' ? 'Received via email' : 'Submitted via contact form'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_OPTIONS.find(s => s.value === sub.status)?.variant || 'secondary'}>
                        {STATUS_OPTIONS.find(s => s.value === sub.status)?.label || sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => openDialogForSubmission(sub)}>
                                <Reply className="w-4 h-4" />
                                {sub.unread_user_replies! > 0 && <Badge variant="destructive" className="ml-1">{sub.unread_user_replies}</Badge>}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View and reply</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialogForSubmission(sub)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Assign To</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => assignSubmission(sub.id, null, sub)}
                              disabled={!sub.assigned_to}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Unassigned
                            </DropdownMenuItem>
                            {adminUsers.map(admin => (
                              <DropdownMenuItem 
                                key={admin.id} 
                                onClick={() => assignSubmission(sub.id, admin.id, sub)}
                                disabled={sub.assigned_to === admin.id}
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                {admin.display_name}
                                {admin.id === user?.id && " (me)"}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                            {STATUS_OPTIONS.map(option => (
                              <DropdownMenuItem 
                                key={option.value} 
                                onClick={() => updateStatus(sub.id, option.value)}
                                disabled={sub.status === option.value}
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteSubmission(sub.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Message from {selectedSubmission?.name}</DialogTitle>
            <DialogDescription>{selectedSubmission?.email}</DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              {/* Original Message */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedSubmission.created_at), 'PPpp')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={selectedSubmission.assigned_to || "unassigned"} 
                      onValueChange={(value) => {
                        const newAssignedTo = value === "unassigned" ? null : value;
                        assignSubmission(selectedSubmission.id, newAssignedTo, selectedSubmission);
                        const adminName = newAssignedTo ? adminUsers.find(a => a.id === newAssignedTo)?.display_name : undefined;
                        setSelectedSubmission({ ...selectedSubmission, assigned_to: newAssignedTo, assigned_admin_name: adminName });
                      }}
                    >
                      <SelectTrigger className="w-[160px]">
                        <UserPlus className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {adminUsers.map(admin => (
                          <SelectItem key={admin.id} value={admin.id}>
                            {admin.display_name}{admin.id === user?.id && " (me)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={selectedSubmission.status} 
                      onValueChange={(newStatus) => {
                        updateStatus(selectedSubmission.id, newStatus);
                        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedSubmission.subject && (
                  <div><strong>Subject:</strong> {selectedSubmission.subject}</div>
                )}
                <div>
                  <strong>Message:</strong>
                  <p className="whitespace-pre-wrap mt-2 p-3 bg-background rounded">{selectedSubmission.message}</p>
                </div>
                {selectedSubmission.image_url && (
                  <div>
                    <strong>Attachment:</strong>
                    <img src={selectedSubmission.image_url} alt="Attachment" className="max-w-full rounded mt-2 border" />
                  </div>
                )}
              </div>

              {/* Conversation History */}
              {loadingReplies ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : replies.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Conversation History</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {replies.map((r) => (
                      <div key={r.id} className={`p-3 rounded ${r.sender_type === 'admin' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                        <div className="text-sm font-medium">{r.sender_name} ({r.sender_type})</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'PPp')}</div>
                        {r.cc_emails && r.cc_emails.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">CC:</span> {r.cc_emails.join(', ')}
                          </div>
                        )}
                        <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Form */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-sm">Send Reply</h3>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={6}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">CC recipients (optional)</label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={newCcEmail}
                      onChange={(e) => setNewCcEmail(e.target.value)}
                      placeholder="Add CC email..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCcEmail();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addCcEmail} disabled={!newCcEmail.trim()}>
                      Add
                    </Button>
                  </div>
                  {ccEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ccEmails.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1 py-1">
                          {email}
                          <button
                            type="button"
                            onClick={() => removeCcEmail(email)}
                            className="ml-1 hover:text-destructive"
                            aria-label={`Remove ${email}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Admin notes (internal only)..."
                  rows={3}
                />
                <Button onClick={sendReply} disabled={sending || !replyMessage.trim()}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Reply className="mr-2 h-4 w-4" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
