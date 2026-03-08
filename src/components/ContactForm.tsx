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
import { Loader2, Send, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

const ACCEPTED_FILE_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.svg,.pdf,.docx,.doc,.txt,.xlsx,.csv";
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  message_type: z.enum(["bug_report", "feature_request", "general", "question", "feedback"]),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormSettings {
  is_enabled: boolean;
  title: string;
  description: string;
  success_message: string;
}

interface AttachedFile {
  file: File;
  preview?: string;
  isImage: boolean;
}

export const ContactForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ContactFormSettings | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

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

  const uploadFiles = async (): Promise<{ name: string; url: string; type: string; size: number }[]> => {
    const uploaded: { name: string; url: string; type: string; size: number }[] = [];

    for (const { file, isImage } of attachedFiles) {
      let fileToUpload: File | Blob = file;
      
      // Compress images
      if (isImage) {
        try {
          fileToUpload = await compressImage(file);
        } catch {
          fileToUpload = file;
        }
      }

      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      const fileName = `${Date.now()}-${sanitizedName || 'file'}`;

      const { data: uploadData, error } = await supabase.storage
        .from("app-assets")
        .upload(`contact-form/${fileName}`, fileToUpload);

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("app-assets")
        .getPublicUrl(uploadData.path);

      uploaded.push({
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    return uploaded;
  };

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      // Upload all files
      const uploadedAttachments = attachedFiles.length > 0 ? await uploadFiles() : [];
      
      // Use first image as image_url for backward compatibility
      const firstImage = uploadedAttachments.find(a => a.type.startsWith("image/"));

      // Save to database
      const { error: dbError } = await supabase
        .from("contact_form_submissions")
        .insert({
          name: data.name,
          email: data.email,
          subject: data.subject || null,
          message: data.message,
          message_type: data.message_type,
          image_url: firstImage?.url || null,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
        } as any);

      if (dbError) throw dbError;

      // Send admin notification email
      try {
        const { error: notifyError } = await supabase.functions.invoke("notify-admin-new-contact", {
          body: { userEmail: data.email },
        });
        if (notifyError) console.error("Admin notification error:", notifyError);
      } catch (notifyError) {
        console.error("Admin notification not sent:", notifyError);
      }

      toast({
        title: "Message sent!",
        description: settings?.success_message || "Thank you for contacting us! We'll get back to you soon.",
      });

      form.reset();
      setAttachedFiles([]);
    } catch (error: any) {
      console.error("Contact form error:", error);
      const errorMessage = error?.message || error?.error_description || "Unknown error";
      const isStorageError = errorMessage.includes("storage") || errorMessage.includes("upload") || errorMessage.includes("Bucket");
      toast({
        title: "Error",
        description: isStorageError 
          ? "Failed to upload file(s). Please try again or submit without attachments."
          : `Failed to send message: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_FILES - attachedFiles.length;

    if (files.length > remaining) {
      toast({
        title: "Too many files",
        description: `You can attach up to ${MAX_FILES} files. ${remaining} slot(s) remaining.`,
        variant: "destructive",
      });
    }

    const newFiles = files.slice(0, remaining);
    
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported format.`,
          variant: "destructive",
        });
        continue;
      }

      const isImage = file.type.startsWith("image/");
      const attached: AttachedFile = { file, isImage };

      if (isImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          attached.preview = reader.result as string;
          setAttachedFiles(prev => [...prev, attached]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachedFiles(prev => [...prev, attached]);
      }
    }

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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

              {/* File Attachments */}
              <div className="space-y-3">
                <FormLabel>Attachments (Optional)</FormLabel>
                
                {/* Attached files preview */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {attachedFiles.map((af, i) => (
                      <div key={i} className="relative group border rounded-lg overflow-hidden bg-card">
                        {af.isImage && af.preview ? (
                          <img src={af.preview} alt={af.file.name} className="w-20 h-20 object-cover" />
                        ) : (
                          <div className="w-20 h-20 flex flex-col items-center justify-center p-2">
                            <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                            <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                              {af.file.name.split('.').pop()?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {attachedFiles.length < MAX_FILES && (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <Input
                      type="file"
                      accept={ACCEPTED_EXTENSIONS}
                      onChange={handleFilesChange}
                      className="hidden"
                      id="file-upload"
                      multiple
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to attach files
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, WEBP, SVG, PDF, DOCX — up to 10MB each, {MAX_FILES} max
                      </p>
                    </label>
                  </div>
                )}
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
