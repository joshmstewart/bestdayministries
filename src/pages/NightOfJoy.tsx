import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShareButtons } from "@/components/ShareButtons";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Star, Heart, Calendar, MapPin, Mail, Phone, Building2, CheckCircle2, Upload, X, FileText, Clock, Music, ShoppingBag, UtensilsCrossed } from "lucide-react";
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
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface AttachedFile {
  file: File;
  preview?: string;
  isImage: boolean;
}

const SPONSORSHIP_TIERS = [
  { name: "Best Day Ever Sponsor", amount: 10000, tickets: 8, socialPosts: "4 posts" },
  { name: "Best Day Ever Sponsor", amount: 5000, tickets: 6, socialPosts: "3 posts" },
  { name: "Bestie Champion", amount: 2500, tickets: 4, socialPosts: "2 posts" },
  { name: "Joy Builder", amount: 1000, tickets: 2, socialPosts: "2 posts" },
  { name: "Heart of Joy", amount: 500, tickets: 0, socialPosts: "1 post" },
  { name: "Shine", amount: 250, tickets: 0, socialPosts: "1 post" },
];

const BENEFITS = [
  { label: "Exclusive top sponsor recognition on event materials", tiers: [true, false, false, false, false, false] },
  { label: "Verbal recognition during the live event", tiers: [true, true, false, false, false, false] },
  { label: "Featured on event promotional materials", tiers: [true, true, true, true, false, false] },
  { label: "Logo on Best Day Ministries website", tiers: [true, true, true, true, true, false] },
  { label: "Social media recognition", tiers: SPONSORSHIP_TIERS.map(t => t.socialPosts) },
  { label: "Recognition in printed program", tiers: [true, true, true, true, true, true] },
  { label: "Event tickets included", tiers: SPONSORSHIP_TIERS.map(t => t.tickets) },
  { label: "Tax deductible donation", tiers: [true, true, true, true, true, true] },
];

const EVENT_DATE = new Date("2026-06-14T17:00:00");
const DEADLINE_DATE = new Date("2026-05-04T23:59:59");

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: false });
  useEffect(() => {
    const calc = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        passed: false,
      };
    };
    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

