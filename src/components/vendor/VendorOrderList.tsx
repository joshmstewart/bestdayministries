import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, Eye, RefreshCw, CreditCard, Truck, Filter, DollarSign } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { VendorOrderDetails } from "./VendorOrderDetails";
import { VendorThemePreset } from "@/lib/vendorThemePresets";
import { useToast } from "@/hooks/use-toast";
import { VendorPayoutStatus } from "./VendorPayoutStatus";

type OrderStatusFilter = 'all' | 'active' | 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';

interface VendorOrderListProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

export const VendorOrderList = ({ vendorId, theme }: VendorOrderListProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('active'); // Default to hide cancelled
  const { toast } = useToast();
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

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-marketplace-orders', {
        body: { vendorId }
      });

      if (error) throw error;

      const summary = data?.summary || {};
      const confirmed = Number(summary.confirmed || 0);
      const cancelled = Number(summary.cancelled || 0);
      const errors = Number(summary.errors || 0);

      const message = confirmed > 0
        ? `${confirmed} order(s) confirmed from Stripe`
        : cancelled > 0
          ? `${cancelled} abandoned order(s) cleaned up`
          : errors > 0
            ? `${errors} order(s) could not be verified with Stripe yet`
            : "Orders are up to date";

      toast({
        title: "Orders Synced",
        description: message,
      });

      await loadOrders();
    } catch (err) {
      console.error('Error refreshing orders:', err);
      toast({
        title: "Sync Failed",
        description: "Could not sync orders with Stripe",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getPaymentLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Awaiting Payment';
      case 'processing': return 'Paid';
      case 'shipped': return 'Paid';
      case 'completed': return 'Paid';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing':
      case 'shipped':
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'refunded': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getFulfillmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-500'; // Ready to ship - action needed
      case 'ready_to_ship': return 'bg-blue-500';
      case 'in_production': return 'bg-yellow-500';
      case 'processing': return 'bg-yellow-500';
      case 'shipped': return 'bg-purple-500';
      case 'partially_shipped': return 'bg-purple-400';
      case 'delivered': return 'bg-green-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'awaiting_payment': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  // Get display label for fulfillment status, considering payment status
  const getFulfillmentLabel = (fulfillmentStatus: string, orderPaymentStatus: string) => {
    // If order is cancelled, show "Cancelled" for fulfillment too
    if (orderPaymentStatus === 'cancelled') {
      return 'Cancelled';
    }
    
    // If order is pending payment, show "Awaiting Payment"
    if (orderPaymentStatus === 'pending') {
      return 'Awaiting Payment';
    }
    
    // Order is paid - show appropriate fulfillment label
    switch (fulfillmentStatus) {
      case 'pending': return 'Ready to Ship';
      case 'in_production': return 'In Production';
      case 'shipped': return 'Shipped';
      case 'partially_shipped': return 'Partially Shipped';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return fulfillmentStatus.replace('_', ' ');
    }
  };

  // Get fulfillment color considering payment status
  const getEffectiveFulfillmentColor = (fulfillmentStatus: string, orderPaymentStatus: string) => {
    if (orderPaymentStatus === 'pending' || orderPaymentStatus === 'cancelled') {
      return 'bg-gray-400';
    }
    return getFulfillmentStatusColor(fulfillmentStatus);
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

  // Filter orders based on status
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'active') {
      // Active = everything except cancelled
      return orders.filter(order => order.status !== 'cancelled');
    }
    return orders.filter(order => order.status === statusFilter);
  }, [orders, statusFilter]);

  const getFilterLabel = (filter: OrderStatusFilter) => {
    switch (filter) {
      case 'all': return 'All Orders';
      case 'active': return 'Active (No Cancelled)';
      case 'pending': return 'Pending Payment';
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return filter;
    }
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatusFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (No Cancelled)</SelectItem>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending Payment</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredOrders.length} of {orders.length} orders
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Orders
        </Button>
      </div>
      
      {filteredOrders.length === 0 ? (
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
              No orders match this filter.
            </p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => setStatusFilter('all')}
            >
              View all orders
            </Button>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4">
        {filteredOrders.map((order) => {
          const paymentStatus = String(order.status || 'pending');
          const fulfillmentStatus = getOrderStatusSummary(order.items);
          const createdAt = new Date(order.created_at);
          const updatedAt = new Date(order.updated_at);
          const wasUpdated = updatedAt.getTime() - createdAt.getTime() > 1000; // > 1s difference

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
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {order.customer?.display_name || 'Guest'} • {' '}
                      {formatDistanceToNow(createdAt, { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Payment:</span>
                      <Badge className={getPaymentStatusColor(paymentStatus)}>
                        {getPaymentLabel(paymentStatus)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Fulfillment:</span>
                      <Badge variant="outline" className={getEffectiveFulfillmentColor(fulfillmentStatus, paymentStatus)}>
                        {getFulfillmentLabel(fulfillmentStatus, paymentStatus)}
                      </Badge>
                    </div>
                  </div>
                </div>
                {wasUpdated && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated: {format(updatedAt, 'MMM d, h:mm:ss a')}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Your Items ({order.items.length}):</p>
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.product?.images?.[0] && (
                            <img
                              src={item.product.images[0]}
                              alt={item.product?.name}
                              className="h-10 w-10 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <span className="truncate">{item.product?.name} × {item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={getEffectiveFulfillmentColor(item.fulfillment_status, paymentStatus)}>
                            {getFulfillmentLabel(item.fulfillment_status, paymentStatus)}
                          </Badge>
                          {/* Show payout status for shipped/delivered items */}
                          {(item.fulfillment_status === 'shipped' || item.fulfillment_status === 'delivered') && paymentStatus !== 'pending' && paymentStatus !== 'cancelled' && (
                            <VendorPayoutStatus
                              transferStatus={item.transfer_status}
                              stripeTransferId={item.stripe_transfer_id}
                              transferErrorMessage={item.transfer_error_message}
                              vendorPayout={item.vendor_payout}
                            />
                          )}
                        </div>
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
      )}
    </div>
  );
};
