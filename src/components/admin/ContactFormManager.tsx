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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Mail, Trash2, Eye, Check, X, Reply } from "lucide-react";
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
}

export const ContactFormManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [sending, setSending] = useState(false);

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

  const loadSubmissions = async () => {
    const { data } = await supabase
      .from("contact_form_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setSubmissions(data);
    }
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

    if (!error) {
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
      setAdminNotes("");
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Form Settings</CardTitle>
          <CardDescription>
            Configure the contact form displayed at the bottom of every page
          </CardDescription>
        </CardHeader>
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
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Form Submissions</CardTitle>
          <CardDescription>
            View and manage messages received through the contact form
          </CardDescription>
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
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
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
                      <div className="flex items-center justify-center">
                        {submission.status === "new" && (
                          <div className="w-2 h-2 rounded-full bg-destructive" title="New submission" />
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
                          disabled={!!submission.replied_at}
                        >
                          <Reply className="h-3 w-3" />
                          {submission.replied_at ? "Replied" : "Reply"}
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
        <DialogContent className="max-w-2xl">
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
              <div>
                <label className="text-sm font-medium">Message</label>
                <div className="mt-1 p-4 rounded-md bg-muted">
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
              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="mt-1">
                  <Badge variant={selectedSubmission.status === "new" ? "default" : "secondary"}>
                    {selectedSubmission.status}
                  </Badge>
                </div>
              </div>
              {selectedSubmission.replied_at && (
                <div className="p-4 rounded-md bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <label className="text-sm font-medium text-green-900">Reply Sent</label>
                  </div>
                  <p className="text-sm text-green-700">
                    {format(new Date(selectedSubmission.replied_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                  {selectedSubmission.reply_message && (
                    <div className="mt-2 p-3 rounded bg-white border border-green-100">
                      <p className="text-sm whitespace-pre-wrap">{selectedSubmission.reply_message}</p>
                    </div>
                  )}
                  {selectedSubmission.admin_notes && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-800">Admin Notes:</p>
                      <p className="text-xs text-green-600 mt-1">{selectedSubmission.admin_notes}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                {!selectedSubmission.replied_at && (
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
                )}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to {selectedSubmission?.name}</DialogTitle>
            <DialogDescription>
              Send a response to {selectedSubmission?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-muted">
                <p className="text-sm font-medium mb-2">Original Message:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedSubmission.message}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Reply *</label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  className="min-h-[200px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes (not sent to user)..."
                  className="min-h-[100px]"
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
