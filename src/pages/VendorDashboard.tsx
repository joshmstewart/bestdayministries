import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, Package, DollarSign, Clock, XCircle, CheckCircle, ArrowLeft, Plus } from "lucide-react";
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

interface Vendor {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  business_name: string;
}

const VendorDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [productRefreshTrigger, setProductRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    pendingOrders: 0
  });

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

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

      const { data: vendorData, error } = await supabase
        .from('vendors')
        .select('id, status, business_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && vendorData && vendorData.length > 0) {
        setVendors(vendorData as Vendor[]);
        
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

      // Load pending orders count (items not yet shipped or delivered)
      const { count: orderCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .in('fulfillment_status', ['pending', 'in_production']);

      // Load total sales (all time)
      const { data: salesData } = await supabase
        .from('order_items')
        .select('price_at_purchase, quantity')
        .eq('vendor_id', vendorId);

      const totalSales = salesData?.reduce((sum, item) => 
        sum + (item.price_at_purchase * item.quantity), 0
      ) || 0;

      setStats({
        totalProducts: productCount || 0,
        totalSales,
        pendingOrders: orderCount || 0
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
          <div className="space-y-6">
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
                    onClick={() => navigate(`/vendors/${selectedVendorId}`)}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    View Your Store
                  </Button>
                  <Button onClick={() => navigate('/joyhousestore')}>
                    View Store
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">Active listings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalSales.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                  <p className="text-xs text-muted-foreground">Awaiting shipment</p>
                </CardContent>
              </Card>
            </div>

            {/* Cart Insights */}
            <CartInsights vendorId={selectedVendorId} />

            <Tabs defaultValue="products" className="w-full">
              <TabsList className="inline-flex flex-wrap h-auto">
                <TabsTrigger value="products" className="whitespace-nowrap">Products</TabsTrigger>
                <TabsTrigger value="orders" className="whitespace-nowrap">Orders</TabsTrigger>
                <TabsTrigger value="earnings" className="whitespace-nowrap">Earnings</TabsTrigger>
                <TabsTrigger value="payments" className="whitespace-nowrap">Payments</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
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
                <ProductList vendorId={selectedVendorId} refreshTrigger={productRefreshTrigger} />
              </TabsContent>
              
              <TabsContent value="orders">
                <VendorOrderList vendorId={selectedVendorId} />
              </TabsContent>

              <TabsContent value="earnings" className="space-y-4">
                <h2 className="text-2xl font-semibold">Your Earnings</h2>
                <VendorEarnings vendorId={selectedVendorId} />
              </TabsContent>
              
              <TabsContent value="payments" className="space-y-4">
                <h2 className="text-2xl font-semibold">Payment Settings</h2>
                <StripeConnectOnboarding vendorId={selectedVendorId} />
              </TabsContent>

              <TabsContent value="settings" className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Store Settings</h2>
                  <VendorProfileSettings vendorId={selectedVendorId} />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">Team Members</h3>
                  <VendorTeamManager vendorId={selectedVendorId} />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">Link to Besties</h3>
                  <div className="space-y-6">
                    <VendorBestieLinkRequest vendorId={selectedVendorId} />
                    <VendorLinkedBesties vendorId={selectedVendorId} />
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
