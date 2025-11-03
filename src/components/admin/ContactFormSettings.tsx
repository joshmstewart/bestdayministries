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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

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

export default function ContactFormSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      is_enabled: true,
      title: "Contact Us",
      description: "Have questions? We'd love to hear from you.",
      recipient_email: "",
      reply_from_email: "",
      reply_from_name: "Joy House",
      success_message: "Thank you for contacting us! We'll get back to you soon.",
    },
  });

  useEffect(() => {
    loadSettings();
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
          .insert([{
            is_enabled: data.is_enabled,
            title: data.title,
            description: data.description,
            recipient_email: data.recipient_email,
            reply_from_email: data.reply_from_email,
            reply_from_name: data.reply_from_name,
            success_message: data.success_message,
          }]);

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

  return (
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
  );
}
