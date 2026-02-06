import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, Trash2, UserPlus, Star, Heart, Edit, DollarSign, Share2, Plus, Play, Pause, Store, X, Settings, MessageSquare, ShoppingBag, FileCheck, Dumbbell } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FRIEND_CODE_EMOJIS } from "@/lib/friendCodeEmojis";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { FundingProgressBar } from "@/components/FundingProgressBar";
import AudioPlayer from "@/components/AudioPlayer";
import { GuardianFeaturedBestieManager } from "@/components/GuardianFeaturedBestieManager";
import { TextToSpeech } from "@/components/TextToSpeech";
import { GuardianSponsorMessenger } from "@/components/guardian/GuardianSponsorMessenger";
import { SponsorMessageInbox } from "@/components/sponsor/SponsorMessageInbox";
import { DonationHistory } from "@/components/sponsor/DonationHistory";
import { PicturePasswordManager } from "@/components/auth/PicturePasswordManager";
import { WorkoutGoalSetter } from "@/components/guardian/WorkoutGoalSetter";

// Build timestamp for admin visibility
const BUILD_TIMESTAMP = new Date().toISOString();

interface BestieLink {
  id: string;
  bestie_id: string;
  relationship: string;
  created_at: string;
  require_post_approval: boolean;
  require_comment_approval: boolean;
  allow_featured_posts: boolean;
  require_vendor_asset_approval: boolean;
  show_vendor_link_on_bestie: boolean;
  show_vendor_link_on_guardian: boolean;
  allow_sponsor_messages: boolean;
  require_message_approval: boolean;
  bestie: {
    display_name: string;
    avatar_number: number;
    profile_avatar_id?: string | null;
  };
}

interface LinkedBestie {
  id: string;
  display_name: string;
  avatar_number: number;
  profile_avatar_id?: string | null;
}

interface VendorLink {
  id: string;
  vendor_id: string;
  bestie_id: string;
  status: string;
  vendor: {
    business_name: string;
  };
}

interface TextSection {
  header: string;
  text: string;
}

interface Sponsorship {
  id: string;
  bestie_id: string;
  sponsor_bestie_id?: string;
  amount: number;
  frequency: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  stripe_subscription_id?: string | null;
  stripe_mode: string;
  is_shared?: boolean;
  shared_by?: string;
  stable_amount?: number;
  total_ending_amount?: number;
  bestie: {
    display_name: string;
    avatar_number: number;
    profile_avatar_id?: string | null;
  };
  featured_bestie?: {
    id: string;
    description: string;
    image_url: string;
    voice_note_url: string | null;
    monthly_goal: number;
    current_monthly_pledges: number;
    text_sections?: TextSection[];
  } | null;
}

