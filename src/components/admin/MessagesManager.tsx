import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Mail, Trash2, Eye, Check, X, Reply, RefreshCw, CheckCircle, XCircle, Globe, Inbox, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const settingsSchema = z.object({
  is_enabled: z.boolean(),
  title: z.string().min(2).max(100),
  description: z.string().min(2).max(500),
  recipient_email: z.string().email(),
  reply_from_email: z.string().email(),
  reply_from_name: z.string().min(2).max(100),
  success_message: z.string().min(2).max(500),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

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
  replied_by: string | null;
  reply_message: string | null;
  admin_notes: string | null;
  reply_count?: number;
  unread_user_replies?: number; // Count of user replies since last admin reply
  source?: string; // 'form' or 'email'
}

interface Reply {
  id: string;
  submission_id: string;
  sender_type: 'admin' | 'user';
  sender_id: string | null;
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
}

export const MessagesManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      is_enabled: true,
      title: "Contact Us",
      description: "Have questions? We'd love to hear from you.",
      recipient_email: "",
      success_message: "Thank you for contacting us! We'll get back to you soon.",
    },
  });

  useEffect(() => {
    loadSettings();
    loadSubmissions();
    
    // Subscribe to realtime changes
    const submissionsChannel = supabase
      .channel('contact_form_submissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_form_submissions'
        },
        () => {
          console.log('Contact form submission changed, reloading...');
          loadSubmissions();
        }
      )
      .subscribe();
    
    // Subscribe to replies changes
    const repliesChannel = supabase
      .channel('contact_form_replies_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_form_replies'
        },
        () => {
          console.log('Contact form reply changed, reloading...');
          loadSubmissions(); // Reload to update counts
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(repliesChannel);
    };
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("contact_form_settings")
      .select("*")
      .maybeSingle();

    if (data) {
      form.reset(data);
    }
  };

  const loadSubmissions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    
    const { data } = await supabase
      .from("contact_form_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      // Fetch ALL replies in ONE query instead of N queries
      const submissionIds = data.map(s => s.id);
      const { data: allReplies } = await supabase
        .from("contact_form_replies")
        .select("submission_id, sender_type, created_at")
        .in("submission_id", submissionIds);
      
      // Count replies client-side using JavaScript
      const replyCounts = new Map<string, { total: number; unread: number }>();
      
      data.forEach(submission => {
        const submissionReplies = allReplies?.filter(r => r.submission_id === submission.id) || [];
        const totalReplies = submissionReplies.length;
        
        // Count user replies since last admin reply
        const repliedAt = submission.replied_at || "1970-01-01";
        const unreadUserReplies = submissionReplies.filter(
          r => r.sender_type === "user" && r.created_at >= repliedAt
        ).length;
        
        replyCounts.set(submission.id, {
          total: totalReplies,
          unread: unreadUserReplies
        });
      });
      
      const submissionsWithCounts = data.map(submission => ({
        ...submission,
        reply_count: replyCounts.get(submission.id)?.total || 0,
        unread_user_replies: replyCounts.get(submission.id)?.unread || 0
      }));
      
      setSubmissions(submissionsWithCounts);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("contact_form_settings")
        .select("id")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("contact_form_settings")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contact_form_settings")
          .insert({
            is_enabled: data.is_enabled,
            title: data.title,
            description: data.description,
            recipient_email: data.recipient_email,
            success_message: data.success_message,
          });

        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Contact form settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("contact_form_submissions")
      .update({ status: "read" })
      .eq("id", id);

    if (!error) {
      loadSubmissions();
      toast({
        title: "Success",
        description: "Submission marked as read",
      });
    }
  };

  const markAsNew = async (id: string) => {
    const { error } = await supabase
      .from("contact_form_submissions")
      .update({ status: "new" })
      .eq("id", id);

    if (!error) {
      loadSubmissions();
      toast({
        title: "Success",
        description: "Submission marked as new",
      });
    }
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase
      .from("contact_form_submissions")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      loadSubmissions();
      toast({
        title: "Deleted",
        description: "Submission has been deleted.",
      });
    }
  };

  const openReplyDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setReplyMessage("");
    setAdminNotes(submission.admin_notes || "");
    setReplyDialogOpen(true);
    loadReplies(submission.id);
    
    // Mark related contact form notifications as read
    markContactNotificationsAsRead(submission.id);
  };

  const markContactNotificationsAsRead = async (submissionId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("type", ["contact_form_submission", "contact_form_reply"])
        .eq("metadata->>submission_id", submissionId)
        .eq("is_read", false);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const loadReplies = async (submissionId: string) => {
    setLoadingReplies(true);
    try {
      const { data, error } = await supabase
        .from("contact_form_replies")
        .select("*")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies((data || []) as Reply[]);
    } catch (error: any) {
      console.error("Error loading replies:", error);
      toast({
        title: "Error loading conversation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingReplies(false);
    }
  };

  const sendReply = async () => {
    if (!selectedSubmission || !replyMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-reply', {
        body: {
          submissionId: selectedSubmission.id,
          replyMessage: replyMessage.trim(),
          adminNotes: adminNotes.trim() || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Reply Sent! ✅",
        description: `Your reply has been sent to ${selectedSubmission.email}`,
      });

      setReplyDialogOpen(false);
      setReplyMessage("");
      loadReplies(selectedSubmission.id);
      loadSubmissions();
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Failed to Send Reply",
        description: error.message || "An error occurred while sending the reply",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)));
    }
  };

  const markSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("contact_form_submissions")
        .update({ status: "read" })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.size} submission(s) marked as read`,
      });

      setSelectedIds(new Set());
      loadSubmissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected submission(s)? This cannot be undone.`)) {
      return;
    }
    
    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("contact_form_submissions")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Deleted",
        description: `${selectedIds.size} submission(s) have been deleted`,
      });

      setSelectedIds(new Set());
      loadSubmissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contact Form Settings</CardTitle>
                <CardDescription>
                  Configure the contact form displayed at the bottom of every page
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {settingsOpen ? "Hide" : "Show"} Settings
                  <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Contact Form</FormLabel>
                      <FormDescription>
                        Show the contact form at the bottom of all pages
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact Us" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Have questions? We'd love to hear from you." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipient_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Where contact form submissions will be sent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reply_from_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply From Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Joy House" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name that appears in the "From" field when sending replies
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reply_from_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply From Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="hello@yourdomain.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be a verified domain in your Resend account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="success_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Success Message</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Thank you for contacting us!" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Messages</CardTitle>
                <CardDescription>
                  Messages received through the website contact form and emails sent to your domain
                </CardDescription>
              </div>
              <Button
                onClick={() => loadSubmissions(true)}
                disabled={refreshing || bulkProcessing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={markSelectedAsRead}
                    disabled={bulkProcessing}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Read
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={deleteSelected}
                    disabled={bulkProcessing}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === submissions.length && submissions.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow 
                    key={submission.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setViewDialogOpen(true);
                      if (submission.status === "new") {
                        markAsRead(submission.id);
                      }
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(submission.id)}
                        onChange={() => toggleSelection(submission.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        {(submission.status === "new" || (submission.unread_user_replies || 0) > 0) && (
                          <div className="w-2 h-2 rounded-full bg-destructive" title={
                            submission.status === "new" ? "New submission" : "New reply"
                          } />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(submission.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{submission.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        submission.message_type === "bug_report" ? "destructive" :
                        submission.message_type === "feature_request" ? "default" :
                        "secondary"
                      }>
                        {(submission.message_type || "general").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={submission.source === "email" ? "outline" : "secondary"} className="gap-1">
                        {submission.source === "email" ? (
                          <>
                            <Inbox className="h-3 w-3" />
                            Email
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3" />
                            Form
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(submission.email);
                            toast({
                              title: "Email copied",
                              description: "Email address copied to clipboard",
                            });
                          }}
                          title="Copy email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                          {submission.email}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{submission.subject || "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge variant={submission.status === "new" ? "default" : "secondary"}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubmission(submission);
                            setViewDialogOpen(true);
                            if (submission.status === "new") {
                              markAsRead(submission.id);
                            }
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReplyDialog(submission);
                          }}
                          className="gap-1"
                        >
                          <Reply className="h-3 w-3" />
                          {submission.replied_at ? "Continue" : "Reply"}
                          {submission.reply_count > 0 && (
                            <Badge variant="secondary" className="ml-1">
                              {submission.reply_count}
                            </Badge>
                          )}
                          {submission.unread_user_replies && submission.unread_user_replies > 0 && (
                            <Badge variant="destructive" className="ml-1">
                              {submission.unread_user_replies} new
                            </Badge>
                          )}
                        </Button>
                        {submission.status === "new" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(submission.id)}
                          >
                            Mark Read
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsNew(submission.id)}
                          >
                            Mark Unread
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSubmission(submission.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Form Submission</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSubmission.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-sm text-muted-foreground">{selectedSubmission.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-sm text-muted-foreground">{selectedSubmission.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <div className="mt-1">
                  <Badge variant={
                    selectedSubmission.message_type === "bug_report" ? "destructive" :
                    selectedSubmission.message_type === "feature_request" ? "default" :
                    "secondary"
                  }>
                    {(selectedSubmission.message_type || "general").replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              {selectedSubmission.subject && (
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.subject}</p>
                </div>
              )}
              
              {/* Original Message */}
              <div>
                <label className="text-sm font-medium">Original Message</label>
                <div className="mt-2 p-4 rounded-md bg-muted border-l-4 border-primary">
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <span className="font-medium">{selectedSubmission.name}</span>
                    <span>•</span>
                    <span>{format(new Date(selectedSubmission.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
              </div>
              
              {selectedSubmission.image_url && (
                <div>
                  <label className="text-sm font-medium">Attached Image</label>
                  <div className="mt-2">
                    <img 
                      src={selectedSubmission.image_url} 
                      alt="Submission attachment" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                </div>
              )}

              {/* Conversation Thread */}
              {replies.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Conversation History</label>
                  <div className="mt-2 space-y-3">
                    {replies.map((reply) => (
                      <div 
                        key={reply.id}
                        className={`p-4 rounded-md border-l-4 ${
                          reply.sender_type === 'admin' 
                            ? 'bg-green-50 border-green-500' 
                            : 'bg-blue-50 border-blue-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <span className="font-medium">{reply.sender_name}</span>
                          <Badge variant={reply.sender_type === 'admin' ? 'default' : 'secondary'} className="text-xs">
                            {reply.sender_type}
                          </Badge>
                          <span>•</span>
                          <span>{format(new Date(reply.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSubmission.admin_notes && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                  <p className="text-xs font-medium text-amber-900 mb-1">Admin Notes (Internal):</p>
                  <p className="text-xs text-amber-700">{selectedSubmission.admin_notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="mt-1">
                  <Badge variant={selectedSubmission.status === "new" ? "default" : "secondary"}>
                    {selectedSubmission.status}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="default"
                  onClick={() => {
                    setViewDialogOpen(false);
                    openReplyDialog(selectedSubmission);
                  }}
                  className="gap-2"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    markAsNew(selectedSubmission.id);
                    setViewDialogOpen(false);
                  }}
                >
                  Mark Unread
                </Button>
                <Button onClick={() => setViewDialogOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reply to {selectedSubmission?.name}</DialogTitle>
            <DialogDescription>
              Send a response to {selectedSubmission?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              {/* Conversation Thread */}
              {loadingReplies ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Original Message */}
                  <div className="p-4 rounded-md bg-muted border-l-4 border-primary">
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      <span className="font-medium">{selectedSubmission.name}</span>
                      <Badge variant="secondary" className="text-xs">user</Badge>
                      <span>•</span>
                      <span>{format(new Date(selectedSubmission.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedSubmission.message}</p>
                  </div>

                  {/* Replies Thread */}
                  {replies.map((reply) => (
                    <div 
                      key={reply.id}
                      className={`p-4 rounded-md border-l-4 ${
                        reply.sender_type === 'admin' 
                          ? 'bg-green-50 border-green-500' 
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        <span className="font-medium">{reply.sender_name}</span>
                        <Badge variant={reply.sender_type === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {reply.sender_type}
                        </Badge>
                        <span>•</span>
                        <span>{format(new Date(reply.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium">Your Reply *</label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  className="min-h-[150px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes (not sent to user)..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReplyDialogOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendReply}
                  disabled={sending || !replyMessage.trim()}
                  className="gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
