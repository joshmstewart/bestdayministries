import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  message_type: z.enum(["bug_report", "feature_request", "general", "question", "feedback"]),
  image: z.instanceof(File).optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormSettings {
  is_enabled: boolean;
  title: string;
  description: string;
  success_message: string;
}

export const ContactForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ContactFormSettings | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      message_type: "general",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("contact_form_settings")
        .select("*")
        .eq("is_enabled", true)
        .maybeSingle();
      
      if (data) {
        setSettings(data);
      }
    };
    loadSettings();
  }, []);

  // Autofill name and email for logged-in users
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        form.setValue("email", user.email, { shouldValidate: false });
        
        // Also try to get display name from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile?.display_name) {
          form.setValue("name", profile.display_name, { shouldValidate: false });
        }
      }
    };
    loadUserData();
  }, [form]);

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (data.image) {
        const compressedFile = await compressImage(data.image);
        // Sanitize filename: remove spaces and special characters, keep only alphanumeric, dashes, underscores, and dots
        // IMPORTANT: Get original filename from data.image since compressImage may return original file unchanged
        const originalName = data.image.name;
        const sanitizedName = originalName
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
        const fileName = `${Date.now()}-${sanitizedName || 'image.jpg'}`;
        console.log('[ContactForm] Upload filename:', fileName); // Debug log
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`contact-form/${fileName}`, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("app-assets")
          .getPublicUrl(uploadData.path);
        
        imageUrl = publicUrl;
      }

      // Save to database
      const { error: dbError } = await supabase
        .from("contact_form_submissions")
        .insert({
          name: data.name,
          email: data.email,
          subject: data.subject || null,
          message: data.message,
          message_type: data.message_type,
          image_url: imageUrl,
        });

      if (dbError) throw dbError;

      // Send admin notification email (edge function will query the latest submission)
      try {
        const { error: notifyError } = await supabase.functions.invoke("notify-admin-new-contact", {
          body: { userEmail: data.email },
        });

        if (notifyError) {
          console.error("Admin notification error:", notifyError);
          // Don't throw - form was saved successfully
        }
      } catch (notifyError) {
        console.error("Admin notification not sent:", notifyError);
        // Continue - form submission was successful
      }

      toast({
        title: "Message sent!",
        description: settings?.success_message || "Thank you for contacting us! We'll get back to you soon.",
      });

      form.reset();
      setImagePreview(null);
    } catch (error: any) {
      console.error("Contact form error:", error);
      const errorMessage = error?.message || error?.error_description || "Unknown error";
      const isStorageError = errorMessage.includes("storage") || errorMessage.includes("upload") || errorMessage.includes("Bucket");
      toast({
        title: "Error",
        description: isStorageError 
          ? "Failed to upload image. Please try again or submit without an attachment."
          : `Failed to send message: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("image", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    form.setValue("image", undefined);
    setImagePreview(null);
  };

  if (!settings?.is_enabled) return null;

  return (
    <div className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {settings.title}
            </h2>
            <p className="text-muted-foreground">
              {settings.description}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="message_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select message type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="bug_report">Bug Report</SelectItem>
                          <SelectItem value="feature_request">Feature Request</SelectItem>
                          <SelectItem value="question">Question</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="What's this about?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us more..."
                        className="min-h-[150px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Attach Screenshot (Optional)</FormLabel>
                <div className="flex flex-col gap-4">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-full h-auto max-h-48 rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload an image
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};
