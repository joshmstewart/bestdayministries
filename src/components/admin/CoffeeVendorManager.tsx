import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Coffee, Package, Truck, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ShipStationOrder {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  orderStatus: string;
  orderDate: string;
  shipDate?: string;
  shipTo: {
    name: string;
    city: string;
    state: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  trackingNumber?: string;
}

interface CoffeeOrder {
  id: string;
  order_id: string;
  shipstation_order_id: string | null;
  shipstation_order_key: string | null;
  shipstation_synced_at: string | null;
  shipstation_last_checked_at: string | null;
  fulfillment_status: string;
  tracking_number: string | null;
  carrier: string | null;
  tracking_url: string | null;
  orders: {
    id: string;
    customer_email: string;
    shipping_address: any;
    created_at: string;
    total_amount: number;
  };
  products: {
    id: string;
    name: string;
  };
  quantity: number;
  price_at_purchase: number;
}

// Coffee vendor ID - this would be stored in config in production
const COFFEE_VENDOR_ID = "coffee-vendor"; // Placeholder - we'll need to set this up

export const CoffeeVendorManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [orders, setOrders] = useState<CoffeeOrder[]>([]);
  const [shipstationConfigured, setShipstationConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkShipStationConfig();
    loadCoffeeOrders();
  }, []);

  const checkShipStationConfig = async () => {
    try {
      // Try to call the poll function to see if credentials are configured
      const { data, error } = await supabase.functions.invoke("poll-shipstation-status", {
        body: { limit: 1 },
      });
      
      if (error?.message?.includes("credentials not configured")) {
        setShipstationConfigured(false);
      } else {
        setShipstationConfigured(true);
      }
    } catch {
      setShipstationConfigured(false);
    }
  };

  const loadCoffeeOrders = async () => {
    setLoading(true);
    try {
      // Load order items that have been synced to ShipStation
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          shipstation_order_id,
          shipstation_order_key,
          shipstation_synced_at,
          shipstation_last_checked_at,
          fulfillment_status,
          tracking_number,
          carrier,
          tracking_url,
          quantity,
          price_at_purchase,
          orders (
            id,
            customer_email,
            shipping_address,
            created_at,
            total_amount
          ),
          products (
            id,
            name
          )
        `)
        .not("shipstation_order_id", "is", null)
        .order("shipstation_synced_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error: any) {
      console.error("Error loading coffee orders:", error);
      toast({
        title: "Error loading orders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollShipStationStatus = async () => {
    setPolling(true);
    try {
      const { data, error } = await supabase.functions.invoke("poll-shipstation-status", {
        body: { limit: 50 },
      });

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Checked ${data.checked} items, updated ${data.updated}`,
      });

      // Reload orders to show updated info
      await loadCoffeeOrders();
    } catch (error: any) {
      console.error("Error polling ShipStation:", error);
      toast({
        title: "Error polling ShipStation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPolling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-warning border-warning"><Package className="w-3 h-3 mr-1" />Pending</Badge>;
      case "shipped":
        return <Badge variant="outline" className="text-primary border-primary"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
      case "delivered":
        return <Badge variant="outline" className="text-success border-success"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (shipstationConfigured === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!shipstationConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            ShipStation Configuration Required
          </CardTitle>
          <CardDescription>
            ShipStation API credentials need to be configured to manage coffee vendor orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Please add the following secrets in Lovable Cloud:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><code className="bg-muted px-1 rounded">SHIPSTATION_API_KEY</code></li>
            <li><code className="bg-muted px-1 rounded">SHIPSTATION_API_SECRET</code></li>
          </ul>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={checkShipStationConfig}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Configuration
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Coffee Vendor (ShipStation)</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadCoffeeOrders}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={pollShipStationStatus}
            disabled={polling}
          >
            {polling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Truck className="w-4 h-4 mr-2" />
            )}
            Poll Tracking Updates
          </Button>
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>ShipStation Orders</CardTitle>
              <CardDescription>
                Orders synced to the coffee vendor's ShipStation account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No orders have been synced to ShipStation yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {order.products?.name || "Unknown Product"}
                            </span>
                            <span className="text-muted-foreground">× {order.quantity}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.orders?.customer_email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Synced: {order.shipstation_synced_at 
                              ? format(new Date(order.shipstation_synced_at), "MMM d, yyyy h:mm a")
                              : "Unknown"
                            }
                          </p>
                          {order.shipstation_last_checked_at && (
                            <p className="text-xs text-muted-foreground">
                              Last checked: {format(new Date(order.shipstation_last_checked_at), "MMM d, yyyy h:mm a")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(order.fulfillment_status)}
                          {order.tracking_number && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {order.carrier}: {order.tracking_number}
                              </span>
                              {order.tracking_url && (
                                <a 
                                  href={order.tracking_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                          <span className="text-sm font-medium">
                            ${(order.price_at_purchase * order.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>ShipStation Integration Settings</CardTitle>
              <CardDescription>
                Configuration for the coffee vendor ShipStation integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Integration Status</h4>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">ShipStation API credentials configured</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>How It Works</Label>
                <p className="text-sm text-muted-foreground">
                  1. When a customer orders coffee products, the order is automatically synced to the vendor's ShipStation account.
                </p>
                <p className="text-sm text-muted-foreground">
                  2. The vendor ships the order from their ShipStation dashboard.
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Click "Poll Tracking Updates" to fetch the latest shipping status and tracking info.
                </p>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h4 className="font-medium">Manual Polling Schedule</h4>
                <p className="text-sm text-muted-foreground">
                  For automatic polling, a scheduled job can be configured to run periodically.
                  Currently, you can manually poll for updates using the button above.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
