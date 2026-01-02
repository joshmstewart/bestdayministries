import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Package, Truck } from "lucide-react";
import { toast } from "sonner";

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
  street: string;
  city: string;
  state: string;
  zip: string;
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

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
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as unknown) as Order[]);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
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

  // Calculate the effective order status based on item fulfillment statuses
  const getEffectiveOrderStatus = (order: Order) => {
    const itemStatuses = order.order_items.map(item => item.fulfillment_status);
    
    // Priority order: delivered > shipped > in_production > processing > pending
    if (itemStatuses.every(s => s === "delivered")) return "delivered";
    if (itemStatuses.some(s => s === "shipped" || s === "delivered")) return "shipped";
    if (itemStatuses.some(s => s === "in_production")) return "in_production";
    if (itemStatuses.some(s => s === "processing")) return "processing";
    return order.status;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading your orders...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto p-6">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <Button variant="outline" onClick={() => navigate("/joyhousestore")}>
          Continue Shopping
        </Button>
      </div>

      {orders.map((order) => (
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
            {/* Shipping Address */}
            {order.shipping_address && (
              <div>
                <h3 className="font-semibold mb-2">Shipping To:</h3>
                <p className="text-sm text-muted-foreground">
                  {order.shipping_address.name}<br />
                  {order.shipping_address.street}<br />
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
                </p>
              </div>
            )}

            <Separator />

            {/* Order Items */}
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

                    {/* Tracking Information */}
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

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-xl font-bold">${order.total_amount}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
