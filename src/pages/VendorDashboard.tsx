import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, Package, DollarSign } from "lucide-react";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendorStatus, setVendorStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'suspended'>('none');

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

      const { data: vendor } = await supabase
        .from('vendors')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (vendor) {
        setVendorStatus(vendor.status);
      } else {
        setVendorStatus('none');
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
    } finally {
      setLoading(false);
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
            <Card>
              <CardHeader>
                <CardTitle>Application Pending</CardTitle>
                <CardDescription>
                  Thank you for applying! We're reviewing your application and will notify you soon.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {vendorStatus === 'rejected' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>
                  Unfortunately, your application was not approved at this time. Please contact support for more information.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {vendorStatus === 'approved' && (
          <div className="space-y-6">
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
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Active listings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
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
                  <Button>Add Product</Button>
                </div>
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No products yet. Add your first product to get started!</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="orders">
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <p>No orders yet</p>
                    </div>
                  </CardContent>
                </Card>
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
