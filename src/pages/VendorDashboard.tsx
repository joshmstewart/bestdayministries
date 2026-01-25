import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Store, Package, DollarSign, Clock, XCircle, CheckCircle, ArrowLeft, Plus } from "lucide-react";
import { ProductForm } from "@/components/vendor/ProductForm";
import { ProductList } from "@/components/vendor/ProductList";
import { VendorOrderList } from "@/components/vendor/VendorOrderList";
import { StripeConnectOnboarding } from "@/components/vendor/StripeConnectOnboarding";
import { VendorEarnings } from "@/components/vendor/VendorEarnings";
import { VendorProfileSettings } from "@/components/vendor/VendorProfileSettings";
import { VendorBestieLinkRequest } from "@/components/vendor/VendorBestieLinkRequest";
import { VendorLinkedBesties } from "@/components/vendor/VendorLinkedBesties";
import { VendorTeamManager } from "@/components/vendor/VendorTeamManager";
import { CartInsights } from "@/components/vendor/CartInsights";
import { PageLoadingState } from "@/components/common";
import { getVendorThemeOptional } from "@/lib/vendorThemePresets";

interface Vendor {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  business_name: string;
  stripe_charges_enabled?: boolean;
  theme_color?: string;
}

const VendorDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [productRefreshTrigger, setProductRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    pendingOrders: 0
  });

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);
  const isVendorOwner = selectedVendor && currentUserId ? selectedVendor.user_id === currentUserId : false;
  const [activeTab, setActiveTab] = useState("products");
  const tabsRef = useRef<HTMLDivElement>(null);
  
  // Get theme from saved vendor data (only updates when vendor data is reloaded)
  // Returns undefined for 'none' theme so no inline styles are applied
  const theme = useMemo(() => getVendorThemeOptional(selectedVendor?.theme_color), [selectedVendor?.theme_color]);

  const scrollToOrdersTab = () => {
    setActiveTab("orders");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    checkVendorStatus();
  }, []);

  // Handle vendor selection from URL params
  useEffect(() => {
    const vendorIdParam = searchParams.get('vendor');
    if (vendorIdParam && vendors.length > 0) {
      const vendorExists = vendors.find(v => v.id === vendorIdParam);
      if (vendorExists) {
        setSelectedVendorId(vendorIdParam);
      }
    }
  }, [searchParams, vendors]);

  const checkVendorStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      setCurrentUserId(user.id);

      // Check if user is admin/owner
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isAdminOrOwner = roleData?.role && ['admin', 'owner'].includes(roleData.role);

      let vendorData: Vendor[] = [];

      if (isAdminOrOwner) {
        // Admins/owners can see ALL approved vendors
        const { data, error } = await supabase
          .from('vendors')
          .select('id, user_id, status, business_name, stripe_charges_enabled, theme_color')
          .eq('status', 'approved')
          .order('business_name', { ascending: true });
        
        if (!error && data) {
          vendorData = data as Vendor[];
        }
      } else {
        // Regular users see their own vendors AND vendors they're team members of
        const { data: ownedVendors } = await supabase
          .from('vendors')
          .select('id, user_id, status, business_name, stripe_charges_enabled, theme_color')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        // Also get vendors where user is a team member
        const { data: teamMemberships } = await supabase
          .from('vendor_team_members')
          .select('vendor_id, accepted_at')
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null);
        
        const teamVendorIds = teamMemberships?.map(m => m.vendor_id) || [];
        
        let teamVendors: Vendor[] = [];
        if (teamVendorIds.length > 0) {
          const { data } = await supabase
            .from('vendors')
            .select('id, user_id, status, business_name, stripe_charges_enabled, theme_color')
            .in('id', teamVendorIds)
            .eq('status', 'approved');
          
          if (data) {
            teamVendors = data as Vendor[];
          }
        }
        
        // Combine and dedupe
        const allVendors = [...(ownedVendors || []), ...teamVendors];
        const uniqueVendorMap = new Map<string, Vendor>();
        allVendors.forEach(v => uniqueVendorMap.set(v.id, v as Vendor));
        vendorData = Array.from(uniqueVendorMap.values());
      }

      if (vendorData.length > 0) {
        setVendors(vendorData);
        
        // Select the first approved vendor, or first vendor if none approved
        const approvedVendor = vendorData.find(v => v.status === 'approved');
        const vendorIdParam = searchParams.get('vendor');
        
        if (vendorIdParam && vendorData.find(v => v.id === vendorIdParam)) {
          setSelectedVendorId(vendorIdParam);
        } else if (approvedVendor) {
          setSelectedVendorId(approvedVendor.id);
        } else {
          setSelectedVendorId(vendorData[0].id);
        }
      } else {
        // User has no vendors - they can create one
        setVendors([]);
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
      toast({
        title: "Error",
        description: "Failed to check vendor status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVendor?.status === 'approved' && selectedVendorId) {
      loadStats(selectedVendorId);
    }
  }, [selectedVendorId, selectedVendor?.status]);

  const loadStats = async (vendorId: string) => {
    try {
      // Load product count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      // Load pending orders count - ONLY items from PAID orders that are ready to ship
      // First get order items with their order status
      const { data: orderItemsData } = await supabase
        .from('order_items')
        .select('id, order_id, fulfillment_status')
        .eq('vendor_id', vendorId)
        .in('fulfillment_status', ['pending', 'in_production']);
      
      // Get the order IDs and fetch their payment status
      const orderIds = [...new Set(orderItemsData?.map(item => item.order_id) || [])];
      let readyToShipCount = 0;
      
      if (orderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, status')
          .in('id', orderIds);
        
        // Only count items from paid orders (processing, shipped, completed)
        const paidOrderIds = new Set(
          ordersData?.filter(o => ['processing', 'shipped', 'completed'].includes(o.status)).map(o => o.id) || []
        );
        
        readyToShipCount = orderItemsData?.filter(item => paidOrderIds.has(item.order_id)).length || 0;
      }

      // Load total sales (all time) - ONLY from paid orders
      const { data: allOrderItems } = await supabase
        .from('order_items')
        .select('price_at_purchase, quantity, order_id')
        .eq('vendor_id', vendorId);
      
      // Get all unique order IDs from these items
      const allOrderIds = [...new Set(allOrderItems?.map(item => item.order_id) || [])];
      let totalSales = 0;
      
      if (allOrderIds.length > 0) {
        const { data: allOrdersData } = await supabase
          .from('orders')
          .select('id, status')
          .in('id', allOrderIds);
        
        // Only count sales from paid orders (processing, shipped, completed)
        const paidOrderIdsForSales = new Set(
          allOrdersData?.filter(o => ['processing', 'shipped', 'completed'].includes(o.status)).map(o => o.id) || []
        );
        
        totalSales = allOrderItems?.filter(item => paidOrderIdsForSales.has(item.order_id))
          .reduce((sum, item) => sum + (item.price_at_purchase * item.quantity), 0) || 0;
      }

      setStats({
        totalProducts: productCount || 0,
        totalSales,
        pendingOrders: readyToShipCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSearchParams({ vendor: vendorId });
  };

  if (loading) {
    return <PageLoadingState message="Loading vendor dashboard..." />;
  }

  // No vendors at all - redirect to vendor auth
  if (vendors.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 container mx-auto px-4 pt-20 pb-12">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Store className="h-8 w-8 text-primary" />
                  <CardTitle className="text-3xl">Become a Vendor</CardTitle>
                </div>
                <CardDescription className="text-base">
                  You don't have any vendor accounts yet. Apply to become a vendor and sell your products!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/vendor-auth')} size="lg" className="w-full">
                  Apply to Become a Vendor
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 pt-20 pb-12">
        {/* Vendor Selector - show if multiple vendors */}
        {vendors.length > 1 && (
          <div className="mb-6 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Select vendor:</span>
            <Select value={selectedVendorId || ''} onValueChange={handleVendorChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    <div className="flex items-center gap-2">
                      <span>{vendor.business_name}</span>
                      {vendor.status === 'approved' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      {vendor.status === 'pending' && (
                        <Clock className="h-3 w-3 text-yellow-500" />
                      )}
                      {vendor.status === 'rejected' && (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/vendor-auth?new=true')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Vendor
            </Button>
          </div>
        )}

        {/* Single vendor - show add button */}
        {vendors.length === 1 && (
          <div className="mb-6 flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/vendor-auth?new=true')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Another Vendor
            </Button>
          </div>
        )}

        {selectedVendor?.status === 'pending' && (
          <div className="max-w-2xl mx-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="mb-6"
              onClick={() => navigate('/joyhousestore')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-yellow-600 dark:text-yellow-400">
                      {selectedVendor.business_name} - Application Pending
                    </CardTitle>
                    <CardDescription>
                      Your application is being reviewed by our admin team
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Thank you for applying to become a vendor! Our team is reviewing your application and will notify you once a decision has been made.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold">What happens next?</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Admin reviews your application</li>
                      <li>You'll receive an email notification</li>
                      <li>Once approved, you can start adding products</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedVendor?.status === 'rejected' && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-500/50 bg-red-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-red-600 dark:text-red-400">
                      {selectedVendor.business_name} - Application Not Approved
                    </CardTitle>
                    <CardDescription>
                      Your vendor application was not approved at this time
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Unfortunately, your application was not approved. This could be due to various reasons such as incomplete information or not meeting our vendor requirements.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-semibold mb-2">Need help?</p>
                    <p className="text-sm text-muted-foreground">
                      Please contact our support team for more information about your application status and how you can reapply.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedVendor?.status === 'approved' && selectedVendorId && (
          <div 
            className="space-y-6 p-6 rounded-xl -mx-4 sm:-mx-0"
            style={theme ? { backgroundColor: theme.sectionBg } : undefined}
          >
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Vendor Account</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-heading font-bold">{selectedVendor.business_name}</h1>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Approved</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/joyhousestore')}
                  >
                    View Full Store
                  </Button>
                  <Button 
                    onClick={() => navigate(`/vendors/${selectedVendorId}`)}
                    style={theme ? { 
                      backgroundColor: theme.accent,
                      color: theme.accentText 
                    } : undefined}
                    className={!theme ? "bg-primary text-primary-foreground" : ""}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    View My Store
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card 
                className="border-2"
                style={theme ? { 
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  boxShadow: theme.cardGlow
                } : undefined}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-primary" style={theme ? { color: theme.accent } : undefined} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary" style={theme ? { color: theme.accent } : undefined}>{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">Active listings</p>
                </CardContent>
              </Card>

              <Card 
                className="border-2"
                style={theme ? { 
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  boxShadow: theme.cardGlow
                } : undefined}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" style={theme ? { color: theme.accent } : undefined} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary" style={theme ? { color: theme.accent } : undefined}>${stats.totalSales.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card 
                className={`border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${
                  stats.pendingOrders > 0 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-lg shadow-emerald-500/30' 
                    : ''
                }`}
                style={stats.pendingOrders === 0 && theme ? { 
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  boxShadow: theme.cardGlow
                } : undefined}
                onClick={scrollToOrdersTab}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToOrdersTab(); }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={`text-sm font-medium ${stats.pendingOrders > 0 ? 'text-white font-semibold' : ''}`}>
                    {stats.pendingOrders > 0 ? '🚀 Ready to Ship!' : 'Ready to Ship'}
                  </CardTitle>
                  <Package className={`h-4 w-4 ${stats.pendingOrders > 0 ? 'text-white' : 'text-primary'}`} style={stats.pendingOrders === 0 && theme ? { color: theme.accent } : undefined} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.pendingOrders > 0 ? 'text-white' : 'text-primary'}`} style={stats.pendingOrders === 0 && theme ? { color: theme.accent } : undefined}>{stats.pendingOrders}</div>
                  <p className={`text-xs ${stats.pendingOrders > 0 ? 'text-emerald-100 font-medium' : 'text-muted-foreground'}`}>
                    {stats.pendingOrders > 0 ? 'Click here to fulfill orders →' : 'Paid orders awaiting shipment'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Cart Insights */}
            <CartInsights vendorId={selectedVendorId} theme={theme} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" ref={tabsRef}>
              <TabsList className="inline-flex flex-wrap h-auto gap-2 bg-muted/50 p-1.5 rounded-lg mb-6">
                <TabsTrigger 
                  value="products" 
                  className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger 
                  value="orders" 
                  className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                >
                  Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="earnings" 
                  className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                >
                  Earnings
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                >
                  Payments
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="whitespace-nowrap px-6 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                >
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="products" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">Your Products</h2>
                  <ProductForm 
                    vendorId={selectedVendorId} 
                    onSuccess={() => {
                      loadStats(selectedVendorId);
                      setProductRefreshTrigger(prev => prev + 1);
                    }} 
                  />
                </div>
                <ProductList 
                  vendorId={selectedVendorId} 
                  refreshTrigger={productRefreshTrigger} 
                  stripeChargesEnabled={selectedVendor?.stripe_charges_enabled}
                  theme={theme}
                />
              </TabsContent>
              
              <TabsContent value="orders">
                <VendorOrderList vendorId={selectedVendorId} theme={theme} />
              </TabsContent>

              <TabsContent value="earnings" className="space-y-4">
                <h2 className="text-2xl font-semibold">Your Earnings</h2>
                <VendorEarnings vendorId={selectedVendorId} theme={theme} />
              </TabsContent>
              
              <TabsContent value="payments" className="space-y-6">
                <h2 className="text-2xl font-semibold">Payment Settings</h2>
                <StripeConnectOnboarding vendorId={selectedVendorId} readOnly={!isVendorOwner} theme={theme} />
                
                {/* 1099 Tax Information */}
                <Card 
                  className="border-2"
                  style={{ 
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                    boxShadow: theme.cardGlow
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" style={{ color: theme.accent }} />
                      1099 Tax Reporting – Handled by Stripe
                    </CardTitle>
                    <CardDescription>
                      Good news! You don't need to worry about 1099 paperwork.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      When you completed Stripe Connect onboarding, you provided your tax information (legal name, address, and Tax ID). Stripe uses this to automatically handle your 1099-K tax reporting.
                    </p>
                    
                    <div className="bg-background/60 rounded-lg p-4 space-y-3">
                      <p className="font-medium text-sm">What Stripe does for you:</p>
                      <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li>Issues <strong>1099-K forms</strong> if you receive $600 or more in a calendar year</li>
                        <li>Files the 1099-K with the IRS automatically</li>
                        <li>Sends you a copy by <strong>January 31st</strong> each year</li>
                        <li>Stores your tax documents in your Stripe dashboard</li>
                      </ul>
                    </div>
                    
                    <div className="bg-background/60 rounded-lg p-4 space-y-3">
                      <p className="font-medium text-sm">What you need to do:</p>
                      <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li>Keep your tax information up to date in Stripe</li>
                        <li>Look for your 1099-K after January 31st if you earned $600+</li>
                        <li>Include the income on your tax return</li>
                      </ul>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> The $600 threshold applies per calendar year. If you earned less than $600, you typically won't receive a 1099-K, but you're still responsible for reporting the income on your taxes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Store Settings</h2>
                  <VendorProfileSettings 
                    vendorId={selectedVendorId} 
                    theme={theme}
                    onThemeSaved={(themeColor) => {
                      // Update vendor theme in local state so dashboard updates immediately
                      setVendors(prev => prev.map(v => 
                        v.id === selectedVendorId 
                          ? { ...v, theme_color: themeColor } 
                          : v
                      ));
                    }}
                  />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">Team Members</h3>
                  <VendorTeamManager vendorId={selectedVendorId} theme={theme} />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">Link to Besties</h3>
                  <div className="space-y-6">
                    <VendorBestieLinkRequest vendorId={selectedVendorId} theme={theme} />
                    <VendorLinkedBesties vendorId={selectedVendorId} theme={theme} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default VendorDashboard;
