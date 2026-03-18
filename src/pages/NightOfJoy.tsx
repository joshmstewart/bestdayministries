import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
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
import { Star, Heart, Calendar, MapPin, CheckCircle2, Upload, X, FileText, Clock, Music, ShoppingBag, UtensilsCrossed, CreditCard, MessageSquare, Loader2, DollarSign, Sparkles, Ticket, ArrowLeft, Minus, Plus } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import farmTableBg from "@/assets/background_farmtable.png";

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

const EVENT_DATE = new Date("2026-06-14T16:00:00");
const DEADLINE_DATE = new Date("2026-05-04T23:59:59");

const DEFAULT_TICKET_PRICES: Record<string, number> = {
  general: 60, kids: 40, bestie: 40, "little-ones": 0,
};

const TICKET_TIER_LABELS: { id: string; label: string }[] = [
  { id: "general", label: "General Admission (13+)" },
  { id: "kids", label: "Kids (6–12)" },
  { id: "bestie", label: "Besties" },
  { id: "little-ones", label: "Little Ones (5 & under)" },
];

type TicketTierId = "general" | "kids" | "bestie" | "little-ones";

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

type PageView = "choose" | "tickets" | "sponsor";
type FormMode = "inquire" | "pay";

const NightOfJoy = () => {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const eventCountdown = useCountdown(EVENT_DATE);
  const deadlineCountdown = useCountdown(DEADLINE_DATE);
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>(DEFAULT_TICKET_PRICES);

  useEffect(() => {
    supabase.from("app_settings").select("setting_value").eq("setting_key", "noj_ticket_prices").maybeSingle()
      .then(({ data }) => {
        if (data?.setting_value && typeof data.setting_value === "object") {
          setTicketPrices(prev => ({ ...prev, ...(data.setting_value as Record<string, number>) }));
        }
      });
  }, []);

  const TICKET_TIERS = TICKET_TIER_LABELS.map(t => ({ ...t, price: ticketPrices[t.id] ?? 0 }));

  const paymentSuccess = searchParams.get("payment") === "success";
  const paymentType = searchParams.get("type");

  const [pageView, setPageView] = useState<PageView>(paymentSuccess ? (paymentType === "ticket" ? "tickets" : "sponsor") : "choose");
  const [formMode, setFormMode] = useState<FormMode>("inquire");
  const [formData, setFormData] = useState({
    businessName: "",
    contactFirstName: "",
    contactLastName: "",
    phone: "",
    email: "",
    selectedTier: "",
    paymentMethod: "",
    message: "",
  });
  const [customAmount, setCustomAmount] = useState("");
  const [ticketCounts, setTicketCounts] = useState<Record<TicketTierId, number>>({
    general: 0, kids: 0, bestie: 0, "little-ones": 0,
  });
  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketFirstName, setTicketFirstName] = useState("");
  const [ticketLastName, setTicketLastName] = useState("");

  const updateTierCount = (tierId: TicketTierId, delta: number) => {
    setTicketCounts(prev => ({
      ...prev,
      [tierId]: Math.max(0, Math.min(10, prev[tierId] + delta)),
    }));
  };

  const totalTickets = Object.values(ticketCounts).reduce((s, c) => s + c, 0);
  const paidTotal = TICKET_TIERS.reduce((s, t) => s + t.price * ticketCounts[t.id], 0);
  const hasFreeOnly = paidTotal === 0 && totalTickets > 0;
  const hasAnyPaid = paidTotal > 0;

  // Stripe fee calculation: (amount + 0.30) / 0.971
  const calculateFeeTotal = (amount: number) => Math.round(((amount + 0.30) / 0.971) * 100) / 100;
  const ticketFee = paidTotal > 0 ? +(calculateFeeTotal(paidTotal) - paidTotal).toFixed(2) : 0;
  const ticketTotalWithFee = paidTotal > 0 ? calculateFeeTotal(paidTotal) : 0;
  const [submitting, setSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (profile || user) {
      setFormData(prev => ({
        ...prev,
        contactFirstName: prev.contactFirstName || profile?.first_name || '',
        contactLastName: prev.contactLastName || profile?.last_name || '',
        email: prev.email || user?.email || '',
      }));
      setTicketEmail(prev => prev || user?.email || '');
      setTicketFirstName(prev => prev || profile?.first_name || '');
      setTicketLastName(prev => prev || profile?.last_name || '');
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

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactFirstName || !formData.contactLastName || !formData.email) {
      toast.error("Please fill in your first name, last name, and email.");
      return;
    }
    setSubmitting(true);
    try {
      let uploadedAttachments: { name: string; url: string; type: string; size: number }[] = [];
      if (attachedFiles.length > 0) {
        try { uploadedAttachments = await uploadFiles(); } catch (uploadErr: any) {
          console.error("File upload failed:", uploadErr);
          toast.error(`File upload failed: ${uploadErr.message}. Submitting without attachments.`);
        }
      }
      const { error } = await supabase.from("contact_form_submissions").insert({
        name: `${formData.contactFirstName} ${formData.contactLastName}`.trim(),
        email: formData.email,
        subject: `Night of Joy Sponsorship - ${formData.selectedTier || 'General Inquiry'}`,
        message: `Business: ${formData.businessName}\nPhone: ${formData.phone}\nPayment Method: ${formData.paymentMethod}\n\n${formData.message}`,
        source: "night-of-joy",
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
      } as any);
      if (error) throw error;
      setSubmitted(true);
      toast.success("Thank you! We'll be in touch soon.");
    } catch (err: any) {
      console.error("Night of Joy form submission error:", err);
      toast.error("Something went wrong. Please try again or email Marla@joyhousestore.com");
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentAmount = (): number | null => {
    const selectedTierObj = SPONSORSHIP_TIERS.find(
      t => formData.selectedTier === `${t.name} - $${t.amount.toLocaleString()}`
    );
    if (selectedTierObj) return selectedTierObj.amount;
    const custom = parseFloat(customAmount);
    if (!isNaN(custom) && custom >= 1) return custom;
    return null;
  };

  const isCustomDonation = (): boolean => {
    const amount = getPaymentAmount();
    if (!amount) return false;
    const isCustom = !SPONSORSHIP_TIERS.find(
      t => formData.selectedTier === `${t.name} - $${t.amount.toLocaleString()}`
    );
    return isCustom && amount < 250;
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Please enter your email address.");
      return;
    }
    const amount = getPaymentAmount();
    if (!amount) {
      toast.error("Please select a sponsorship level or enter an amount.");
      return;
    }
    setSubmitting(true);
    try {
      const selectedTierObj = SPONSORSHIP_TIERS.find(
        t => formData.selectedTier === `${t.name} - $${t.amount.toLocaleString()}`
      );
      const { data, error } = await supabase.functions.invoke("create-noj-checkout", {
        body: {
          amount,
          tier_name: selectedTierObj ? `${selectedTierObj.name} - $${selectedTierObj.amount.toLocaleString()}` : undefined,
          email: formData.email,
          contact_name: `${formData.contactFirstName} ${formData.contactLastName}`.trim() || undefined,
          business_name: formData.businessName || undefined,
          cover_stripe_fee: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Failed to start payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTicketPurchase = async () => {
    if (!ticketEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    if (totalTickets === 0) {
      toast.error("Please select at least one ticket.");
      return;
    }

    // Build ticket items array from counts
    const ticketItems = TICKET_TIERS
      .filter(t => ticketCounts[t.id] > 0)
      .map(t => ({ tier: t.id, quantity: ticketCounts[t.id], unit_price: t.price }));

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-noj-ticket-checkout", {
        body: {
          ticket_items: ticketItems,
          email: ticketEmail,
          contact_name: `${ticketFirstName} ${ticketLastName}`.trim() || undefined,
          cover_stripe_fee: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.free) {
        toast.success(`${totalTickets} free ticket${totalTickets > 1 ? "s" : ""} registered!`);
        setPageView("choose");
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Ticket purchase error:", err);
      toast.error(err.message || "Failed to process tickets. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToContent = () => {
    document.getElementById("action-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Shared input classes
  const inputClasses = "bg-[#2a1e14] border-amber-800/40 text-amber-100 placeholder:text-amber-200/30 focus-visible:ring-amber-500";

  return (
    <div className="min-h-screen flex flex-col bg-[#1a120b]">
      <SEOHead
        title="A Night of Joy – Best Day Ministries Fundraiser"
        description="Join us June 14, 2026 for A Night of Joy at Truitt Homestead. Dinner, live entertainment & silent auction for adults with special abilities."
        image="/images/night-of-joy-og.jpg"
      />
      <UnifiedHeader />

      <main className="flex-1 pt-14">
        {/* ============ HERO ============ */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          <img
            src={farmTableBg}
            alt="Rustic farm table set for dinner at sunset with candles, sunflowers, and string lights"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <p className="text-amber-200/80 text-xs sm:text-sm uppercase tracking-[0.3em] mb-3 font-medium">
              Best Day Ministries presents
            </p>
            <h1 className="font-script text-6xl sm:text-7xl md:text-8xl text-white mb-4 drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              A Night of Joy
            </h1>
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="h-px w-10 bg-amber-400/50" />
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="h-px w-10 bg-amber-400/50" />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 mt-4 text-white/90">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-300" />
                <span className="text-lg font-semibold">Sunday, June 14<sup>th</sup>, 2026</span>
              </div>
              <span className="hidden sm:inline text-amber-400/50">•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-300" />
                <span className="text-sm">4:00 PM – 7:00 PM MST</span>
              </div>
            </div>
            <div className="flex flex-col items-center mt-2 text-white/80">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-300" />
                <span className="text-sm">Truitt Homestead</span>
              </div>
              <span className="text-xs text-white/60">10652 County Rd 15, Firestone, CO 80504</span>
            </div>

            {!eventCountdown.passed && (
              <div className="mt-8 flex justify-center gap-3">
                {[
                  { value: eventCountdown.days, label: "Days" },
                  { value: eventCountdown.hours, label: "Hours" },
                  { value: eventCountdown.minutes, label: "Min" },
                  { value: eventCountdown.seconds, label: "Sec" },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-black/40 backdrop-blur-md border border-amber-400/20 rounded-lg px-3 py-2 sm:px-4 sm:py-3 min-w-[60px]">
                    <span className="text-2xl sm:text-3xl font-bold text-amber-100 tabular-nums">
                      {String(value).padStart(2, "0")}
                    </span>
                    <p className="text-[10px] text-amber-300/70 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-8 text-amber-100/80 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              A fundraiser creating belonging and purpose for adults with special abilities.
            </p>

            <Button
              size="lg"
              className="mt-6 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/30 border border-amber-500/30"
              onClick={scrollToContent}
            >
              Get Involved
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1a120b] to-transparent" />
        </section>

        {/* ============ MISSION ============ */}
        <section className="py-16 md:py-20 bg-[#1a120b]">
          <div className="container max-w-3xl mx-auto px-4 text-center space-y-6">
            <div className="flex justify-center gap-1 mb-2">
              <span className="h-px w-12 bg-amber-700/50 self-center" />
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="h-px w-12 bg-amber-700/50 self-center" />
            </div>
            <p className="text-amber-100/90 leading-relaxed text-lg">
              Without the generosity of donors like you, our organization and programs for adults with special abilities and their families would not be possible. Your tax-deductible support helps create meaningful employment, community connection, and life-giving opportunities that foster confidence and belonging.
            </p>
            <p className="text-amber-100/90 leading-relaxed text-lg">
              Together, we can continue building a community where every person is seen, valued, and celebrated.
            </p>
            <p className="text-amber-400/70 italic text-base">
              Thank you for partnering with us to make this impact possible.
            </p>
          </div>
        </section>

        {/* ============ WHAT TO EXPECT ============ */}
        <section className="py-16 md:py-20 bg-[#231811] border-t border-amber-900/30">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-amber-100 mb-10">What to Expect</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {[
                { icon: UtensilsCrossed, title: "Dinner & Drinks", desc: "A catered evening of great food and refreshments" },
                { icon: Music, title: "Live Entertainment", desc: "Enjoy live music and performances throughout the evening" },
                { icon: ShoppingBag, title: "Silent Auction", desc: "Bid on unique items to support Best Day Ministries" },
              ].map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="text-center bg-[#2a1e14] border-amber-800/30 shadow-lg">
                  <CardContent className="pt-6 pb-5 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-amber-600/15 border border-amber-600/20 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-amber-400" />
                    </div>
                    <h3 className="font-bold text-amber-100 text-lg">{title}</h3>
                    <p className="text-sm text-amber-200/60">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!deadlineCountdown.passed && (
              <div className="text-center bg-[#2a1e14] border border-amber-700/30 rounded-xl p-6">
                <p className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3">Sponsorship Deadline — May 4, 2026</p>
                <div className="flex justify-center gap-3">
                  {[
                    { value: deadlineCountdown.days, label: "Days" },
                    { value: deadlineCountdown.hours, label: "Hours" },
                    { value: deadlineCountdown.minutes, label: "Min" },
                  ].map(({ value, label }) => (
                    <div key={label} className="bg-amber-600/10 border border-amber-600/20 rounded-lg px-4 py-2 min-w-[60px]">
                      <span className="text-2xl font-bold text-amber-300 tabular-nums">{String(value).padStart(2, "0")}</span>
                      <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============ PAYMENT SUCCESS ============ */}
        {paymentSuccess && (
          <section className="py-8 bg-amber-600/10 border-t border-amber-800/30">
            <div className="container max-w-2xl mx-auto px-4">
              <Card className="border-amber-600/30 bg-[#2a1e14]">
                <CardContent className="p-8 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-amber-400 mx-auto" />
                  <h3 className="text-2xl font-bold text-amber-100">
                    {paymentType === "ticket" ? "Tickets Purchased!" : "Payment Received!"}
                  </h3>
                  <p className="text-amber-200/70">
                    {paymentType === "ticket"
                      ? "Thank you for purchasing tickets to A Night of Joy! You'll receive a confirmation email shortly."
                      : "Thank you for your generous sponsorship of A Night of Joy! You'll receive a confirmation email shortly."}
                    {" "}If you have any questions, reach out to{" "}
                    <a href="mailto:Marla@joyhousestore.com" className="text-amber-400 hover:underline">
                      Marla@joyhousestore.com
                    </a>
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* ============ ACTION FORK — Choose Your Path ============ */}
        <section id="action-section" className="py-16 md:py-20 bg-[#1a120b] border-t border-amber-900/30">
          <div className="container max-w-4xl mx-auto px-4">

            {pageView === "choose" && (
              <div className="text-center space-y-10">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-amber-100 mb-3">How Would You Like to Join Us?</h2>
                  <p className="text-amber-200/60 max-w-lg mx-auto">
                    Choose your path to be part of this special evening.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {/* TICKET CARD */}
                  <button
                    onClick={() => { setPageView("tickets"); scrollToContent(); }}
                    className="group relative bg-[#231811] border-2 border-amber-800/30 hover:border-amber-500/60 rounded-2xl p-8 text-left transition-all hover:shadow-xl hover:shadow-amber-900/20 hover:scale-[1.02]"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-600/15 border border-amber-600/25 flex items-center justify-center mb-5 group-hover:bg-amber-600/25 transition-colors">
                      <Ticket className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-amber-100 mb-2">Buy Tickets</h3>
                    <p className="text-amber-200/60 mb-4">
                      Reserve your seat at the table for an evening of dinner, entertainment, and community.
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-amber-300">Free – $60</span>
                    </div>
                    <div className="absolute top-4 right-4 text-amber-500/40 group-hover:text-amber-400 transition-colors text-xl">→</div>
                  </button>

                  {/* SPONSOR CARD */}
                  <button
                    onClick={() => { setPageView("sponsor"); scrollToContent(); }}
                    className="group relative bg-[#231811] border-2 border-amber-800/30 hover:border-amber-500/60 rounded-2xl p-8 text-left transition-all hover:shadow-xl hover:shadow-amber-900/20 hover:scale-[1.02]"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-600/15 border border-amber-600/25 flex items-center justify-center mb-5 group-hover:bg-amber-600/25 transition-colors">
                      <Heart className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-amber-100 mb-2">Become a Sponsor</h3>
                    <p className="text-amber-200/60 mb-4">
                      Make a bigger impact with sponsorship benefits, recognition, and included tickets.
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-amber-300">$250</span>
                      <span className="text-amber-400/60 text-sm">– $10,000</span>
                    </div>
                    <div className="absolute top-4 right-4 text-amber-500/40 group-hover:text-amber-400 transition-colors text-xl">→</div>
                  </button>
                </div>
              </div>
            )}

            {/* ============ TICKET PURCHASE VIEW ============ */}
            {pageView === "tickets" && (
              <div className="max-w-lg mx-auto">
                <button
                  onClick={() => setPageView("choose")}
                  className="flex items-center gap-2 text-amber-400/70 hover:text-amber-300 text-sm mb-8 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to options
                </button>

                <div className="text-center mb-8">
                  <Ticket className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                  <h2 className="text-3xl font-bold text-amber-100 mb-2">Buy Tickets</h2>
                  <p className="text-amber-200/60">Select your ticket type and quantity below</p>
                </div>

                <div className="space-y-6">
                  {/* Per-tier quantity selectors */}
                  <div className="space-y-3">
                    {TICKET_TIERS.map(tier => {
                      const count = ticketCounts[tier.id];
                      return (
                        <div
                          key={tier.id}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            count > 0
                              ? "border-amber-500 bg-amber-600/15"
                              : "border-amber-800/30 bg-[#231811]"
                          }`}
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <span className={`font-medium block ${count > 0 ? "text-amber-100" : "text-amber-200/80"}`}>
                              {tier.label}
                            </span>
                            <span className={`text-sm ${count > 0 ? "text-amber-300" : "text-amber-400/60"}`}>
                              {tier.price === 0 ? "Free" : `$${tier.price} each`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateTierCount(tier.id as TicketTierId, -1)}
                              disabled={count <= 0}
                              className="w-9 h-9 rounded-full border border-amber-700/40 flex items-center justify-center text-amber-300 hover:bg-amber-600/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-xl font-bold text-amber-100 tabular-nums w-8 text-center">
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateTierCount(tier.id as TicketTierId, 1)}
                              disabled={count >= 10}
                              className="w-9 h-9 rounded-full border border-amber-700/40 flex items-center justify-center text-amber-300 hover:bg-amber-600/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  {totalTickets > 0 && (
                    <Card className="border-amber-600/30 bg-amber-600/10">
                      <CardContent className="p-4 space-y-2">
                        {TICKET_TIERS.filter(t => ticketCounts[t.id] > 0).map(t => (
                          <div key={t.id} className="flex justify-between text-sm text-amber-200/80">
                            <span>{ticketCounts[t.id]}× {t.label}</span>
                            <span>{t.price === 0 ? "Free" : `$${(t.price * ticketCounts[t.id]).toLocaleString()}`}</span>
                          </div>
                        ))}
                        {paidTotal > 0 && (
                          <div className="flex justify-between text-sm text-amber-200/60">
                            <span>Processing fee</span>
                            <span>+${ticketFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-amber-700/30 pt-2 flex justify-between">
                          <span className="text-amber-100 font-medium">{totalTickets} ticket{totalTickets !== 1 ? "s" : ""}</span>
                          <span className="text-2xl font-bold text-amber-300">
                            {paidTotal === 0 ? "Free" : `$${ticketTotalWithFee.toFixed(2)}`}
                          </span>
                        </div>
                        {paidTotal > 0 && (
                          <p className="text-[11px] text-amber-200/40 mt-1">Includes Stripe processing fee so 100% of your ticket price supports Best Day Ministries</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Contact for tickets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-email" className="text-amber-200/80">Email *</Label>
                      <Input
                        id="ticket-email"
                        type="email"
                        value={ticketEmail}
                        onChange={(e) => setTicketEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                        className={inputClasses}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-first-name" className="text-amber-200/80">First Name *</Label>
                      <Input
                        id="ticket-first-name"
                        value={ticketFirstName}
                        onChange={(e) => setTicketFirstName(e.target.value)}
                        required
                        placeholder="First name"
                        className={inputClasses}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-last-name" className="text-amber-200/80">Last Name *</Label>
                      <Input
                        id="ticket-last-name"
                        value={ticketLastName}
                        onChange={(e) => setTicketLastName(e.target.value)}
                        required
                        placeholder="Last name"
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white border border-amber-500/30"
                    disabled={submitting || !ticketEmail || !ticketFirstName || !ticketLastName || totalTickets === 0}
                    onClick={handleTicketPurchase}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {hasFreeOnly ? "Registering..." : "Redirecting to Checkout..."}
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4 mr-2" />
                        {totalTickets === 0
                          ? "Select Tickets"
                          : hasFreeOnly
                            ? `Register ${totalTickets} Free Ticket${totalTickets !== 1 ? "s" : ""}`
                            : `Purchase ${totalTickets} Ticket${totalTickets !== 1 ? "s" : ""} — $${ticketTotalWithFee.toFixed(2)}`
                        }
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-amber-200/40 text-center">
                    {hasFreeOnly
                      ? "Your free tickets will be registered immediately."
                      : "You'll be redirected to a secure Stripe checkout page."
                    }
                    <br />
                    Questions? <a href="mailto:Marla@joyhousestore.com" className="text-amber-400/70 hover:underline">Marla@joyhousestore.com</a>
                  </p>
                </div>
              </div>
            )}

            {/* ============ SPONSOR VIEW ============ */}
            {pageView === "sponsor" && (
              <div>
                <div className="max-w-2xl mx-auto">
                  <button
                    onClick={() => setPageView("choose")}
                    className="flex items-center gap-2 text-amber-400/70 hover:text-amber-300 text-sm mb-8 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to options
                  </button>
                </div>

                {/* Benefits Table */}
                <div className="max-w-5xl mx-auto mb-12">
                  <h2 className="text-3xl font-bold text-center text-amber-100 mb-8">
                    Sponsorship Levels & Benefits
                  </h2>
                  <Card className="overflow-hidden border-amber-800/30 bg-[#231811]">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-amber-600/10 border-b border-amber-800/30">
                              <TableHead className="min-w-[200px] font-bold text-amber-200">Benefit</TableHead>
                              {SPONSORSHIP_TIERS.map((tier) => (
                                <TableHead key={tier.amount} className="text-center min-w-[80px]">
                                  <span className="font-bold text-amber-300">${tier.amount.toLocaleString()}</span>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {BENEFITS.map((benefit, i) => (
                              <TableRow key={i} className={`border-b border-amber-900/20 ${i % 2 === 0 ? "bg-[#231811]" : "bg-[#2a1e14]/50"}`}>
                                <TableCell className="font-medium text-amber-100/90">{benefit.label}</TableCell>
                                {benefit.tiers.map((val, j) => (
                                  <TableCell key={j} className="text-center">
                                    {val === true ? (
                                      <CheckCircle2 className="w-5 h-5 text-amber-400 mx-auto" />
                                    ) : val === false ? (
                                      <span className="text-amber-700/50">—</span>
                                    ) : (
                                      <span className="text-amber-200/80 font-medium">{val}</span>
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

                {/* Sponsor Form */}
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-8">
                    <Heart className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <h2 className="text-3xl font-bold text-amber-100 mb-2">Become a Sponsor</h2>
                    <p className="text-amber-200/60">
                      Interested in sponsoring? Reach out to learn more, or pay directly if you're ready.
                    </p>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex rounded-xl border-2 border-amber-800/40 overflow-hidden mb-8">
                    <button
                      type="button"
                      onClick={() => setFormMode("inquire")}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all ${
                        formMode === "inquire"
                          ? "bg-amber-600 text-white"
                          : "bg-[#2a1e14] text-amber-200/60 hover:bg-amber-900/30"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      I'd Like to Inquire
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMode("pay")}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all ${
                        formMode === "pay"
                          ? "bg-amber-600 text-white"
                          : "bg-[#2a1e14] text-amber-200/60 hover:bg-amber-900/30"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Ready to Pay
                    </button>
                  </div>

                  {submitted && formMode === "inquire" ? (
                    <Card className="border-amber-600/30 bg-amber-600/10">
                      <CardContent className="p-8 text-center space-y-4">
                        <CheckCircle2 className="w-12 h-12 text-amber-400 mx-auto" />
                        <h3 className="text-2xl font-bold text-amber-100">Thank You!</h3>
                        <p className="text-amber-200/70">
                          We've received your sponsorship interest and will be in touch soon. You can also reach us directly at{" "}
                          <a href="mailto:Marla@joyhousestore.com" className="text-amber-400 hover:underline">
                            Marla@joyhousestore.com
                          </a>
                        </p>
                      </CardContent>
                    </Card>
                  ) : formMode === "inquire" ? (
                    <form onSubmit={handleInquirySubmit} className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-base font-bold text-amber-100">Sponsorship Level</Label>
                        <p className="text-sm text-amber-200/50">Not sure yet? No problem — select "Just Inquiring" and we'll help you find the right fit.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SPONSORSHIP_TIERS.map((tier) => (
                            <button
                              key={tier.amount}
                              type="button"
                              onClick={() => handleChange("selectedTier", `${tier.name} - $${tier.amount.toLocaleString()}`)}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                formData.selectedTier === `${tier.name} - $${tier.amount.toLocaleString()}`
                                  ? "border-amber-500 bg-amber-600/15 ring-2 ring-amber-500/30"
                                  : "border-amber-800/30 hover:border-amber-600/50 bg-[#2a1e14]"
                              }`}
                            >
                              <span className="font-bold text-amber-100">{tier.name}</span>
                              <span className="block text-lg font-bold text-amber-400">${tier.amount.toLocaleString()}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleChange("selectedTier", "Just Inquiring")}
                            className={`sm:col-span-2 py-2 px-4 rounded-lg border-2 text-center transition-all ${
                              formData.selectedTier === "Just Inquiring"
                                ? "border-amber-500 bg-amber-600/15 ring-2 ring-amber-500/30"
                                : "border-amber-800/30 hover:border-amber-600/50 bg-[#2a1e14]"
                            }`}
                          >
                            <span className="font-bold text-amber-100">Just Inquiring</span>
                            <span className="text-sm text-amber-200/50 ml-2">— I'd like to learn more</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-bold text-amber-100">Payment Preference</Label>
                        <div className="flex flex-wrap gap-3">
                          {["Card", "Invoice me", "Check"].map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => handleChange("paymentMethod", method)}
                              className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                                formData.paymentMethod === method
                                  ? "border-amber-500 bg-amber-600 text-white"
                                  : "border-amber-800/40 text-amber-200/80 hover:border-amber-600/50"
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactName" className="text-amber-200/80">Contact Name *</Label>
                          <Input id="contactName" value={formData.contactName} onChange={(e) => handleChange("contactName", e.target.value)} required className={inputClasses} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="businessName" className="text-amber-200/80">Business / Organization</Label>
                          <Input id="businessName" value={formData.businessName} onChange={(e) => handleChange("businessName", e.target.value)} className={inputClasses} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-amber-200/80">Email *</Label>
                          <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required className={inputClasses} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-amber-200/80">Phone</Label>
                          <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} className={inputClasses} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-amber-200/80">Additional Notes</Label>
                        <Textarea id="message" value={formData.message} onChange={(e) => handleChange("message", e.target.value)} rows={3} placeholder="Anything else you'd like us to know?" className={inputClasses} />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-amber-200/80">Attachments (e.g. company logo)</Label>
                        {attachedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {attachedFiles.map((af, i) => (
                              <div key={i} className="relative group border border-amber-800/30 rounded-lg overflow-hidden bg-[#2a1e14]">
                                {af.isImage && af.preview ? (
                                  <img src={af.preview} alt={af.file.name} className="w-20 h-20 object-cover" />
                                ) : (
                                  <div className="w-20 h-20 flex flex-col items-center justify-center p-2">
                                    <FileText className="w-6 h-6 text-amber-200/50 mb-1" />
                                    <span className="text-[10px] text-amber-200/40 text-center truncate w-full">{af.file.name.split('.').pop()?.toUpperCase()}</span>
                                  </div>
                                )}
                                <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-900/80 text-red-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {attachedFiles.length < MAX_FILES && (
                          <div className="border-2 border-dashed border-amber-800/30 rounded-lg p-4 text-center hover:border-amber-600/40 transition-colors">
                            <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleFilesChange} className="hidden" id="noj-file-upload" multiple />
                            <label htmlFor="noj-file-upload" className="cursor-pointer">
                              <Upload className="h-5 w-5 mx-auto mb-1 text-amber-400/50" />
                              <p className="text-sm text-amber-200/50">Click to attach files</p>
                              <p className="text-xs text-amber-200/30 mt-1">JPG, PNG, SVG, PDF, DOCX — up to 10MB each, {MAX_FILES} max</p>
                            </label>
                          </div>
                        )}
                      </div>

                      <Button type="submit" size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white border border-amber-500/30" disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Sponsorship Interest"}
                      </Button>

                      <p className="text-xs text-amber-200/40 text-center">
                        Please submit by May 4th, 2026.
                        <br />
                        Contact: <a href="mailto:Marla@joyhousestore.com" className="text-amber-400/70 hover:underline">Marla@joyhousestore.com</a>
                      </p>
                    </form>
                  ) : (
                    <form onSubmit={handlePaySubmit} className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-base font-bold text-amber-100">Select Sponsorship Level</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SPONSORSHIP_TIERS.map((tier) => (
                            <button
                              key={tier.amount}
                              type="button"
                              onClick={() => { handleChange("selectedTier", `${tier.name} - $${tier.amount.toLocaleString()}`); setCustomAmount(""); }}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                formData.selectedTier === `${tier.name} - $${tier.amount.toLocaleString()}` && !customAmount
                                  ? "border-amber-500 bg-amber-600/15 ring-2 ring-amber-500/30"
                                  : "border-amber-800/30 hover:border-amber-600/50 bg-[#2a1e14]"
                              }`}
                            >
                              <span className="font-bold text-amber-100">{tier.name}</span>
                              <span className="block text-lg font-bold text-amber-400">${tier.amount.toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                        <div className="relative mt-4">
                          <Label className="text-sm font-semibold mb-2 block text-amber-200/80">Or enter a custom amount</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                            <Input
                              type="number" min={1} step={1} placeholder="Enter any amount" value={customAmount}
                              onChange={(e) => { setCustomAmount(e.target.value); if (e.target.value) handleChange("selectedTier", ""); }}
                              className={`pl-8 ${inputClasses}`}
                            />
                          </div>
                          {isCustomDonation() && (
                            <p className="mt-2 text-sm text-amber-300/80 bg-amber-900/30 border border-amber-700/40 rounded-lg px-3 py-2">
                              💛 Amounts under $250 will be processed as a <strong>donation</strong> to A Night of Joy rather than a sponsorship. Thank you for your generosity!
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pay-email" className="text-amber-200/80">Email *</Label>
                          <Input id="pay-email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required placeholder="your@email.com" className={inputClasses} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pay-name" className="text-amber-200/80">Name</Label>
                          <Input id="pay-name" value={formData.contactName} onChange={(e) => handleChange("contactName", e.target.value)} placeholder="Your name" className={inputClasses} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="pay-business" className="text-amber-200/80">Business / Organization</Label>
                          <Input id="pay-business" value={formData.businessName} onChange={(e) => handleChange("businessName", e.target.value)} placeholder="Optional" className={inputClasses} />
                        </div>
                      </div>

                      {getPaymentAmount() && (() => {
                        const base = getPaymentAmount()!;
                        const totalWithFee = calculateFeeTotal(base);
                        const fee = +(totalWithFee - base).toFixed(2);
                        return (
                          <Card className="border-amber-600/30 bg-amber-600/10">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-amber-200/80 text-sm">Sponsorship</span>
                                <span className="text-amber-200/80">${base.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-amber-200/60">
                                <span>Processing fee</span>
                                <span>+${fee.toFixed(2)}</span>
                              </div>
                              <div className="border-t border-amber-700/30 pt-2 flex items-center justify-between">
                                <span className="text-amber-100 font-medium">Total</span>
                                <span className="text-2xl font-bold text-amber-300">${totalWithFee.toFixed(2)}</span>
                              </div>
                              <p className="text-[11px] text-amber-200/40">Includes processing fee so 100% of your sponsorship supports Best Day Ministries</p>
                            </CardContent>
                          </Card>
                        );
                      })()}

                      <Button type="submit" size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white border border-amber-500/30" disabled={submitting}>
                        {submitting ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Payment...</>
                        ) : (
                          <><CreditCard className="w-4 h-4 mr-2" />Pay with Card</>
                        )}
                      </Button>

                      <p className="text-xs text-amber-200/40 text-center">
                        You'll be redirected to a secure Stripe checkout page. Your sponsorship is tax deductible.
                        <br />
                        Questions? <a href="mailto:Marla@joyhousestore.com" className="text-amber-400/70 hover:underline">Marla@joyhousestore.com</a>
                      </p>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NightOfJoy;
