import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Store, ArrowLeft, Info, ChevronDown, Package, CreditCard, Truck, HelpCircle, Heart, Users, Sparkles, ShoppingBag, Home } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { AvatarPicker } from "@/components/AvatarPicker";

const PRODUCT_CATEGORIES = [
  "Handmade Crafts",
  "Jewelry & Accessories",
  "Art & Prints",
  "Home Decor",
  "Clothing & Apparel",
  "Food & Treats",
  "Bath & Beauty",
  "Toys & Games",
  "Stationery & Paper Goods",
  "Pet Products",
  "Other"
];

const VendorAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(true);
  const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [otherCategoryText, setOtherCategoryText] = useState("");
  const [processingDays, setProcessingDays] = useState("3");
  const [agreedToVendorTerms, setAgreedToVendorTerms] = useState(false);
  const [acceptedUserTerms, setAcceptedUserTerms] = useState(false);
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<"bestie" | "caregiver" | "supporter">("supporter");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  // Fetch the logo from database
  const { data: logoData } = useQuery({
    queryKey: ['app-logo'],
    queryFn: async () => {
      const { data } = await supabase
        .rpc('get_public_app_settings')
        .returns<Array<{ setting_key: string; setting_value: any }>>();
      
      const logoSetting = data?.find((s) => s.setting_key === 'logo_url');
      
      if (logoSetting?.setting_value) {
        try {
          return typeof logoSetting.setting_value === 'string' 
            ? JSON.parse(logoSetting.setting_value) 
            : logoSetting.setting_value;
        } catch {
          return logoSetting.setting_value;
        }
      }
      return null;
    }
  });

  useEffect(() => {
    const newParam = searchParams.get('new');
    
    const checkVendorAccess = async (userId: string) => {
      // Check if user owns any vendors
      const { data: ownedVendors } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId);
      
      if (ownedVendors && ownedVendors.length > 0) {
        return true;
      }
      
      // Check if user is a team member of any vendors
      const { data: teamMemberships } = await supabase
        .from('vendor_team_members')
        .select('vendor_id, accepted_at')
        .eq('user_id', userId)
        .not('accepted_at', 'is', null);
      
      if (teamMemberships && teamMemberships.length > 0) {
        return true;
      }
      
      return false;
    };
    
    // Check if user is already logged in
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setExistingUser({ id: session.user.id, email: session.user.email || '' });
        
        // If ?new=true, show form to add new vendor
        if (newParam === 'true') {
          setIsAddingNewVendor(true);
          return;
        }
        
        // Check if they have vendor access (owned or team member)
        const hasAccess = await checkVendorAccess(session.user.id);
        if (hasAccess) {
          navigate("/vendor-dashboard", { replace: true });
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && event === 'SIGNED_IN') {
        setExistingUser({ id: session.user.id, email: session.user.email || '' });
        
        // If adding new vendor, don't redirect
        if (newParam === 'true') {
          setIsAddingNewVendor(true);
          return;
        }
        
        // Check if they have vendor access (owned or team member)
        const hasAccess = await checkVendorAccess(session.user.id);
        if (hasAccess) {
          navigate("/vendor-dashboard", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // If unchecking "Other", clear the text field
        if (category === "Other") {
          setOtherCategoryText("");
        }
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  // Get final categories array including "Other" specification
  const getFinalCategories = () => {
    return selectedCategories.map(cat => 
      cat === "Other" && otherCategoryText.trim() 
        ? `Other: ${otherCategoryText.trim()}` 
        : cat
    );
  };

  const handleAddNewVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingUser) return;
    
    if (!agreedToVendorTerms) {
      toast({
        title: "Terms Required",
        description: "You must agree to the vendor terms to submit your application.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "Categories Required",
        description: "Please select at least one product category.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      // Create vendor record with pending status
      const { error: vendorError } = await supabase
        .from('vendors')
        .insert({
          user_id: existingUser.id,
          business_name: businessName,
          description: businessDescription,
          product_categories: getFinalCategories(),
          estimated_processing_days: parseInt(processingDays),
          agreed_to_vendor_terms: true,
          agreed_to_terms_at: new Date().toISOString(),
          status: 'pending',
        });

      if (vendorError) throw vendorError;

      toast({
        title: "Vendor Application Submitted!",
        description: "Your application is pending admin approval. You'll be notified once approved.",
      });

      // Redirect to vendor dashboard
      navigate("/vendor-dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToVendorTerms) {
      toast({
        title: "Vendor Terms Required",
        description: "You must agree to the vendor terms to submit your application.",
        variant: "destructive",
      });
      return;
    }

    if (!acceptedUserTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service and Privacy Policy to create an account.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "Categories Required",
        description: "Please select at least one product category.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      // Create user account with role and avatar
      const { data, error: signUpError } = await supabasePersistent.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role: role,
            avatar_url: selectedAvatar ? `avatar-${selectedAvatar}` : null,
          },
          emailRedirectTo: `${window.location.origin}/vendor-dashboard`,
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Failed to create user");

      // Record terms acceptance immediately after successful signup
      if (acceptedUserTerms) {
        try {
          const termsResult = await supabase.functions.invoke("record-terms-acceptance", {
            body: {
              termsVersion: "1.0",
              privacyVersion: "1.0",
            },
          });
          
          if (termsResult.error) {
            console.error("⚠️ Terms recording failed:", termsResult.error);
          }
        } catch (termsError) {
          console.error("⚠️ Error recording terms:", termsError);
        }
      }

      // Subscribe to newsletter if checked
      if (subscribeToNewsletter) {
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await supabase.from("newsletter_subscribers").upsert({
            email,
            user_id: data.user.id,
            status: 'active',
            source: 'vendor_signup',
            timezone,
          }, {
            onConflict: 'email'
          });
          
          // Trigger welcome email
          setTimeout(() => {
            supabase.functions.invoke("send-automated-campaign", {
              body: {
                trigger_event: "newsletter_signup",
                recipient_email: email,
                recipient_user_id: data.user.id,
              },
            });
          }, 0);
        } catch (newsletterError) {
          console.error("Error subscribing to newsletter:", newsletterError);
          // Don't block signup if newsletter subscription fails
        }
      }
      
      // Trigger account created email
      setTimeout(() => {
        supabase.functions.invoke("send-automated-campaign", {
          body: {
            trigger_event: "site_signup",
            recipient_email: email,
            recipient_user_id: data.user.id,
          },
        });
      }, 0);

      // Create vendor record with pending status and application details
      const { error: vendorError } = await supabase
        .from('vendors')
        .insert({
          user_id: data.user.id,
          business_name: businessName,
          description: businessDescription,
          product_categories: getFinalCategories(),
          estimated_processing_days: parseInt(processingDays),
          agreed_to_vendor_terms: true,
          agreed_to_terms_at: new Date().toISOString(),
          status: 'pending',
        });

      if (vendorError) throw vendorError;

      // Notify admins about the new vendor application
      setTimeout(() => {
        supabase.functions.invoke("send-vendor-application-email", {
          body: {
            vendorId: data.user.id,
            businessName,
            businessDescription,
            productCategories: getFinalCategories(),
            applicantEmail: email,
          },
        }).catch(err => console.error("Error sending admin notification:", err));
      }, 0);

      toast({
        title: "Vendor Application Submitted!",
        description: "Your application is pending admin approval. You'll be notified once approved.",
      });

      // Redirect to vendor dashboard to show pending status
      navigate("/vendor-dashboard");
    } catch (error: any) {
      // Check if this is a "user already exists" error
      if (error.message?.includes("already registered") || error.code === "user_already_exists") {
        toast({
          title: "Account Already Exists",
          description: "You already have an account. Please sign in below to add your vendor application.",
        });
        // Switch to sign-in mode
        setIsSignUp(false);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, data } = await supabasePersistent.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if they're a vendor
      if (data.user) {
        const { data: vendors, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', data.user.id);

        if (vendorError) throw vendorError;

        if (!vendors || vendors.length === 0) {
          // They have an account but aren't a vendor - let them create one
          setExistingUser({ id: data.user.id, email: data.user.email || '' });
          setIsAddingNewVendor(true);
          toast({
            title: "No Vendor Account",
            description: "You don't have a vendor account yet. Create one below!",
          });
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Redirecting to your vendor dashboard...",
        });
        
        navigate("/vendor-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show "Add New Vendor" form for logged-in users
  if (isAddingNewVendor && existingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <Card className="w-full max-w-lg border-2 shadow-xl relative z-10 max-h-[90vh] overflow-y-auto">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Store className="w-8 h-8 text-primary" />
                <span className="text-2xl font-bold text-primary">Vendor Application</span>
              </div>
              
              {logoData && (
                <img 
                  src={logoData} 
                  alt="Best Day Ministries" 
                  className="h-16 mx-auto object-contain"
                />
              )}
              
              <div>
                <h1 className="text-2xl font-black text-foreground mb-2">
                  Create Another Vendor
                </h1>
                <p className="text-muted-foreground text-sm">
                  Logged in as {existingUser.email}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddNewVendor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Your Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessDescription">Business Description *</Label>
                <Textarea
                  id="businessDescription"
                  placeholder="Tell us about your business and what makes your products special..."
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Product Categories * <span className="text-muted-foreground text-xs">(select all that apply)</span></Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-background">
                  {PRODUCT_CATEGORIES.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => toggleCategory(category)}
                      />
                      <label
                        htmlFor={`cat-${category}`}
                        className="text-sm cursor-pointer"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedCategories.includes("Other") && (
                  <Input
                    placeholder="Please specify what type of products..."
                    value={otherCategoryText}
                    onChange={(e) => setOtherCategoryText(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="processingDays">Order Processing Time *</Label>
                <Select value={processingDays} onValueChange={setProcessingDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select processing time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-2 business days</SelectItem>
                    <SelectItem value="3">3-5 business days</SelectItem>
                    <SelectItem value="7">5-7 business days</SelectItem>
                    <SelectItem value="14">1-2 weeks</SelectItem>
                    <SelectItem value="21">2-3 weeks (custom orders)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">How long to prepare orders before shipping</p>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm space-y-3">
                <p className="font-semibold text-foreground">Vendor Terms & Commitments:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Process and ship orders within stated timeframe</li>
                  <li>Respond to customer inquiries within 48 hours</li>
                  <li>Maintain accurate product inventory</li>
                  <li className="flex items-center gap-1 list-none ml-4">
                    <span className="mr-1">•</span>
                    Accept the marketplace commission structure (20%)
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="inline-flex items-center text-primary hover:text-primary/80">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Commission Structure
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 text-sm">
                          <p className="text-muted-foreground">
                            Our marketplace charges a <strong className="text-foreground">20% commission</strong> on each sale to cover:
                          </p>
                          <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span><strong className="text-foreground">Payment processing</strong> - Stripe fees and secure transactions</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span><strong className="text-foreground">Platform hosting</strong> - Website, infrastructure, and maintenance</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span><strong className="text-foreground">Customer support</strong> - Helping customers find your products</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span><strong className="text-foreground">Marketing</strong> - Promoting the marketplace and vendors</span>
                            </li>
                          </ul>
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="font-medium text-foreground mb-1">Example:</p>
                            <p className="text-muted-foreground">
                              You sell a product for <strong className="text-foreground">$50</strong><br />
                              Commission (20%): <strong className="text-foreground">$10</strong><br />
                              Your payout: <strong className="text-primary">$40</strong>
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </li>
                  <li>Provide tracking information for shipped orders</li>
                  <li>Handle returns and customer issues professionally</li>
                </ul>
                
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium w-full pt-2 border-t border-accent/20">
                      <HelpCircle className="h-4 w-4" />
                      <span>How does selling work?</span>
                      <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">1. Receive Orders</p>
                          <p className="text-muted-foreground text-xs">When a customer buys your product, you'll see the order in your Vendor Dashboard with all shipping details.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Truck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">2. Ship & Add Tracking</p>
                          <p className="text-muted-foreground text-xs">Prepare the order, ship it, then enter the tracking number in your dashboard. The customer will be notified automatically.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">3. Get Paid</p>
                          <p className="text-muted-foreground text-xs">Once you add tracking and mark the order as shipped, your payout (minus 20% commission) is transferred to your connected Stripe account.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Stripe Connect Required</p>
                      <p>After approval, you'll set up Stripe Connect to receive payments directly to your bank account. This is secure and handles all payment processing.</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                <div className="flex items-start space-x-2 pt-2 border-t border-accent/20">
                  <Checkbox
                    id="agreeVendorTerms"
                    checked={agreedToVendorTerms}
                    onCheckedChange={(checked) => setAgreedToVendorTerms(checked as boolean)}
                  />
                  <label
                    htmlFor="agreeVendorTerms"
                    className="text-sm cursor-pointer leading-tight"
                  >
                    I agree to these vendor terms and commit to providing excellent service to customers
                  </label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
                disabled={loading || !agreedToVendorTerms}
              >
                {loading ? "Please wait..." : "Submit Application"}
              </Button>
            </form>

            <div className="pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/vendor-dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4 relative overflow-auto">
      {/* Decorative elements - pointer-events-none allows scrolling through them */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

        <Card className="w-full max-w-lg border-2 shadow-xl relative z-10 max-h-[90vh] overflow-y-auto">
          <CardContent className="p-8 space-y-6">
            {/* Navigation buttons at top */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/joyhousestore")}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Joy House Store
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
              >
                <Home className="w-4 h-4 mr-2" />
                Homepage
              </Button>
            </div>

            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Store className="w-8 h-8 text-primary" />
                <span className="text-2xl font-bold text-primary">Vendor Portal</span>
              </div>
              
              {logoData && (
                <img 
                  src={logoData} 
                  alt="Best Day Ministries" 
                  className="h-16 mx-auto object-contain"
                />
              )}
              
              <div>
                <h1 className="text-2xl font-black text-foreground mb-2">
                  {isSignUp ? "Become a Vendor" : "Vendor Sign In"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {isSignUp 
                    ? "Apply to become a vendor and sell your products" 
                    : "Sign in to manage your vendor account"}
                </p>
              </div>
            </div>

            {/* Prominent "Already have an account?" banner for signup mode */}
            {isSignUp && (
              <div className="bg-secondary/20 border border-secondary/40 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">
                      Already have an account?
                    </p>
                    <p className="text-muted-foreground text-sm">
                      If you've already created an account on our site, you don't need to fill out this form. 
                      Just sign in below, then go to the <strong>Marketplace</strong> and click <strong>"Become a Vendor"</strong> to submit your application.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setIsSignUp(false)}
                >
                  Sign In to Existing Account
                </Button>
              </div>
            )}

            <form onSubmit={isSignUp ? handleVendorSignUp : handleVendorSignIn} className="space-y-6">
              {isSignUp ? (
                <>
                  {/* SECTION 1: Account Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                      <h3 className="font-semibold text-foreground">Account Information</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName">Your Name *</Label>
                      <Input
                        id="displayName"
                        placeholder="John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="vendor@business.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">I am a...</Label>
                      <Select value={role} onValueChange={(value: any) => setRole(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bestie">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-primary" />
                              <span className="font-semibold">Bestie (Adult with Special Needs)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="caregiver">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-secondary" />
                              <span className="font-semibold">Guardian</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="supporter">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-accent" />
                              <span className="font-semibold">Supporter (Volunteer/Friend)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <AvatarPicker 
                      selectedAvatar={selectedAvatar} 
                      onSelectAvatar={setSelectedAvatar}
                    />

                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="newsletter" 
                        checked={subscribeToNewsletter}
                        onCheckedChange={(checked) => setSubscribeToNewsletter(checked as boolean)}
                      />
                      <label
                        htmlFor="newsletter"
                        className="text-sm text-muted-foreground leading-none cursor-pointer"
                      >
                        Send me monthly updates and inspiring stories
                      </label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="userTerms" 
                        checked={acceptedUserTerms}
                        onCheckedChange={(checked) => setAcceptedUserTerms(checked as boolean)}
                      />
                      <label
                        htmlFor="userTerms"
                        className="text-sm text-muted-foreground leading-none"
                      >
                        I agree to the{" "}
                        <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>

                  {/* SECTION 2: Vendor Application */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                      <h3 className="font-semibold text-foreground">Vendor Application</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        placeholder="Your Business Name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessDescription">Business Description *</Label>
                      <Textarea
                        id="businessDescription"
                        placeholder="Tell us about your business and what makes your products special..."
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                        required
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Product Categories * <span className="text-muted-foreground text-xs">(select all that apply)</span></Label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3 bg-background">
                        {PRODUCT_CATEGORIES.map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={`signup-cat-${category}`}
                              checked={selectedCategories.includes(category)}
                              onCheckedChange={() => toggleCategory(category)}
                            />
                            <label
                              htmlFor={`signup-cat-${category}`}
                              className="text-sm cursor-pointer"
                            >
                              {category}
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedCategories.includes("Other") && (
                        <Input
                          placeholder="Please specify what type of products..."
                          value={otherCategoryText}
                          onChange={(e) => setOtherCategoryText(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupProcessingDays">Order Processing Time *</Label>
                      <Select value={processingDays} onValueChange={setProcessingDays}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select processing time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1-2 business days</SelectItem>
                          <SelectItem value="3">3-5 business days</SelectItem>
                          <SelectItem value="7">5-7 business days</SelectItem>
                          <SelectItem value="14">1-2 weeks</SelectItem>
                          <SelectItem value="21">2-3 weeks (custom orders)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">How long to prepare orders before shipping</p>
                    </div>

                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm space-y-3">
                      <p className="font-semibold text-foreground">Vendor Terms & Commitments:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Process and ship orders within stated timeframe</li>
                        <li>Respond to customer inquiries within 48 hours</li>
                        <li>Maintain accurate product inventory</li>
                        <li className="flex items-center gap-1 list-none ml-4">
                          <span className="mr-1">•</span>
                          Accept the marketplace commission structure (20%)
                          <Dialog>
                            <DialogTrigger asChild>
                              <button type="button" className="inline-flex items-center text-primary hover:text-primary/80">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <CreditCard className="h-5 w-5 text-primary" />
                                  Commission Structure
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 text-sm">
                                <p className="text-muted-foreground">
                                  Our marketplace charges a <strong className="text-foreground">20% commission</strong> on each sale to cover:
                                </p>
                                <ul className="space-y-2 text-muted-foreground">
                                  <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong className="text-foreground">Payment processing</strong> - Stripe fees and secure transactions</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong className="text-foreground">Platform hosting</strong> - Website, infrastructure, and maintenance</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong className="text-foreground">Customer support</strong> - Helping customers find your products</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong className="text-foreground">Marketing</strong> - Promoting the marketplace and vendors</span>
                                  </li>
                                </ul>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="font-medium text-foreground mb-1">Example:</p>
                                  <p className="text-muted-foreground">
                                    You sell a product for <strong className="text-foreground">$50</strong><br />
                                    Commission (20%): <strong className="text-foreground">$10</strong><br />
                                    Your payout: <strong className="text-primary">$40</strong>
                                  </p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </li>
                        <li>Provide tracking information for shipped orders</li>
                        <li>Handle returns and customer issues professionally</li>
                      </ul>
                      
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium w-full pt-2 border-t border-accent/20">
                            <HelpCircle className="h-4 w-4" />
                            <span>How does selling work?</span>
                            <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]:rotate-180" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">
                                <Package className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">1. Receive Orders</p>
                                <p className="text-muted-foreground text-xs">When a customer buys your product, you'll see the order in your Vendor Dashboard with all shipping details.</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">
                                <Truck className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">2. Ship & Add Tracking</p>
                                <p className="text-muted-foreground text-xs">Prepare the order, ship it, then enter the tracking number in your dashboard. The customer will be notified automatically.</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">
                                <CreditCard className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">3. Get Paid</p>
                                <p className="text-muted-foreground text-xs">Once you add tracking and mark the order as shipped, your payout (minus 20% commission) is transferred to your connected Stripe account.</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">Stripe Connect Required</p>
                            <p>After approval, you'll set up Stripe Connect to receive payments directly to your bank account. This is secure and handles all payment processing.</p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      
                      <div className="flex items-start space-x-2 pt-2 border-t border-accent/20">
                        <Checkbox
                          id="signupAgreeVendorTerms"
                          checked={agreedToVendorTerms}
                          onCheckedChange={(checked) => setAgreedToVendorTerms(checked as boolean)}
                        />
                        <label
                          htmlFor="signupAgreeVendorTerms"
                          className="text-sm cursor-pointer leading-tight"
                        >
                          I agree to these vendor terms and commit to providing excellent service to customers
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vendor@business.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all hover:scale-105"
                disabled={loading || (isSignUp && (!agreedToVendorTerms || !acceptedUserTerms))}
              >
                {loading ? "Please wait..." : isSignUp ? "Submit Application" : "Sign In"}
              </Button>
            </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-semibold"
            >
              {isSignUp 
                ? "Already a vendor? Sign in" 
                : "Need to apply? Sign up"}
            </button>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regular User Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorAuth;
