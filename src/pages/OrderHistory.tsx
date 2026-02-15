import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Package, Truck, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  fulfillment_status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  vendor_id: string | null;
  products: {
    name: string;
    images: string[];
    is_printify_product: boolean;
  };
  vendors: {
    business_name: string;
  } | null;
}

interface ShippingAddress {
  name: string;
  line1?: string;
  line2?: string;
  street?: string; // legacy field
  city: string;
  state: string;
  zip?: string;
  postal_code?: string;
  country?: string;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  shipping_address: ShippingAddress;
  order_items: OrderItem[];
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Guest lookup state
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  
  // Search filter for authenticated users
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [guestOrder, setGuestOrder] = useState<Order | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    
    if (user) {
      fetchOrders(user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total_amount,
          status,
          shipping_address,
          order_items (
            id,
            product_id,
            vendor_id,
            quantity,
            price_at_purchase,
            fulfillment_status,
            tracking_number,
            tracking_url,
            carrier,
            products (
              name,
              images,
              is_printify_product
            ),
            vendors (
              business_name
            )
          )
        `)
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as unknown) as Order[]);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showErrorToastWithCopy("Failed to load orders", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber.trim() || !email.trim()) {
      showErrorToast("Please enter both order number and email");
      return;
    }

    setLookupLoading(true);
    setGuestOrder(null);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-guest-order', {
        body: { orderNumber: orderNumber.trim(), email: email.trim() }
      });

      if (error) throw error;
      
      if (data.error) {
        showErrorToast(data.error);
        return;
      }

      setGuestOrder(data.order as Order);
      toast.success("Order found!");
    } catch (error) {
      console.error("Error looking up order:", error);
      showErrorToastWithCopy("Failed to find order", error);
    } finally {
      setLookupLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-800 border-green-300";
      case "shipped":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "in_production":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "processing":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "in_production":
        return "In Production";
      case "processing":
        return "Processing";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getEffectiveOrderStatus = (order: Order) => {
    const itemStatuses = order.order_items.map(item => item.fulfillment_status);
    
    if (itemStatuses.every(s => s === "delivered")) return "delivered";
    if (itemStatuses.some(s => s === "shipped" || s === "delivered")) return "shipped";
    if (itemStatuses.some(s => s === "in_production")) return "in_production";
    if (itemStatuses.some(s => s === "processing")) return "processing";
    return order.status;
  };

  const renderOrder = (order: Order) => (
    <Card key={order.id}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </CardTitle>
            <CardDescription>
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={`${getStatusColor(getEffectiveOrderStatus(order))} font-medium`}>
            {formatStatus(getEffectiveOrderStatus(order))}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.shipping_address && (
          <div>
            <h3 className="font-semibold mb-2">Shipping To:</h3>
            <p className="text-sm text-muted-foreground">
              {order.shipping_address.name}<br />
              {order.shipping_address.line1 || order.shipping_address.street}
              {order.shipping_address.line2 && <><br />{order.shipping_address.line2}</>}<br />
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code || order.shipping_address.zip}
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold">Items:</h3>
          {order.order_items.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
              {item.products.images?.[0] && (
                <img
                  src={item.products.images[0]}
                  alt={item.products.name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.products.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.products.is_printify_product 
                        ? "Joy House Merch" 
                        : item.vendors?.business_name || "Joy House Store"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} × ${item.price_at_purchase}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(item.fulfillment_status)} font-medium`}>
                    {formatStatus(item.fulfillment_status)}
                  </Badge>
                </div>

                {item.tracking_number && (
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-md">
                    <Truck className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {item.carrier?.toUpperCase()} Tracking: {item.tracking_number}
                      </p>
                      {item.tracking_url && (
                        <Button
                          variant="link"
                          className="h-auto p-0 text-sm"
                          onClick={() => window.open(item.tracking_url!, "_blank")}
                        >
                          Track Package <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {item.fulfillment_status === "pending" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="w-4 h-4" />
                    <span>Waiting for vendor to ship</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-semibold">Total:</span>
          <span className="text-xl font-bold">${order.total_amount}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        <UnifiedHeader />
        <main className="pt-24 container mx-auto p-6">
          <div className="text-center">Loading your orders...</div>
        </main>
        <Footer />
      </div>
    );
  }

  // Guest lookup view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        <UnifiedHeader />
        <main className="pt-24 container mx-auto p-6 space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Order Lookup</h1>
          <Button variant="outline" onClick={() => navigate("/joyhousestore")}>
            Browse Store
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Your Order
            </CardTitle>
            <CardDescription>
              Enter your order number and the email address you used when placing the order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGuestLookup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g., A1B2C3D4"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The order number from your confirmation email (first 8 characters)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={lookupLoading}>
                {lookupLoading ? "Looking up..." : "Find Order"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {guestOrder && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => setGuestOrder(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Look up another order
            </Button>
            {renderOrder(guestOrder)}
          </div>
        )}

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Have an account?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto" 
                onClick={() => navigate("/auth")}
              >
                Sign in
              </Button>{" "}
              to see all your orders in one place.
            </p>
          </CardContent>
        </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Authenticated view with no orders
  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        <UnifiedHeader />
        <main className="pt-24 container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>You haven't placed any orders yet</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/joyhousestore")}>
                Browse Store
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Filter orders by search query
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase().replace(/^#/, ''))
  );

  // Authenticated view with orders
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <UnifiedHeader />
      <main className="pt-24 container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <Button variant="outline" onClick={() => navigate("/joyhousestore")}>
            Continue Shopping
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {filteredOrders.length === 0 && searchQuery ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No orders found matching "{searchQuery}"
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => renderOrder(order))
        )}
      </main>
      <Footer />
    </div>
  );
}
