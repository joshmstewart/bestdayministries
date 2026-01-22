import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Package, MapPin, Truck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface VendorOrderDetailsProps {
  orderId: string;
  vendorId: string;
  theme?: VendorThemePreset;
  onBack: () => void;
}

export const VendorOrderDetails = ({ orderId, vendorId, theme, onBack }: VendorOrderDetailsProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedCarriers, setSelectedCarriers] = useState<Record<string, string>>({});
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

  const updateFulfillment = async (itemId: string, status: string, trackingNumber?: string, carrier?: string) => {
    try {
      setUpdating(itemId);

      if (status === 'shipped' && trackingNumber && carrier) {
        // Submit to AfterShip for automated tracking
        const { data, error: functionError } = await supabase.functions.invoke('submit-tracking', {
          body: {
            orderItemId: itemId,
            trackingNumber,
            carrier
          }
        });

        if (functionError) throw functionError;

        toast({
          title: "Success",
          description: "Tracking submitted! Status will auto-update when delivered.",
        });
      } else if (status === 'delivered') {
        // Manual mark as delivered
        const { error } = await supabase
          .from('order_items')
          .update({
            fulfillment_status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', itemId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Order marked as delivered"
        });
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
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

      <Card
        className="border-2"
        style={theme ? { 
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          boxShadow: theme.cardGlow
        } : undefined}
      >
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
                <Card 
                  key={item.id}
                  className="border"
                  style={theme ? { 
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder
                  } : undefined}
                >
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

                      {/* Tracking Info */}
                      {(item.fulfillment_status === 'shipped' || item.fulfillment_status === 'delivered') && (
                        <div className="space-y-2">
                          {item.tracking_url && (
                            <div>
                              <Label>Tracking Link</Label>
                              <a 
                                href={item.tracking_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                Track Package <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {item.tracking_number && (
                            <div>
                              <Label>Tracking Number</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.tracking_number} ({item.carrier?.toUpperCase() || 'N/A'})
                              </p>
                            </div>
                          )}
                          {item.shipped_at && (
                            <p className="text-xs text-muted-foreground">
                              Shipped {formatDistanceToNow(new Date(item.shipped_at), { addSuffix: true })}
                            </p>
                          )}
                          {item.delivered_at && (
                            <p className="text-xs text-muted-foreground">
                              Delivered {formatDistanceToNow(new Date(item.delivered_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Ship Item Form */}
                      {item.fulfillment_status === 'pending' && (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`carrier-${item.id}`}>Carrier *</Label>
                            <Select
                              value={selectedCarriers[item.id] || ""}
                              onValueChange={(value) => setSelectedCarriers(prev => ({ ...prev, [item.id]: value }))}
                            >
                              <SelectTrigger id={`carrier-${item.id}`}>
                                <SelectValue placeholder="Select carrier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="usps">USPS</SelectItem>
                                <SelectItem value="ups">UPS</SelectItem>
                                <SelectItem value="fedex">FedEx</SelectItem>
                                <SelectItem value="dhl">DHL</SelectItem>
                                <SelectItem value="amazon">Amazon Logistics</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor={`tracking-${item.id}`}>Tracking Number *</Label>
                            <Input
                              id={`tracking-${item.id}`}
                              placeholder="Enter tracking number"
                            />
                          </div>

                          <Button
                            onClick={() => {
                              const carrier = selectedCarriers[item.id];
                              const trackingInput = document.getElementById(`tracking-${item.id}`) as HTMLInputElement;
                              const tracking = trackingInput?.value;
                              
                              if (!carrier || !tracking) {
                                toast({
                                  title: "Missing Information",
                                  description: "Please select a carrier and enter a tracking number",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              updateFulfillment(item.id, 'shipped', tracking, carrier);
                            }}
                            disabled={updating === item.id}
                            className="w-full"
                          >
                            {updating === item.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Mark as Shipped & Submit Tracking
                          </Button>
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
