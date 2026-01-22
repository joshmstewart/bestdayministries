import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { VendorOrderDetails } from "./VendorOrderDetails";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface VendorOrderListProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

export const VendorOrderList = ({ vendorId, theme }: VendorOrderListProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [vendorId]);

  const loadOrders = async () => {
    try {
      setLoading(true);

      // First, get all order_items for this vendor
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(name, images)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Get unique order IDs
      const orderIds = [...new Set(orderItems?.map(item => item.order_id) || [])];

      // Fetch order details for these IDs
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      if (ordersError) throw ordersError;

      // Fetch customer profiles separately
      const customerIds = [...new Set(ordersData?.map(o => o.customer_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', customerIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine orders with their items and customer info
      const ordersWithItems = ordersData?.map(order => ({
        ...order,
        customer: profilesMap.get(order.customer_id),
        items: orderItems?.filter(item => item.order_id === order.id) || []
      })) || [];

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'in_production':
        return 'bg-blue-500';
      case 'shipped':
        return 'bg-purple-500';
      case 'delivered':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getOrderStatusSummary = (items: any[]) => {
    const statuses = items.map(item => item.fulfillment_status);
    const allDelivered = statuses.every(s => s === 'delivered');
    const allShipped = statuses.every(s => s === 'shipped' || s === 'delivered');
    const anyShipped = statuses.some(s => s === 'shipped' || s === 'delivered');
    const anyInProduction = statuses.some(s => s === 'in_production');
    const allInProduction = statuses.every(s => s === 'in_production' || s === 'shipped' || s === 'delivered');

    if (allDelivered) return 'delivered';
    if (allShipped) return 'shipped';
    if (anyShipped) return 'partially_shipped';
    if (allInProduction || anyInProduction) return 'in_production';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No orders yet. Orders will appear here once customers purchase your products.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (selectedOrderId) {
    return (
      <VendorOrderDetails
        orderId={selectedOrderId}
        vendorId={vendorId}
        theme={theme}
        onBack={() => {
          setSelectedOrderId(null);
          loadOrders();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {orders.map((order) => {
          const orderStatus = getOrderStatusSummary(order.items);
          
          return (
            <Card 
              key={order.id} 
              className="hover:shadow-lg transition-shadow border-2"
              style={theme ? { 
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                boxShadow: theme.cardGlow
              } : undefined}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {order.customer?.display_name || 'Guest'} • {' '}
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(orderStatus)}>
                    {orderStatus.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Your Items ({order.items.length}):</p>
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {item.product?.images?.[0] && (
                            <img
                              src={item.product.images[0]}
                              alt={item.product?.name}
                              className="h-10 w-10 object-cover rounded"
                            />
                          )}
                          <span>{item.product?.name} × {item.quantity}</span>
                        </div>
                        <Badge variant="outline" className={getStatusColor(item.fulfillment_status)}>
                          {item.fulfillment_status}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => setSelectedOrderId(order.id)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details & Fulfill
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
