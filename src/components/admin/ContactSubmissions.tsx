import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Eye, Reply, RefreshCw, Mail, MailOpen, Globe, Inbox, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  message_type: string;
  image_url: string | null;
  replied_at: string | null;
  reply_message: string | null;
  admin_notes: string | null;
  reply_count?: number;
  unread_user_replies?: number;
  source?: string;
}

interface Reply {
  id: string;
  sender_type: 'admin' | 'user';
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
}

export default function ContactSubmissions() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadSubmissions();
    
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

  const loadSubmissions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    const { data } = await supabase
      .from("contact_form_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const submissionIds = data.map(s => s.id);
      const { data: allReplies } = await supabase
        .from("contact_form_replies")
        .select("submission_id, sender_type, created_at")
        .in("submission_id", submissionIds);
      
      const replyCounts = new Map<string, { total: number; unread: number }>();
      
      data.forEach(submission => {
        const submissionReplies = allReplies?.filter(r => r.submission_id === submission.id) || [];
        const repliedAt = submission.replied_at || "1970-01-01";
        const unreadUserReplies = submissionReplies.filter(
          r => r.sender_type === "user" && r.created_at >= repliedAt
        ).length;
        
        replyCounts.set(submission.id, {
          total: submissionReplies.length,
          unread: unreadUserReplies
        });
      });
      
      setSubmissions(data.map(submission => ({
        ...submission,
        reply_count: replyCounts.get(submission.id)?.total || 0,
        unread_user_replies: replyCounts.get(submission.id)?.unread || 0
      })));
    }
    
    setLoading(false);
    setRefreshing(false);
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
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("type", ["contact_form_submission", "contact_form_reply"])
      .eq("metadata->>submission_id", submissionId);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("contact_form_submissions").update({ status: "read" }).eq("id", id);
    loadSubmissions();
    toast({ title: "Marked as read" });
  };

  const markAsNew = async (id: string) => {
    await supabase.from("contact_form_submissions").update({ status: "new" }).eq("id", id);
    loadSubmissions();
    toast({ title: "Marked as new" });
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
        },
      });

      toast({ title: "Reply sent!" });
      setReplyDialogOpen(false);
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

  const markSelectedAsRead = async () => {
    setBulkProcessing(true);
    await supabase.from("contact_form_submissions").update({ status: "read" }).in("id", Array.from(selectedIds));
    setSelectedIds(new Set());
    loadSubmissions();
    toast({ title: `${selectedIds.size} marked as read` });
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
              <Button onClick={() => loadSubmissions(true)} disabled={refreshing} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={markSelectedAsRead} disabled={bulkProcessing}>
                    <MailOpen className="w-4 h-4 mr-2" />
                    Mark as Read
                  </Button>
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
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No submissions yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === submissions.length}
                      onChange={() => setSelectedIds(selectedIds.size === submissions.length ? new Set() : new Set(submissions.map(s => s.id)))}
                    />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedSubmission(sub); setViewDialogOpen(true); }}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(sub.id)} onChange={() => toggleSelection(sub.id)} />
                    </TableCell>
                    <TableCell>
                      {(sub.status === 'new' || sub.unread_user_replies! > 0) && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    </TableCell>
                    <TableCell>{format(new Date(sub.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{sub.name}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={sub.subject || undefined}>
                        {sub.subject || <span className="text-muted-foreground italic">No subject</span>}
                      </div>
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
                      <Badge variant={sub.status === 'new' ? 'default' : 'secondary'}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => { setSelectedSubmission(sub); setReplyMessage(""); setAdminNotes(sub.admin_notes || ""); setReplyDialogOpen(true); loadReplies(sub.id); }}>
                                <Reply className="w-4 h-4" />
                                {sub.unread_user_replies! > 0 && <Badge variant="destructive" className="ml-1">{sub.unread_user_replies}</Badge>}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reply to message</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedSubmission(sub); setViewDialogOpen(true); }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Message
                            </DropdownMenuItem>
                            {sub.status === 'new' ? (
                              <DropdownMenuItem onClick={() => markAsRead(sub.id)}>
                                <MailOpen className="w-4 h-4 mr-2" />
                                Mark as Read
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => markAsNew(sub.id)}>
                                <Mail className="w-4 h-4 mr-2" />
                                Mark as Unread
                              </DropdownMenuItem>
                            )}
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div><strong>From:</strong> {selectedSubmission.name} ({selectedSubmission.email})</div>
              <div><strong>Date:</strong> {format(new Date(selectedSubmission.created_at), 'PPpp')}</div>
              {selectedSubmission.subject && <div><strong>Subject:</strong> {selectedSubmission.subject}</div>}
              <div><strong>Message:</strong><p className="whitespace-pre-wrap mt-2 p-3 bg-muted rounded">{selectedSubmission.message}</p></div>
              {selectedSubmission.image_url && <img src={selectedSubmission.image_url} alt="Attachment" className="max-w-full rounded" />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reply to {selectedSubmission?.name}</DialogTitle>
            <DialogDescription>{selectedSubmission?.email}</DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              {loadingReplies ? <Loader2 className="h-4 w-4 animate-spin" /> : replies.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-muted rounded">
                  {replies.map((r) => (
                    <div key={r.id} className={`p-3 rounded ${r.sender_type === 'admin' ? 'bg-primary/10 ml-8' : 'bg-background mr-8'}`}>
                      <div className="text-sm font-medium">{r.sender_name} ({r.sender_type})</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'PPp')}</div>
                      <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <Textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Type your reply..." rows={6} />
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Admin notes (internal only)..." rows={3} />
              <Button onClick={sendReply} disabled={sending || !replyMessage.trim()}>
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <>Send Reply</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