export default function GuardianLinks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<BestieLink[]>([]);
  const [linkedBesties, setLinkedBesties] = useState<LinkedBestie[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [bestiesInSponsorProgram, setBestiesInSponsorProgram] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emoji1, setEmoji1] = useState("");
  const [emoji2, setEmoji2] = useState("");
  const [emoji3, setEmoji3] = useState("");
  const [relationship, setRelationship] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [featuredBestieDialogOpen, setFeaturedBestieDialogOpen] = useState(false);
  const [selectedBestieForFeatured, setSelectedBestieForFeatured] = useState<{ id: string; name: string } | null>(null);
  const [changingAmountFor, setChangingAmountFor] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState<string>("");
  const [isUpdatingAmount, setIsUpdatingAmount] = useState(false);
  const [sharingFor, setSharingFor] = useState<string | null>(null);
  const [selectedBesties, setSelectedBesties] = useState<Set<string>>(new Set());
  const [existingShares, setExistingShares] = useState<Map<string, Set<string>>>(new Map());
  const [isSavingShares, setIsSavingShares] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [vendorLinks, setVendorLinks] = useState<Map<string, VendorLink[]>>(new Map());

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        navigate("/auth");
        return;
      }

      const user = session.user;

      // Fetch role from user_roles table (security requirement)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      // Allow caregivers, admins, owners, and supporters (who can sponsor besties)
      if (!['caregiver', 'admin', 'owner', 'supporter'].includes(roleData.role)) {
        setLoading(false);
        toast({
          title: "Access denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate("/community");
        return;
      }

      setUserRole(roleData.role);
      setCurrentUserId(user.id);
      
      // Caregivers, admins, and owners can have guardian links
      if (['caregiver', 'admin', 'owner'].includes(roleData.role)) {
        await loadLinks(user.id);
        await loadLinkedBesties(user.id);
        await loadVendorLinks(user.id);
      }
      
      // Load sponsorships for all roles
      await loadSponsorships(user.id);
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/community");
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("caregiver_bestie_links")
        .select(`
          id,
          bestie_id,
          relationship,
          created_at,
          require_post_approval,
          require_comment_approval,
          allow_featured_posts,
          require_vendor_asset_approval,
          show_vendor_link_on_bestie,
          show_vendor_link_on_guardian,
          allow_sponsor_messages,
          require_message_approval,
           bestie:profiles!caregiver_bestie_links_bestie_id_fkey(
            display_name,
            avatar_number,
            profile_avatar_id
          )
        `)
        .eq("caregiver_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map(link => ({
        ...link,
        bestie: Array.isArray(link.bestie) ? link.bestie[0] : link.bestie
      }));

      setLinks(transformedData as BestieLink[]);
      
      // Check which besties are in the sponsor program
      if (transformedData.length > 0) {
        const bestieIds = transformedData.map(link => link.bestie_id);
        const { data: sponsorBesties } = await supabase
          .from("sponsor_besties")
          .select("bestie_id")
          .in("bestie_id", bestieIds)
          .eq("is_active", true);
        
        if (sponsorBesties) {
          setBestiesInSponsorProgram(new Set(sponsorBesties.map(sb => sb.bestie_id)));
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading links",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadLinkedBesties = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("caregiver_bestie_links")
        .select(`
          bestie:profiles!caregiver_bestie_links_bestie_id_fkey(
            id,
            display_name,
            avatar_number,
            profile_avatar_id
          )
        `)
        .eq("caregiver_id", userId);

      if (error) throw error;

      if (data) {
        const besties = data
          .map(link => Array.isArray(link.bestie) ? link.bestie[0] : link.bestie)
          .filter(Boolean);
        setLinkedBesties(besties as LinkedBestie[]);
      }
    } catch (error: any) {
      // Silently handle error
    }
  };

  const loadVendorLinks = async (userId: string) => {
    try {
      // First get all bestie IDs linked to this guardian
      const { data: linksData, error: linksError } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id")
        .eq("caregiver_id", userId);

      if (linksError) throw linksError;
      if (!linksData || linksData.length === 0) return;

      const bestieIds = linksData.map(link => link.bestie_id);

      // Get all approved vendor links for these besties
      const { data: vendorLinksData, error: vendorError } = await supabase
        .from("vendor_bestie_requests")
        .select(`
          id,
          vendor_id,
          bestie_id,
          status,
          vendor:vendors!vendor_bestie_requests_vendor_id_fkey(
            business_name
          )
        `)
        .in("bestie_id", bestieIds)
        .eq("status", "approved");

      if (vendorError) throw vendorError;

      // Group vendor links by bestie_id
      const vendorLinksMap = new Map<string, VendorLink[]>();
      (vendorLinksData || []).forEach((link: any) => {
        const vendorLink: VendorLink = {
          id: link.id,
          vendor_id: link.vendor_id,
          bestie_id: link.bestie_id,
          status: link.status,
          vendor: Array.isArray(link.vendor) ? link.vendor[0] : link.vendor
        };
        
        const existing = vendorLinksMap.get(link.bestie_id) || [];
        vendorLinksMap.set(link.bestie_id, [...existing, vendorLink]);
      });

      setVendorLinks(vendorLinksMap);
    } catch (error: any) {
      // Silently handle error
    }
  };

  const loadSponsorships = async (userId: string) => {
    try {
      // Get user's email for matching guest sponsorships
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Load sponsorships where user is sponsor (by user ID or by email for guest checkouts)
      const { data: ownSponsorshipsData, error: ownError } = await supabase
        .from("sponsorships")
        .select("*")
        .or(`sponsor_id.eq.${userId},sponsor_email.eq.${authUser?.email}`)
        .eq("status", "active")
        .order("started_at", { ascending: false }) as { data: any[] | null, error: any };

      if (ownError) throw ownError;

      // Load shared sponsorships (where user is a bestie who has been given access)
      const { data: sharedSponsorshipsData, error: sharedError } = await supabase
        .from("sponsorship_shares")
        .select(`
          sponsorship:sponsorships(*),
          shared_by
        `)
        .eq("bestie_id", userId) as { data: any[] | null, error: any };

      if (sharedError) throw sharedError;

      // Combine own and shared sponsorships
      const allSponsorships = [
        ...(ownSponsorshipsData || []).map((s: any) => ({ ...s, is_shared: false })),
        ...(sharedSponsorshipsData || [])
          .filter((s: any) => s.sponsorship && s.sponsorship.status === 'active')
          .map((s: any) => ({ 
            ...s.sponsorship, 
            is_shared: true,
            shared_by: s.shared_by 
          }))
      ];

      if (allSponsorships.length === 0) {
        setSponsorships([]);
        return;
      }

      // Load existing shares for own sponsorships
      if (ownSponsorshipsData && ownSponsorshipsData.length > 0) {
        const { data: sharesData } = await supabase
          .from("sponsorship_shares")
          .select("sponsorship_id, bestie_id")
          .in("sponsorship_id", ownSponsorshipsData.map((s: any) => s.id));

        const sharesMap = new Map<string, Set<string>>();
        (sharesData || []).forEach(share => {
          if (!sharesMap.has(share.sponsorship_id)) {
            sharesMap.set(share.sponsorship_id, new Set());
          }
          sharesMap.get(share.sponsorship_id)!.add(share.bestie_id);
        });
        setExistingShares(sharesMap);
      }

      // Get bestie profiles (for sponsorships with bestie_id)
      const bestieIds = allSponsorships
        .filter((s: any) => s.bestie_id)
        .map((s: any) => s.bestie_id);
      
      let profilesData: any[] = [];
      if (bestieIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_number, profile_avatar_id")
          .in("id", bestieIds);

        if (profilesError) throw profilesError;
        profilesData = data || [];
      }

      // Get sponsor bestie data (for sponsorships with sponsor_bestie_id)
      const sponsorBestieIds = allSponsorships
        .filter((s: any) => s.sponsor_bestie_id)
        .map((s: any) => s.sponsor_bestie_id);

      let sponsorBestiesData: any[] = [];
      if (sponsorBestieIds.length > 0) {
        const { data, error: sponsorBestiesError } = await supabase
          .from("sponsor_besties")
          .select("id, bestie_id, bestie_name, image_url, voice_note_url, monthly_goal, text_sections")
          .in("id", sponsorBestieIds)
          .eq("is_active", true);

        if (sponsorBestiesError) throw sponsorBestiesError;
        sponsorBestiesData = data || [];
      }

      // Get featured bestie data and funding progress
      const allBestieIds = [
        ...bestieIds,
        ...(sponsorBestiesData.map(sb => sb.bestie_id).filter(Boolean))
      ];

      let featuredBestiesData: any[] = [];
      let fundingData: any[] = [];
      
      if (allBestieIds.length > 0) {
        const { data: fbData } = await supabase
          .from("featured_besties")
          .select("id, bestie_id, description, image_url, voice_note_url, monthly_goal")
          .in("bestie_id", allBestieIds)
          .eq("approval_status", "approved")
          .eq("is_active", true);

        featuredBestiesData = fbData || [];

        const { data: fData } = await supabase
          .from("bestie_funding_progress")
          .select("bestie_id, current_monthly_pledges, monthly_goal")
          .in("bestie_id", allBestieIds);

        fundingData = fData || [];
      }

      // Get funding progress for sponsor besties (by mode)
      const { data: sponsorFundingData } = await supabase
        .from("sponsor_bestie_funding_progress_by_mode")
        .select("sponsor_bestie_id, stripe_mode, current_monthly_pledges, monthly_goal")
        .in("sponsor_bestie_id", sponsorBestieIds);

      // Load ALL active sponsorships for these sponsor besties (from ALL users)
      // This is needed to correctly calculate stable vs ending amounts for progress bars
      let allBestieSponsorships: any[] = [];
      if (sponsorBestieIds.length > 0) {
        const { data: allBestieSponsData, error: allSponsError } = await supabase
          .from("sponsorships")
          .select("sponsor_bestie_id, frequency, amount, status, stripe_mode, ended_at")
          .in("sponsor_bestie_id", sponsorBestieIds)
          .eq("status", "active");
        
        if (allSponsError) {
          console.error("Error loading all bestie sponsorships:", allSponsError);
        }
        
        allBestieSponsorships = allBestieSponsData || [];
      }

      // Combine the data
      const transformedData = allSponsorships
        .map((sponsorship: any) => {
          // Try to find bestie from profiles first
          let bestie = profilesData?.find(p => p.id === sponsorship.bestie_id);
          let featuredBestie = null;

          // If no profile bestie, try sponsor_besties table
          if (!bestie && sponsorship.sponsor_bestie_id) {
            const sponsorBestie = sponsorBestiesData?.find(sb => sb.id === sponsorship.sponsor_bestie_id);
            if (sponsorBestie) {
              // Create a bestie-like object from sponsor_bestie
              bestie = {
                display_name: sponsorBestie.bestie_name,
                avatar_number: 1,
                profile_avatar_id: null,
              };

              // Use sponsor bestie's own image/voice if available
              // Match funding by both sponsor_bestie_id AND stripe_mode
              const sponsorFunding = sponsorFundingData?.find(f => 
                f.sponsor_bestie_id === sponsorship.sponsor_bestie_id && 
                f.stripe_mode === sponsorship.stripe_mode
              );
              
              // Parse text_sections if it's a string
              let textSections: TextSection[] = [];
              if (sponsorBestie.text_sections) {
                textSections = Array.isArray(sponsorBestie.text_sections) 
                  ? sponsorBestie.text_sections 
                  : (typeof sponsorBestie.text_sections === 'string' 
                    ? JSON.parse(sponsorBestie.text_sections) 
                    : []);
              }
              
              featuredBestie = {
                id: sponsorBestie.id,
                description: `Supporting ${sponsorBestie.bestie_name}'s programs and activities`,
                image_url: sponsorBestie.image_url,
                voice_note_url: sponsorBestie.voice_note_url,
                monthly_goal: sponsorFunding?.monthly_goal || sponsorBestie.monthly_goal || 0,
                current_monthly_pledges: sponsorFunding?.current_monthly_pledges || 0,
                text_sections: textSections
              };
            }
          } else if (bestie) {
            // Get featured bestie data for profile besties
            // First check sponsor_besties (preferred source), then fall back to featured_besties
            const sponsorBestie = sponsorship.sponsor_bestie_id 
              ? sponsorBestiesData?.find(sb => sb.id === sponsorship.sponsor_bestie_id)
              : null;
            
            if (sponsorBestie) {
              // Use sponsor_besties data (same as above, but bestie already found from profiles)
              const sponsorFunding = sponsorFundingData?.find(f => 
                f.sponsor_bestie_id === sponsorship.sponsor_bestie_id && 
                f.stripe_mode === sponsorship.stripe_mode
              );
              
              let textSections: TextSection[] = [];
              if (sponsorBestie.text_sections) {
                textSections = Array.isArray(sponsorBestie.text_sections) 
                  ? sponsorBestie.text_sections 
                  : (typeof sponsorBestie.text_sections === 'string' 
                    ? JSON.parse(sponsorBestie.text_sections) 
                    : []);
              }
              
              featuredBestie = {
                id: sponsorBestie.id,
                description: `Supporting ${sponsorBestie.bestie_name}'s programs and activities`,
                image_url: sponsorBestie.image_url,
                voice_note_url: sponsorBestie.voice_note_url,
                monthly_goal: sponsorFunding?.monthly_goal || sponsorBestie.monthly_goal || 0,
                current_monthly_pledges: sponsorFunding?.current_monthly_pledges || 0,
                text_sections: textSections
              };
            } else {
              // Fall back to featured_besties table
              const fb = featuredBestiesData?.find(fb => fb.bestie_id === sponsorship.bestie_id);
              const f = fundingData?.find(f => f.bestie_id === sponsorship.bestie_id);
              
              if (fb) {
                featuredBestie = {
                  id: fb.id,
                  description: fb.description,
                  image_url: fb.image_url,
                  voice_note_url: fb.voice_note_url,
                  monthly_goal: f?.monthly_goal || fb.monthly_goal || 0,
                  current_monthly_pledges: f?.current_monthly_pledges || 0
                };
              }
            }
          }

          if (!bestie) return null;
          
          return {
            ...sponsorship,
            bestie: {
              display_name: bestie.display_name,
              avatar_number: bestie.avatar_number,
              profile_avatar_id: bestie.profile_avatar_id,
            },
            featured_bestie: featuredBestie
          };
        })
        .filter(s => s !== null) as Sponsorship[];

      // Calculate stable (monthly) and ending (one-time) amounts per bestie AND stripe mode
      const stableAmountsByBestieAndMode = new Map<string, number>();
      const endingAmountsByBestieAndMode = new Map<string, number>();
      
      // Use ALL besties' sponsorships (from all users) to correctly calculate stable/ending amounts
      allBestieSponsorships.forEach((s: any) => {
        const bestieKey = s.sponsor_bestie_id || s.bestie_id;
        if (!bestieKey) return;
        
        // Group by BOTH bestie AND stripe_mode
        const groupKey = `${bestieKey}|${s.stripe_mode}`;
        
        if (s.frequency === 'monthly' && s.status === 'active') {
          const current = stableAmountsByBestieAndMode.get(groupKey) || 0;
          stableAmountsByBestieAndMode.set(groupKey, current + s.amount);
        } else if (s.frequency === 'one-time' && s.status === 'active' && s.ended_at && new Date(s.ended_at) > new Date()) {
          const current = endingAmountsByBestieAndMode.get(groupKey) || 0;
          endingAmountsByBestieAndMode.set(groupKey, current + s.amount);
        }
      });

      // Attach amounts to transformed data using LIVE mode only
      const finalData = transformedData.map(s => {
        const bestieKey = s.sponsor_bestie_id || s.bestie_id;
        const groupKey = `${bestieKey}|live`; // Always show LIVE mode funding
        const stableAmount = stableAmountsByBestieAndMode.get(groupKey) || 0;
        const endingAmount = endingAmountsByBestieAndMode.get(groupKey) || 0;
        
        return {
          ...s,
          stable_amount: stableAmount,
          total_ending_amount: endingAmount,
          // Update current_monthly_pledges to match calculated total for THIS MODE
          featured_bestie: s.featured_bestie ? {
            ...s.featured_bestie,
            current_monthly_pledges: stableAmount + endingAmount
          } : null
        };
      });

      setSponsorships(finalData);
    } catch (error: any) {
      toast({
        title: "Error loading sponsorships",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddLink = async () => {
    if (!emoji1 || !emoji2 || !emoji3 || !relationship.trim() || !currentUserId) {
      toast({
        title: "Missing information",
        description: "Please select all 3 emojis and describe your relationship",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      const friendCode = `${emoji1}${emoji2}${emoji3}`;
      
      // Search for profile by friend code
      const { data: profile, error: profileError } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_number, profile_avatar_id, friend_code, bio")
        .eq("friend_code", friendCode)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast({
          title: "Friend code not found",
          description: "No user found with that friend code",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      // Verify the user has bestie role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id)
        .eq("role", "bestie")
        .maybeSingle();

      if (roleError || !roleData) {
        toast({
          title: "Not a bestie",
          description: "This friend code doesn't belong to a bestie",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const bestie = profile;

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("caregiver_bestie_links")
        .select("id")
        .eq("caregiver_id", currentUserId)
        .eq("bestie_id", bestie.id)
        .maybeSingle();

      if (existingLink) {
        toast({
          title: "Link already exists",
          description: `You are already connected to ${bestie.display_name}`,
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("caregiver_bestie_links")
        .insert({
          caregiver_id: currentUserId,
          bestie_id: bestie.id,
          relationship: relationship.trim(),
        });

      if (insertError) throw insertError;

      toast({
        title: "Link created",
        description: `Successfully linked to ${bestie.display_name}`,
      });

      setDialogOpen(false);
      setEmoji1("");
      setEmoji2("");
      setEmoji3("");
      setRelationship("");
      
      await loadLinks(currentUserId);
      await loadLinkedBesties(currentUserId);
    } catch (error: any) {
      console.error("❌ Error creating link:", error);
      toast({
        title: "Error creating link",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("caregiver_bestie_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast({
        title: "Link removed",
        description: "Bestie account has been unlinked",
      });

      await loadLinks(currentUserId);
      await loadLinkedBesties(currentUserId);
      await loadVendorLinks(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error removing link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveVendorLink = async (vendorLinkId: string, bestieName: string, vendorName: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("vendor_bestie_requests")
        .delete()
        .eq("id", vendorLinkId);

      if (error) throw error;

      toast({
        title: "Vendor link removed",
        description: `${vendorName} has been unlinked from ${bestieName}`,
      });

      await loadVendorLinks(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error removing vendor link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleApproval = async (linkId: string, field: 'require_post_approval' | 'require_comment_approval' | 'allow_featured_posts' | 'require_vendor_asset_approval' | 'show_vendor_link_on_bestie' | 'show_vendor_link_on_guardian' | 'allow_sponsor_messages' | 'require_message_approval', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("caregiver_bestie_links")
        .update({ [field]: !currentValue })
        .eq("id", linkId);

      if (error) throw error;

      const fieldNames = {
        require_post_approval: "Post Approval",
        require_comment_approval: "Comment Approval",
        allow_featured_posts: "Featured Posts",
        require_vendor_asset_approval: "Vendor Asset Approval",
        show_vendor_link_on_bestie: "Vendor Link on Bestie Profile",
        show_vendor_link_on_guardian: "Vendor Link on Your Profile",
        allow_sponsor_messages: "Sponsor Messages",
        require_message_approval: "Message Approval",
      };

      toast({
        title: "Settings updated",
        description: `${fieldNames[field]} ${!currentValue ? 'enabled' : 'disabled'}`,
      });

      await loadLinks(currentUserId!);
    } catch (error: any) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManageFeaturedPosts = (bestieId: string, bestieName: string) => {
    setSelectedBestieForFeatured({ id: bestieId, name: bestieName });
    setFeaturedBestieDialogOpen(true);
  };

  const handlePlayAudio = (sponsorshipId: string, audioUrl: string) => {
    const audio = audioRefs.current.get(sponsorshipId);
    
    if (playingAudio === sponsorshipId && audio) {
      // Pause the current audio
      audio.pause();
      setPlayingAudio(null);
    } else {
      // Stop any currently playing audio
      if (playingAudio) {
        const currentAudio = audioRefs.current.get(playingAudio);
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }
      
      // Play or create new audio
      let audioElement = audio;
      if (!audioElement) {
        audioElement = new Audio(audioUrl);
        audioElement.addEventListener('ended', () => {
          setPlayingAudio(null);
        });
        audioRefs.current.set(sponsorshipId, audioElement);
      }
      
      audioElement.play().catch(error => {
        console.error('Error playing audio:', error);
        toast({
          title: "Error",
          description: "Could not play audio",
          variant: "destructive",
        });
      });
      setPlayingAudio(sponsorshipId);
    }
  };


  const handleUpdateAmount = async () => {
    if (!changingAmountFor || !newAmount || !currentUserId) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum sponsorship amount is $10",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingAmount(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke('update-sponsorship', {
        body: {
          sponsorship_id: changingAmountFor,
          new_amount: amount,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sponsorship amount updated. Changes will take effect next billing cycle.",
      });

      setChangingAmountFor(null);
      setNewAmount("");
      
      if (currentUserId) {
        await loadSponsorships(currentUserId);
      }
    } catch (error: any) {
      toast({
        title: "Error updating sponsorship",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAmount(false);
    }
  };

  const handleShareClick = (sponsorshipId: string) => {
    setSharingFor(sponsorshipId);
    const shares = existingShares.get(sponsorshipId) || new Set();
    setSelectedBesties(new Set(shares));
  };

  const handleSaveShares = async () => {
    if (!sharingFor) return;

    setIsSavingShares(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentShares = existingShares.get(sharingFor) || new Set();
      
      // Find besties to add and remove
      const toAdd = Array.from(selectedBesties).filter(id => !currentShares.has(id));
      const toRemove = Array.from(currentShares).filter(id => !selectedBesties.has(id));

      // Add new shares
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("sponsorship_shares")
          .insert(
            toAdd.map(bestie_id => ({
              sponsorship_id: sharingFor,
              bestie_id,
              shared_by: user.id
            }))
          );
        
        if (insertError) throw insertError;
      }

      // Remove shares
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("sponsorship_shares")
          .delete()
          .eq("sponsorship_id", sharingFor)
          .in("bestie_id", toRemove);
        
        if (deleteError) throw deleteError;
      }

      // Update local state
      const newShares = new Map(existingShares);
      newShares.set(sharingFor, new Set(selectedBesties));
      setExistingShares(newShares);

      toast({
        title: "Sharing settings updated",
        description: "Your besties can now view this sponsorship",
      });
      
      setSharingFor(null);
    } catch (error: any) {
      console.error("Error updating shares:", error);
      toast({
        title: "Error updating sharing settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingShares(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <UnifiedHeader />
        <main className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            <p className="text-lg text-muted-foreground">Loading your links...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ownSponsorships = sponsorships.filter(s => !s.is_shared);
  const sharedWithMe = sponsorships.filter(s => s.is_shared);

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Besties</h1>
              <p className="text-muted-foreground mt-2">
                {userRole === "caregiver" 
                  ? "Manage your guardian relationships and sponsorships"
                  : userRole === "bestie" && sharedWithMe.length > 0
                  ? "View sponsorships shared with you"
                  : "Manage the besties you sponsor"}
              </p>
            </div>
            {['caregiver', 'admin', 'owner'].includes(userRole) && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Link Bestie
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Link Bestie Account</DialogTitle>
                    <DialogDescription>
                      Enter your bestie's 3-emoji friend code to connect
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>First Emoji</Label>
                        <Select value={emoji1} onValueChange={setEmoji1}>
                          <SelectTrigger className="h-20 text-4xl" data-testid="emoji-1-trigger">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent data-testid="emoji-1-content">
                            {FRIEND_CODE_EMOJIS.map((item) => (
                              <SelectItem 
                                key={`1-${item.emoji}`} 
                                value={item.emoji} 
                                className="text-3xl"
                                data-testid={`emoji-1-option-${item.emoji}`}
                              >
                                {item.emoji}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Second Emoji</Label>
                        <Select value={emoji2} onValueChange={setEmoji2}>
                          <SelectTrigger className="h-20 text-4xl" data-testid="emoji-2-trigger">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent data-testid="emoji-2-content">
                            {FRIEND_CODE_EMOJIS.map((item) => (
                              <SelectItem 
                                key={`2-${item.emoji}`} 
                                value={item.emoji} 
                                className="text-3xl"
                                data-testid={`emoji-2-option-${item.emoji}`}
                              >
                                {item.emoji}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Third Emoji</Label>
                        <Select value={emoji3} onValueChange={setEmoji3}>
                          <SelectTrigger className="h-20 text-4xl" data-testid="emoji-3-trigger">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent data-testid="emoji-3-content">
                            {FRIEND_CODE_EMOJIS.map((item) => (
                              <SelectItem 
                                key={`3-${item.emoji}`} 
                                value={item.emoji} 
                                className="text-3xl"
                                data-testid={`emoji-3-option-${item.emoji}`}
                              >
                                {item.emoji}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {emoji1 && emoji2 && emoji3 && (
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Friend Code Preview:</p>
                        <p className="text-5xl tracking-wider">{emoji1}{emoji2}{emoji3}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="relationship">Your Relationship</Label>
                      <Input
                        id="relationship"
                        data-testid="relationship-input"
                        placeholder="e.g., Parent, Sibling, Friend"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setDialogOpen(false);
                      setEmoji1("");
                      setEmoji2("");
                      setEmoji3("");
                      setRelationship("");
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddLink} 
                      disabled={isSearching}
                      data-testid="create-link-button"
                    >
                      {isSearching ? (
                        <>
                          <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                          Searching...
                        </>
                      ) : (
                        "Create Link"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Guardian Links Section - For caregivers, admins, and owners */}
          {['caregiver', 'admin', 'owner'].includes(userRole) && (
            <div className="space-y-4" data-tour-target="bestie-links">
              <h2 className="text-2xl font-bold">Guardian Relationships</h2>
              {links.length === 0 ? (
                <Card data-tour-target="add-bestie-link">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <LinkIcon className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No linked besties yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Link with bestie accounts to help monitor and approve their posts and comments
                    </p>
                    <Button onClick={() => setDialogOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Link Your First Bestie
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4" data-tour-target="linked-besties-list">
                  {links.map((link) => (
                    <Card key={link.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <AvatarDisplay
                              profileAvatarId={link.bestie.profile_avatar_id}
                              displayName={link.bestie.display_name}
                              size="lg"
                            />
                            <div>
                              <CardTitle>{link.bestie.display_name}</CardTitle>
                              <CardDescription>{link.relationship}</CardDescription>
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Link?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to unlink from {link.bestie.display_name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveLink(link.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove Link
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">Relationship:</span>
                            <span>{link.relationship}</span>
                            <span className="mx-2">•</span>
                            <span>Linked {new Date(link.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <Accordion type="multiple" className="w-full pt-3 border-t">
                            {/* Content Moderation */}
                            <AccordionItem value="content-moderation">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  <span className="font-medium">Content Moderation</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 pt-2">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm font-medium">
                                        Require Post Approval
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        Review and approve posts before they're published
                                      </p>
                                    </div>
                                    <Switch
                                      checked={link.require_post_approval}
                                      onCheckedChange={() => handleToggleApproval(link.id, 'require_post_approval', link.require_post_approval)}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm font-medium">
                                        Require Comment Approval
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        Review and approve comments before they're published
                                      </p>
                                    </div>
                                    <Switch
                                      checked={link.require_comment_approval}
                                      onCheckedChange={() => handleToggleApproval(link.id, 'require_comment_approval', link.require_comment_approval)}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm font-medium">
                                        Allow Featured Posts
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        Allow creating featured posts for this bestie
                                      </p>
                                    </div>
                                    <Switch
                                      checked={link.allow_featured_posts}
                                      onCheckedChange={() => handleToggleApproval(link.id, 'allow_featured_posts', link.allow_featured_posts)}
                                    />
                                  </div>
                                  {link.allow_featured_posts && (
                                    <Button
                                      variant="outline"
                                      className="w-full gap-2"
                                      onClick={() => handleManageFeaturedPosts(link.bestie_id, link.bestie.display_name)}
                                    >
                                      <Star className="w-4 h-4" />
                                      Manage Featured Posts
                                    </Button>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* Vendor Relationships - Admin Only */}
                            {(userRole === 'admin' || userRole === 'owner') && (
                              <AccordionItem value="vendor-relationships">
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4" />
                                    <span className="font-medium">Vendor Relationships</span>
                                    <Badge variant="outline" className="ml-2 text-xs">Admin Only</Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">
                                          Require Vendor Asset Approval
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                          Vendors need approval before using bestie's photos, videos, or other assets
                                        </p>
                                      </div>
                                      <Switch
                                        checked={link.require_vendor_asset_approval}
                                        onCheckedChange={() => handleToggleApproval(link.id, 'require_vendor_asset_approval', link.require_vendor_asset_approval)}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">
                                          Show Vendor Store Link on Bestie Profile
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                          Display link to vendor store when bestie posts or comments
                                        </p>
                                      </div>
                                      <Switch
                                        checked={link.show_vendor_link_on_bestie}
                                        onCheckedChange={() => handleToggleApproval(link.id, 'show_vendor_link_on_bestie', link.show_vendor_link_on_bestie)}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">
                                          Show Vendor Store Link on Your Profile
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                          Display link to vendor store when you post or comment
                                        </p>
                                      </div>
                                      <Switch
                                        checked={link.show_vendor_link_on_guardian}
                                        onCheckedChange={() => handleToggleApproval(link.id, 'show_vendor_link_on_guardian', link.show_vendor_link_on_guardian)}
                                      />
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            )}

                            {/* Sponsor Communication */}
                            {bestiesInSponsorProgram.has(link.bestie_id) && (
                              <AccordionItem value="sponsor-communication">
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex items-center gap-2">
                                    <FileCheck className="w-4 h-4" />
                                    <span className="font-medium">Sponsor Communication</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">
                                          Allow Sponsor Messages
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                          Allow bestie to send messages to their sponsors
                                        </p>
                                      </div>
                                      <Switch
                                        checked={link.allow_sponsor_messages}
                                        onCheckedChange={() => handleToggleApproval(link.id, 'allow_sponsor_messages', link.allow_sponsor_messages)}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">
                                          Require Message Approval
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                          Review and approve messages before they're sent to sponsors
                                        </p>
                                      </div>
                                      <Switch
                                        checked={link.require_message_approval}
                                        onCheckedChange={() => handleToggleApproval(link.id, 'require_message_approval', link.require_message_approval)}
                                      />
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            )}

                            {/* Picture Password */}
                            <AccordionItem value="picture-password">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <Settings className="w-4 h-4" />
                                  <span className="font-medium">Picture Password</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pt-2">
                                  <PicturePasswordManager
                                    userId={link.bestie_id}
                                    isGuardianManaging={true}
                                    bestieName={link.bestie.display_name}
                                  />
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* Workout Goals */}
                            <AccordionItem value="workout-goals">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <Dumbbell className="w-4 h-4" />
                                  <span className="font-medium">Workout Goals</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pt-2">
                                  <WorkoutGoalSetter
                                    bestieId={link.bestie_id}
                                    bestieName={link.bestie.display_name}
                                  />
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>

                          {/* Linked Vendors Section */}
                          {vendorLinks.get(link.bestie_id) && vendorLinks.get(link.bestie_id)!.length > 0 && (
                            <div className="pt-4 border-t space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <Store className="w-4 h-4" />
                                Linked Vendors
                              </Label>
                              <div className="space-y-2">
                                {vendorLinks.get(link.bestie_id)!.map((vendorLink) => (
                                  <div key={vendorLink.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <Link 
                                      to={`/vendor-profile/${vendorLink.vendor_id}`}
                                      className="text-sm font-medium text-primary hover:underline"
                                    >
                                      {vendorLink.vendor.business_name}
                                    </Link>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remove Vendor Link?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to remove the link between {link.bestie.display_name} and {vendorLink.vendor.business_name}? 
                                            The vendor will no longer be able to feature this bestie on their profile.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleRemoveVendorLink(vendorLink.id, link.bestie.display_name, vendorLink.vendor.business_name)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Remove Link
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Send Messages to Sponsors Section - For caregivers, admins, and owners with besties in sponsor program */}
          {['caregiver', 'admin', 'owner'].includes(userRole) && bestiesInSponsorProgram.size > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Send Messages to Sponsors</h2>
              <GuardianSponsorMessenger />
            </div>
          )}

          {/* Sponsored Besties Section */}
          {ownSponsorships.length > 0 && (
            <div className="space-y-4" data-tour-target="sponsorships">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">My Sponsorships</h2>
                <Button onClick={() => navigate("/sponsor-bestie")} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Sponsor Another Bestie
                </Button>
              </div>
              <div className="grid gap-4">
                {ownSponsorships.map((sponsorship) => (
                  <Card key={sponsorship.id}>
                     <CardHeader>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4 flex-1">
                           <AvatarDisplay
                             profileAvatarId={sponsorship.bestie.profile_avatar_id}
                             displayName={sponsorship.bestie.display_name}
                             size="lg"
                           />
                           <div className="flex items-center gap-2 flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle>{sponsorship.bestie.display_name}</CardTitle>
                                {sponsorship.stripe_mode === 'test' && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full border border-yellow-300 dark:border-yellow-700">
                                    Test Mode
                                  </span>
                                )}
                              </div>
                             {sponsorship.featured_bestie && (
                               <TextToSpeech 
                                 text={`${sponsorship.bestie.display_name}. ${sponsorship.featured_bestie.description}`} 
                                 size="icon" 
                               />
                             )}
                           </div>
                         </div>
                        <div className="flex gap-2">
                          {sponsorship.frequency === 'monthly' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setChangingAmountFor(sponsorship.id);
                                  setNewAmount(sponsorship.amount.toString());
                                }}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Change Amount
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.functions.invoke('manage-sponsorship');
                                    
                                    if (error) throw error;
                                    if (data?.url) {
                                      window.open(data.url, '_blank');
                                    }
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Could not open customer portal",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Settings className="w-4 h-4 mr-1" />
                                Manage
                              </Button>
                            </>
                          )}
                          {linkedBesties.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShareClick(sponsorship.id)}
                            >
                              <Share2 className="w-4 h-4 mr-1" />
                              Share With Besties
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Amount:</span>
                          <span className="text-lg font-bold text-primary">${sponsorship.amount}{sponsorship.frequency === 'monthly' ? '/month' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Type:</span>
                          <span className="capitalize">{sponsorship.frequency}</span>
                          <span className="mx-2">•</span>
                          <span>Started {new Date(sponsorship.started_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Status:</span>
                          {sponsorship.ended_at && new Date(sponsorship.ended_at) > new Date() ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Cancels on {new Date(sponsorship.ended_at).toLocaleDateString()}
                            </Badge>
                          ) : sponsorship.status === 'active' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              Cancelled {sponsorship.ended_at ? `on ${new Date(sponsorship.ended_at).toLocaleDateString()}` : ''}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {sponsorship.featured_bestie && (
                        <div className="pt-4 border-t">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Left side - Image */}
                            <div className="relative overflow-hidden flex items-center justify-center bg-muted rounded-lg" style={{ maxHeight: '450px' }}>
                              <img
                                src={sponsorship.featured_bestie.image_url}
                                alt={sponsorship.bestie.display_name}
                                className="object-contain w-full h-full"
                                style={{ maxHeight: '450px' }}
                              />
                            </div>

                            {/* Right side - Content */}
                            <div className="space-y-4 flex flex-col justify-center">
                              {sponsorship.featured_bestie.text_sections && sponsorship.featured_bestie.text_sections.length > 0 ? (
                                sponsorship.featured_bestie.text_sections.map((section, index) => (
                                  <div key={index} className="space-y-2">
                                    {section.header && (
                                      <div className={index === 0 ? "flex items-start justify-between gap-2" : ""}>
                                        <h3 className="font-script text-2xl font-bold text-primary leading-tight">
                                          {section.header}
                                        </h3>
                                        {index === 0 && (
                                          <TextToSpeech 
                                            text={`${section.header}. ${section.text}`} 
                                            size="default"
                                          />
                                        )}
                                      </div>
                                    )}
                                    {section.text && (
                                      <p className="font-script text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                                        {section.text}
                                      </p>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-base text-muted-foreground">
                                  {sponsorship.featured_bestie.description}
                                </p>
                              )}

                              {sponsorship.featured_bestie.voice_note_url && (
                                <div className="pt-2">
                                  <AudioPlayer src={sponsorship.featured_bestie.voice_note_url} />
                                </div>
                              )}

                              {sponsorship.featured_bestie.monthly_goal > 0 && (
                                <FundingProgressBar
                                  currentAmount={sponsorship.featured_bestie.current_monthly_pledges}
                                  goalAmount={sponsorship.featured_bestie.monthly_goal}
                                  endingAmount={sponsorship.total_ending_amount || 0}
                                  className="mt-4"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Messages from Bestie - only show if linked to actual user */}
                      {sponsorship.bestie_id && (
                        <div className="pt-4 border-t">
                          <SponsorMessageInbox
                            bestieId={sponsorship.bestie_id}
                            bestieName={sponsorship.bestie.display_name}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Shared Sponsorships Section */}
          {sharedWithMe.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Shared With Me</h2>
              <div className="grid gap-4">
                {sharedWithMe.map((sponsorship) => (
                  <Card key={sponsorship.id} className="border-2 border-accent/30">
                    <CardHeader>
                      <div className="flex items-center gap-4 flex-1">
                        <AvatarDisplay
                          profileAvatarId={sponsorship.bestie.profile_avatar_id}
                          displayName={sponsorship.bestie.display_name}
                          size="lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{sponsorship.bestie.display_name}</CardTitle>
                            {sponsorship.featured_bestie && (
                              <TextToSpeech 
                                text={`${sponsorship.bestie.display_name}. ${sponsorship.featured_bestie.description}`} 
                                size="icon" 
                              />
                            )}
                          </div>
                          <CardDescription>View only • Shared by guardian</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sponsorship.featured_bestie && (
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Left side - Image */}
                          <div className="relative overflow-hidden flex items-center justify-center bg-muted rounded-lg" style={{ maxHeight: '450px' }}>
                            <img
                              src={sponsorship.featured_bestie.image_url}
                              alt={sponsorship.bestie.display_name}
                              className="object-contain w-full h-full"
                              style={{ maxHeight: '450px' }}
                            />
                          </div>

                          {/* Right side - Content */}
                          <div className="space-y-4 flex flex-col justify-center">
                            {sponsorship.featured_bestie.text_sections && sponsorship.featured_bestie.text_sections.length > 0 ? (
                              sponsorship.featured_bestie.text_sections.map((section, index) => (
                                <div key={index} className="space-y-2">
                                  {section.header && (
                                    <div className={index === 0 ? "flex items-start justify-between gap-2" : ""}>
                                      <h3 className="font-script text-2xl font-bold text-primary leading-tight">
                                        {section.header}
                                      </h3>
                                      {index === 0 && (
                                        <TextToSpeech 
                                          text={`${section.header}. ${section.text}`} 
                                          size="default"
                                        />
                                      )}
                                    </div>
                                  )}
                                  {section.text && (
                                    <p className="font-script text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                                      {section.text}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-base text-muted-foreground">
                                {sponsorship.featured_bestie.description}
                              </p>
                            )}

                            {sponsorship.featured_bestie.voice_note_url && (
                              <div className="pt-2">
                                <AudioPlayer src={sponsorship.featured_bestie.voice_note_url} />
                              </div>
                            )}

                            {sponsorship.featured_bestie.monthly_goal > 0 && (
                              <FundingProgressBar
                                currentAmount={sponsorship.featured_bestie.current_monthly_pledges}
                                goalAmount={sponsorship.featured_bestie.monthly_goal}
                                endingAmount={sponsorship.total_ending_amount || 0}
                                className="mt-4"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Messages from Bestie - only show if linked to actual user */}
                      {sponsorship.bestie_id && (
                        <div className="pt-4 border-t">
                          <SponsorMessageInbox 
                            bestieId={sponsorship.bestie_id}
                            bestieName={sponsorship.bestie.display_name}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {ownSponsorships.length === 0 && sharedWithMe.length === 0 && userRole !== "caregiver" && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sponsorships yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {userRole === "bestie" 
                    ? "No sponsorships have been shared with you yet"
                    : "Sponsor a bestie to provide direct support for their programs and activities"}
                </p>
                {userRole !== "bestie" && (
                  <Button onClick={() => navigate("/sponsor-bestie")}>
                    <Heart className="w-4 h-4 mr-2" />
                    Sponsor a Bestie
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Donation History & Tax Receipts Section - Shows if user has any receipts */}
          <div className="space-y-4 mt-12">
            <div className="flex items-center gap-2 mb-6">
              <FileCheck className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Tax Receipts & Donation History</h2>
            </div>
            <DonationHistory />
          </div>
        </div>
      </main>

      <Footer />

      {/* Featured Bestie Manager Dialog */}
      {selectedBestieForFeatured && (
        <GuardianFeaturedBestieManager
          bestieId={selectedBestieForFeatured.id}
          bestieName={selectedBestieForFeatured.name}
          open={featuredBestieDialogOpen}
          onOpenChange={setFeaturedBestieDialogOpen}
        />
      )}

      {/* Change Amount Dialog */}
      <Dialog open={changingAmountFor !== null} onOpenChange={(open) => !open && setChangingAmountFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Monthly Amount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">New Monthly Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min="10"
                step="1"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <p className="text-sm text-muted-foreground">
                Minimum $10/month. Changes take effect on your next billing cycle.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangingAmountFor(null)}
              disabled={isUpdatingAmount}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAmount}
              disabled={isUpdatingAmount || !newAmount || parseFloat(newAmount) < 10}
            >
              {isUpdatingAmount ? (
                <>
                  <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                  Updating...
                </>
              ) : (
                "Update Amount"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share with Besties Dialog */}
      <Dialog open={sharingFor !== null} onOpenChange={(open) => !open && setSharingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with Besties</DialogTitle>
            <DialogDescription>
              Select which besties can view this sponsorship (read-only)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {linkedBesties.map((bestie) => (
                <div key={bestie.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={bestie.id}
                    checked={selectedBesties.has(bestie.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedBesties);
                      if (checked) {
                        newSelected.add(bestie.id);
                      } else {
                        newSelected.delete(bestie.id);
                      }
                      setSelectedBesties(newSelected);
                    }}
                  />
                  <Label
                    htmlFor={bestie.id}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <AvatarDisplay
                      profileAvatarId={bestie.profile_avatar_id}
                      displayName={bestie.display_name}
                      size="sm"
                    />
                    <span>{bestie.display_name}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSharingFor(null)}
              disabled={isSavingShares}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveShares}
              disabled={isSavingShares}
            >
              {isSavingShares ? (
                <>
                  <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
