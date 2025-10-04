import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, Package, DollarSign, Clock, XCircle, CheckCircle } from "lucide-react";
import { ProductForm } from "@/components/vendor/ProductForm";
import { ProductList } from "@/components/vendor/ProductList";
import { VendorOrderList } from "@/components/vendor/VendorOrderList";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendorStatus, setVendorStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'suspended'>('none');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    pendingOrders: 0
  });

  useEffect(() => {
    checkVendorStatus();
  }, []);

  const checkVendorStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && vendor) {
        setVendorStatus(vendor.status);
        setVendorId(vendor.id);
        
        if (vendor.status === 'approved') {
          loadStats(vendor.id);
        }
      } else {
        setVendorStatus('none');
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (vendorId: string) => {
    try {
      // Load product count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      // Load pending orders count
      const { count: orderCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('fulfillment_status', 'pending');

      // Load total sales (this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: salesData } = await supabase
        .from('order_items')
        .select('price_at_purchase, quantity')
        .eq('vendor_id', vendorId)
        .gte('created_at', startOfMonth.toISOString());

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

  const applyToBeVendor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          business_name: 'My Shop', // This will be customizable in a form
          description: '',
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon."
      });

      setVendorStatus('pending');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        {vendorStatus === 'none' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Store className="h-8 w-8 text-primary" />
                  <CardTitle className="text-3xl">Become a Vendor</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Join our marketplace and sell your handmade products to our community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Benefits:</h3>
                  <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                    <li>Reach our engaged community of supporters</li>
                    <li>Easy product management dashboard</li>
                    <li>Automatic payment processing</li>
                    <li>Manage your own inventory and fulfillment</li>
                    <li>Low commission fees</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Requirements:</h3>
                  <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                    <li>Products must be handmade or designed by you</li>
                    <li>Responsible for shipping and customer service</li>
                    <li>Maintain accurate inventory</li>
                    <li>Ship orders within 3-5 business days</li>
                  </ul>
                </div>

                <Button onClick={applyToBeVendor} size="lg" className="w-full">
                  Apply Now
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {vendorStatus === 'pending' && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-yellow-600 dark:text-yellow-400">Vendor Application Pending</CardTitle>
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

        {vendorStatus === 'rejected' && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-500/50 bg-red-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-red-600 dark:text-red-400">Application Not Approved</CardTitle>
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

        {vendorStatus === 'approved' && (
          <div className="space-y-6">
            <Card className="border-green-500/50 bg-green-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-600 dark:text-green-400">Vendor Approved</p>
                    <p className="text-sm text-muted-foreground">You can now manage your products and sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-heading font-bold">Vendor Dashboard</h1>
              <Button onClick={() => navigate('/marketplace')}>
                View Marketplace
              </Button>
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

            <Tabs defaultValue="products" className="w-full">
              <TabsList>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="products" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">Your Products</h2>
                  {vendorId && (
                    <ProductForm vendorId={vendorId} onSuccess={() => loadStats(vendorId)} />
                  )}
                </div>
                {vendorId && <ProductList vendorId={vendorId} />}
              </TabsContent>
              
              <TabsContent value="orders">
                <VendorOrderList vendorId={vendorId!} />
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Settings</CardTitle>
                    <CardDescription>
                      Manage your vendor profile and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Settings coming soon</p>
                  </CardContent>
                </Card>
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