const NightOfJoy = () => {
  const { profile, user } = useAuth();
  const eventCountdown = useCountdown(EVENT_DATE);
  const deadlineCountdown = useCountdown(DEADLINE_DATE);
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    selectedTier: "",
    paymentMethod: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill name and email from logged-in user
  useEffect(() => {
    if (profile || user) {
      setFormData(prev => ({
        ...prev,
        contactName: prev.contactName || profile?.display_name || '',
        email: prev.email || user?.email || '',
      }));
    }
  }, [profile, user]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadFiles = async () => {
    const uploaded: { name: string; url: string; type: string; size: number }[] = [];
    for (const { file, isImage } of attachedFiles) {
      let fileToUpload: File | Blob = file;
      if (isImage) {
        try { fileToUpload = await compressImage(file); } catch { fileToUpload = file; }
      }
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_');
      const fileName = `${Date.now()}-${sanitizedName || 'file'}`;
      const { data: uploadData, error } = await supabase.storage
        .from("app-assets")
        .upload(`contact-form/${fileName}`, fileToUpload);
      if (error) { console.error("Upload error:", error); continue; }
      const { data: { publicUrl } } = supabase.storage.from("app-assets").getPublicUrl(uploadData.path);
      uploaded.push({ name: file.name, url: publicUrl, type: file.type, size: file.size });
    }
    return uploaded;
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_FILES - attachedFiles.length;
    if (files.length > remaining) {
      toast.error(`You can attach up to ${MAX_FILES} files. ${remaining} slot(s) remaining.`);
    }
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} exceeds 10MB limit.`); continue; }
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) { toast.error(`${file.name} is not a supported format.`); continue; }
      const isImage = file.type.startsWith("image/");
      const attached: AttachedFile = { file, isImage };
      if (isImage) {
        const reader = new FileReader();
        reader.onloadend = () => { attached.preview = reader.result as string; setAttachedFiles(prev => [...prev, attached]); };
        reader.readAsDataURL(file);
      } else {
        setAttachedFiles(prev => [...prev, attached]);
      }
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactName || !formData.email) {
      toast.error("Please fill in your name and email.");
      return;
    }
    setSubmitting(true);
    try {
      let uploadedAttachments: { name: string; url: string; type: string; size: number }[] = [];
      if (attachedFiles.length > 0) {
        try {
          uploadedAttachments = await uploadFiles();
          console.log("Uploaded attachments:", uploadedAttachments.length, "of", attachedFiles.length);
        } catch (uploadErr: any) {
          console.error("File upload failed:", uploadErr);
          toast.error(`File upload failed: ${uploadErr.message}. Submitting without attachments.`);
          // Continue without attachments rather than failing entirely
        }
      }
      const { error } = await supabase.from("contact_form_submissions").insert({
        name: formData.contactName,
        email: formData.email,
        subject: `Night of Joy Sponsorship - ${formData.selectedTier || 'General Inquiry'}`,
        message: `Business: ${formData.businessName}\nPhone: ${formData.phone}\nAddress: ${formData.address}\nPayment Method: ${formData.paymentMethod}\n\n${formData.message}`,
        source: "night-of-joy",
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
      } as any);
      if (error) {
        console.error("Contact form insert error:", error);
        throw error;
      }
      setSubmitted(true);
      toast.success("Thank you! We'll be in touch soon.");
    } catch (err: any) {
      console.error("Night of Joy form submission error:", err);
      toast.error("Something went wrong. Please try again or email Marla@joyhousestore.com");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="A Night of Joy – Best Day Ministries Fundraiser"
        description="Join us June 14, 2026 for A Night of Joy at Truitt Homestead. Dinner, live entertainment & silent auction for adults with special abilities."
        image="/images/night-of-joy-og.jpg"
      />
      <UnifiedHeader />

      <main className="flex-1 pt-14">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24 text-center" style={{ background: "var(--gradient-hero)" }}>
          <div className="container max-w-4xl mx-auto px-4 relative z-10">
            <p className="text-primary-foreground/80 text-sm uppercase tracking-widest mb-2">
              Hosted by Best Day Ministries
            </p>
            <p className="text-primary-foreground/70 text-sm mb-6">
              Home of Joy House & Best Day Ever Coffee & Crepes
            </p>
            <h1 className="font-script text-5xl md:text-7xl text-primary-foreground mb-4 drop-shadow-lg">
              A Night of Joy
            </h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-secondary" />
              <p className="text-xl md:text-2xl font-bold text-primary-foreground">
                Sunday, June 14<sup>th</sup>, 2026
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-secondary" />
              <p className="text-primary-foreground/80">5:00 PM – 8:00 PM MST</p>
              <span className="text-primary-foreground/40 mx-1">•</span>
              <MapPin className="w-4 h-4 text-secondary" />
              <p className="text-primary-foreground/80">Truitt Homestead</p>
            </div>
            <p className="text-primary-foreground/90 text-lg max-w-2xl mx-auto">
              A Fundraiser that creates belonging, and purpose for adults with special abilities.
            </p>

            {/* Countdown Timer */}
            {!eventCountdown.passed && (
              <div className="mt-8 flex justify-center gap-3 sm:gap-4">
                {[
                  { value: eventCountdown.days, label: "Days" },
                  { value: eventCountdown.hours, label: "Hours" },
                  { value: eventCountdown.minutes, label: "Min" },
                  { value: eventCountdown.seconds, label: "Sec" },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-primary-foreground/15 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3 min-w-[60px]">
                    <span className="text-2xl sm:text-3xl font-bold text-primary-foreground tabular-nums">
                      {String(value).padStart(2, "0")}
                    </span>
                    <p className="text-[10px] sm:text-xs text-primary-foreground/70 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Share Buttons */}
            <div className="mt-6">
              <ShareButtons
                title="A Night of Joy – Best Day Ministries Fundraiser"
                description="Join us June 14, 2026 for dinner, live entertainment & silent auction creating belonging for adults with special abilities."
                url="https://bestdayministries.org/night-of-joy"
                pageId="night-of-joy"
                hashtags={["NightOfJoy", "BestDayMinistries"]}
              />
            </div>

            <div className="flex justify-center mt-4">
              <div className="flex items-center gap-1">
                <span className="h-px w-12 bg-secondary/60" />
                <Star className="w-4 h-4 text-secondary fill-secondary" />
                <Star className="w-5 h-5 text-secondary fill-secondary" />
                <Star className="w-4 h-4 text-secondary fill-secondary" />
                <span className="h-px w-12 bg-secondary/60" />
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-12 md:py-16 bg-card">
          <div className="container max-w-3xl mx-auto px-4 text-center space-y-6">
            <p className="text-foreground leading-relaxed">
              Without the generosity of donors like you, our organization and programs for adults with special abilities and their families would not be possible. Your tax-deductible support helps create meaningful employment, community connection, and life-giving opportunities that foster confidence and belonging.
            </p>
            <p className="text-foreground leading-relaxed">
              Together, we can continue building a community where every person is seen, valued, and celebrated.
            </p>
            <p className="text-muted-foreground italic">
              Thank you for partnering with us to make this impact possible.
            </p>
          </div>
        </section>

        {/* Event Details Section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-8">What to Expect</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {[
                { icon: UtensilsCrossed, title: "Dinner & Drinks", desc: "A catered evening of great food and refreshments" },
                { icon: Music, title: "Live Entertainment", desc: "Enjoy live music and performances throughout the evening" },
                { icon: ShoppingBag, title: "Silent Auction", desc: "Bid on unique items to support Best Day Ministries" },
              ].map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="text-center border-border">
                  <CardContent className="pt-6 pb-5 space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sponsorship Deadline Countdown */}
            {!deadlineCountdown.passed && (
              <div className="text-center bg-card border border-primary/20 rounded-xl p-6">
                <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Sponsorship Deadline — May 4, 2026</p>
                <div className="flex justify-center gap-3">
                  {[
                    { value: deadlineCountdown.days, label: "Days" },
                    { value: deadlineCountdown.hours, label: "Hours" },
                    { value: deadlineCountdown.minutes, label: "Min" },
                  ].map(({ value, label }) => (
                    <div key={label} className="bg-primary/10 rounded-lg px-4 py-2 min-w-[60px]">
                      <span className="text-2xl font-bold text-primary tabular-nums">{String(value).padStart(2, "0")}</span>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sponsorship Levels & Benefits Table */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-8">
              Sponsorship Levels & Benefits
            </h2>
            <Card className="overflow-hidden border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead className="min-w-[200px] font-bold text-foreground">Benefit</TableHead>
                        {SPONSORSHIP_TIERS.map((tier) => (
                          <TableHead key={tier.amount} className="text-center min-w-[80px]">
                            <span className="font-bold text-foreground">${tier.amount.toLocaleString()}</span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {BENEFITS.map((benefit, i) => (
                        <TableRow key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                          <TableCell className="font-medium text-foreground">{benefit.label}</TableCell>
                          {benefit.tiers.map((val, j) => (
                            <TableCell key={j} className="text-center">
                              {val === true ? (
                                <CheckCircle2 className="w-5 h-5 text-primary mx-auto" />
                              ) : val === false ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className="text-foreground font-medium">{val}</span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Sponsorship Form */}
        <section className="py-12 md:py-16 bg-card">
          <div className="container max-w-2xl mx-auto px-4">
            <div className="text-center mb-8">
              <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
              <h2 className="text-3xl font-bold text-foreground mb-2">Become a Sponsor</h2>
              <p className="text-muted-foreground">
                Complete the form below and we'll be in touch to finalize your sponsorship.
              </p>
            </div>

            {submitted ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-8 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                  <h3 className="text-2xl font-bold text-foreground">Thank You!</h3>
                  <p className="text-muted-foreground">
                    We've received your sponsorship interest and will be in touch soon. You can also reach us directly at{" "}
                    <a href="mailto:Marla@joyhousestore.com" className="text-primary hover:underline">
                      Marla@joyhousestore.com
                    </a>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sponsorship Level Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">Sponsorship Level</Label>
                  <p className="text-sm text-muted-foreground">Not sure yet? No problem — select "Just Inquiring" and we'll help you find the right fit.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SPONSORSHIP_TIERS.map((tier) => (
                      <button
                        key={tier.amount}
                        type="button"
                        onClick={() => handleChange("selectedTier", `${tier.name} - $${tier.amount.toLocaleString()}`)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.selectedTier === `${tier.name} - $${tier.amount.toLocaleString()}`
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <span className="font-bold text-foreground">{tier.name}</span>
                        <span className="block text-lg font-bold text-primary">
                          ${tier.amount.toLocaleString()}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleChange("selectedTier", "Just Inquiring")}
                      className={`sm:col-span-2 py-2 px-4 rounded-lg border-2 text-center transition-all ${
                        formData.selectedTier === "Just Inquiring"
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <span className="font-bold text-foreground">Just Inquiring</span>
                      <span className="text-sm text-muted-foreground ml-2">— I'd like to learn more</span>
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">Payment Preference</Label>
                  <div className="flex flex-wrap gap-3">
                    {["Credit Card", "Invoice me", "Check"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => handleChange("paymentMethod", method)}
                        className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                          formData.paymentMethod === method
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <div className="relative">
                      <Input
                        id="contactName"
                        value={formData.contactName}
                        onChange={(e) => handleChange("contactName", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business / Organization</Label>
                    <div className="relative">
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => handleChange("businessName", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Additional Notes</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    rows={3}
                    placeholder="Anything else you'd like us to know?"
                  />
                </div>

                {/* File Attachments */}
                <div className="space-y-3">
                  <Label>Attachments (e.g. company logo)</Label>
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
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_EXTENSIONS}
                        onChange={handleFilesChange}
                        className="hidden"
                        id="noj-file-upload"
                        multiple
                      />
                      <label htmlFor="noj-file-upload" className="cursor-pointer">
                        <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to attach files
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, SVG, PDF, DOCX — up to 10MB each, {MAX_FILES} max
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Sponsorship Interest"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Please submit by May 4th, 2026.
                  <br />
                  Contact: <a href="mailto:Marla@joyhousestore.com" className="text-primary hover:underline">Marla@joyhousestore.com</a>
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NightOfJoy;
