import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Package, MapPin, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface VendorOrderDetailsProps {
  orderId: string;
  vendorId: string;
  onBack: () => void;
}

export const VendorOrderDetails = ({ orderId, vendorId, onBack }: VendorOrderDetailsProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadOrderDetails();
  }, [orderId, vendorId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);

      // Get order items for this vendor
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(name, images, description)
        `)
        .eq('order_id', orderId)
        .eq('vendor_id', vendorId);

      if (itemsError) throw itemsError;

      // Get order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Get customer profile
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('display_name, id')
        .eq('id', orderData.customer_id)
        .single();

      setOrder({
        ...orderData,
        customer: customerProfile,
        items: orderItems
      });
    } catch (error) {
      console.error('Error loading order details:', error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFulfillment = async (itemId: string, status: string, trackingNumber?: string) => {
    try {
      setUpdating(itemId);

      const updateData: any = {
        fulfillment_status: status
      };

      if (trackingNumber) {
        updateData.tracking_number = trackingNumber;
      }

      if (status === 'shipped' && !order.items.find((i: any) => i.id === itemId).shipped_at) {
        updateData.shipped_at = new Date().toISOString();
      }

      if (status === 'delivered' && !order.items.find((i: any) => i.id === itemId).delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('order_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fulfillment status updated"
      });

      loadOrderDetails();
    } catch (error) {
      console.error('Error updating fulfillment:', error);
      toast({
        title: "Error",
        description: "Failed to update fulfillment status",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'shipped':
        return 'bg-blue-500';
      case 'delivered':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Order not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={onBack} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
              <CardDescription>
                Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Customer
            </h3>
            <p className="text-sm text-muted-foreground">
              {order.customer?.display_name || 'Guest Customer'}
            </p>
          </div>

          {/* Shipping Address */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{order.shipping_address.line1}</p>
              {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </p>
              <p>{order.shipping_address.country}</p>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Your Items to Fulfill
            </h3>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Item Info */}
                      <div className="flex gap-4">
                        {item.product?.images?.[0] && (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="h-20 w-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × ${item.price_at_purchase}
                          </p>
                          <Badge className={`mt-2 ${getStatusColor(item.fulfillment_status)}`}>
                            {item.fulfillment_status}
                          </Badge>
                        </div>
                      </div>

                      {/* Tracking Number */}
                      {(item.fulfillment_status === 'shipped' || item.fulfillment_status === 'delivered') && (
                        <div>
                          <Label>Tracking Number</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.tracking_number || 'Not provided'}
                          </p>
                          {item.shipped_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Shipped {formatDistanceToNow(new Date(item.shipped_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {item.fulfillment_status === 'pending' && (
                        <div className="space-y-2">
                          <Label htmlFor={`tracking-${item.id}`}>Tracking Number (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`tracking-${item.id}`}
                              placeholder="Enter tracking number"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateFulfillment(
                                    item.id,
                                    'shipped',
                                    (e.target as HTMLInputElement).value
                                  );
                                }
                              }}
                            />
                            <Button
                              onClick={(e) => {
                                const input = document.getElementById(`tracking-${item.id}`) as HTMLInputElement;
                                updateFulfillment(item.id, 'shipped', input?.value);
                              }}
                              disabled={updating === item.id}
                            >
                              {updating === item.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Mark as Shipped
                            </Button>
                          </div>
                        </div>
                      )}

                      {item.fulfillment_status === 'shipped' && (
                        <Button
                          onClick={() => updateFulfillment(item.id, 'delivered')}
                          disabled={updating === item.id}
                          className="w-full"
                        >
                          {updating === item.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Mark as Delivered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
