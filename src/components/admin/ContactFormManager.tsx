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
import { Loader2, Save, Mail, Trash2 } from "lucide-react";
import { format } from "date-fns";

const settingsSchema = z.object({
  is_enabled: z.boolean(),
  title: z.string().min(2).max(100),
  description: z.string().min(2).max(500),
  recipient_email: z.string().email(),
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
}

export const ContactFormManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

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
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {format(new Date(submission.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{submission.name}</TableCell>
                    <TableCell>
                      <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                        {submission.email}
                      </a>
                    </TableCell>
                    <TableCell>{submission.subject || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={submission.status === "new" ? "default" : "secondary"}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {submission.status === "new" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(submission.id)}
                            title="Mark as Read"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsNew(submission.id)}
                            title="Mark as New"
                          >
                            <Mail className="h-4 w-4 text-primary" />
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
    </div>
  );
};
