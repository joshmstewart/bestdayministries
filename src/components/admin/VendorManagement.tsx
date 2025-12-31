import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Store, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Printer,
  Mail,
  Loader2,
  Eye,
  Trash2,
  RefreshCw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { PrintifyProductImporter } from "./PrintifyProductImporter";
import { ProductEditDialog } from "./ProductEditDialog";

// Component to check Printify order status
const CheckPrintifyStatusButton = ({ onStatusChecked }: { onStatusChecked: () => void }) => {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-printify-status');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Status Check Complete",
          description: `Updated ${data.updatedCount || 0} order items. ${data.emailsSent || 0} shipping emails sent.`,
        });
        onStatusChecked();
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check Printify status",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Button onClick={handleCheck} variant="outline" size="sm" disabled={isChecking}>
      <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
      {isChecking ? 'Checking...' : 'Check Printify Status'}
    </Button>
  );
};

interface VendorStats {
  totalVendors: number;
  approvedVendors: number;
  pendingVendors: number;
  rejectedVendors: number;
  totalProducts: number;
  totalSales: number;
  pendingOrders: number;
}

interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  status: "approved" | "pending" | "rejected" | "suspended";
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  inventory_count: number;
  is_active: boolean;
  images: string[] | null;
  default_image_index: number | null;
  default_image_url: string | null;
  vendor: {
    business_name: string;
  } | null;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  customer_id: string;
  customer_email?: string;
  order_items: {
    id: string;
    fulfillment_status: string;
    vendor_id: string;
    tracking_number?: string;
    carrier?: string;
    printify_order_id?: string;
  }[];
}

export const VendorManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VendorStats>({
    totalVendors: 0,
    approvedVendors: 0,
    pendingVendors: 0,
    rejectedVendors: 0,
    totalProducts: 0,
    totalSales: 0,
    pendingOrders: 0,
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Test shipping email state
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testTrackingNumber, setTestTrackingNumber] = useState("TEST123456789");
  const [testCarrier, setTestCarrier] = useState("usps");
  
  // Delete orders state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVendorStats(),
        loadVendors(),
        loadProducts(),
        loadOrders(),
      ]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVendorStats = async () => {
    const { data: vendorsData, error: vendorsError } = await supabase
      .from("vendors")
      .select("status");

    if (vendorsError) throw vendorsError;

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id")
      .not("vendor_id", "is", null);

    if (productsError) throw productsError;

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("total_amount, status");

    if (ordersError) throw ordersError;

    const totalSales = ordersData
      ?.filter(o => o.status === "completed")
      .reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

    const pendingOrders = ordersData?.filter(o => o.status === "pending").length || 0;

    setStats({
      totalVendors: vendorsData?.length || 0,
      approvedVendors: vendorsData?.filter(v => v.status === "approved").length || 0,
      pendingVendors: vendorsData?.filter(v => v.status === "pending").length || 0,
      rejectedVendors: vendorsData?.filter(v => v.status === "rejected").length || 0,
      totalProducts: productsData?.length || 0,
      totalSales,
      pendingOrders,
    });
  };

  const loadVendors = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setVendors(data || []);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        inventory_count,
        is_active,
        is_printify_product,
        printify_variant_ids,
        images,
        default_image_index,
        default_image_url,
        vendor:vendors (
          business_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setProducts(data || []);
  };

  const loadOrders = async () => {
    // Fetch orders first
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, created_at, status, total_amount, customer_id, customer_email")
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersError) throw ordersError;

    // Then fetch order items separately to avoid RLS recursion
    if (ordersData && ordersData.length > 0) {
      const orderIds = ordersData.map(o => o.id);
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("id, order_id, fulfillment_status, vendor_id, tracking_number, carrier, printify_order_id")
        .in("order_id", orderIds);

      // Merge the data
      const ordersWithItems = ordersData.map(order => ({
        ...order,
        order_items: itemsData?.filter(item => item.order_id === order.id) || []
      }));

      setOrders(ordersWithItems as any);
    } else {
      setOrders([]);
    }
  };

  const sendTestShippingEmail = async () => {
    if (!selectedOrder) return;
    
    try {
      setTestEmailLoading(true);
      
      const carrierName = testCarrier.toUpperCase();
      const trackingUrl = getTrackingUrl(testCarrier, testTrackingNumber);
      
      const { data, error } = await supabase.functions.invoke('send-order-shipped', {
        body: {
          orderId: selectedOrder.id,
          trackingNumber: testTrackingNumber,
          trackingUrl,
          carrier: carrierName
        }
      });

      if (error) throw error;

      if (data?.skipped) {
        toast({
          title: "No Email Sent",
          description: "This order has no customer email address.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Test Email Sent",
          description: `Shipping notification sent to ${selectedOrder.customer_email}`,
        });
      }
      
      setTestEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive"
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const getTrackingUrl = (carrier: string, trackingNumber: string) => {
    switch (carrier.toLowerCase()) {
      case 'usps':
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
      case 'ups':
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      case 'fedex':
        return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      case 'dhl':
        return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
      default:
        return `https://track.aftership.com/${trackingNumber}`;
    }
  };

  // Helper to check if an order can be deleted
  const canDeleteOrder = (status: string) => {
    // Allow deleting pending, processing, completed, and cancelled orders
    return ['pending', 'processing', 'completed', 'cancelled'].includes(status);
  };

  // Get deletable orders from selection
  const getDeletableSelectedOrders = () => {
    return orders.filter(o => selectedOrderIds.has(o.id) && canDeleteOrder(o.status));
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Select/deselect all deletable orders
  const toggleSelectAllDeletable = () => {
    const deletableOrders = orders.filter(o => canDeleteOrder(o.status));
    const allSelected = deletableOrders.every(o => selectedOrderIds.has(o.id));
    
    if (allSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(deletableOrders.map(o => o.id)));
    }
  };

  // Delete a single order
  const deleteOrder = async (orderId: string) => {
    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (orderError) throw orderError;

      return true;
    } catch (error) {
      console.error("Error deleting order:", error);
      return false;
    }
  };

  // Bulk delete selected orders
  const handleBulkDelete = async () => {
    const deletableOrders = getDeletableSelectedOrders();
    if (deletableOrders.length === 0) return;

    setDeleteLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const order of deletableOrders) {
      const success = await deleteOrder(order.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setSelectedOrderIds(new Set());

    if (failCount === 0) {
      toast({
        title: "Success",
        description: `Deleted ${successCount} order${successCount > 1 ? 's' : ''}`,
      });
    } else {
      toast({
        title: "Partial Success",
        description: `Deleted ${successCount} orders, ${failCount} failed`,
        variant: "destructive",
      });
    }

    loadData();
  };

  // Delete single order with confirmation
  const handleSingleDelete = async (order: Order) => {
    setSelectedOrderIds(new Set([order.id]));
    setDeleteDialogOpen(true);
  };

  const updateVendorStatus = async (vendorId: string, newStatus: "approved" | "pending" | "rejected" | "suspended") => {
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ status: newStatus })
        .eq("id", vendorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Vendor status updated to ${newStatus}`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFulfillmentBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-xs">{status}</Badge>;
      case "in_production":
        return <Badge className="bg-blue-500 text-xs">in production</Badge>;
      case "shipped":
        return <Badge className="bg-purple-500 text-xs">{status}</Badge>;
      case "delivered":
        return <Badge className="bg-green-500 text-xs">{status}</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="text-xs">{status}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.approvedVendors} approved, {stats.pendingVendors} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all vendors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting fulfillment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Vendor Management
          </CardTitle>
          <CardDescription>Manage vendors, products, and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="printify" className="gap-1">
                <Printer className="w-3 h-3" />
                Printify
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vendors" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.business_name}</TableCell>
                      <TableCell>{vendor.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                      <TableCell>{new Date(vendor.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {vendor.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateVendorStatus(vendor.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateVendorStatus(vendor.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {vendor.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateVendorStatus(vendor.id, "rejected")}
                          >
                            Suspend
                          </Button>
                        )}
                        {vendor.status === "rejected" && (
                          <Button
                            size="sm"
                            onClick={() => updateVendorStatus(vendor.id, "approved")}
                          >
                            Reactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const defaultIndex = product.default_image_index || 0;
                    const imageUrl = product.default_image_url || product.images?.[defaultIndex] || product.images?.[0];
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.vendor?.business_name || "N/A"}</TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => {
                            setEditProduct(product as any);
                            setEditDialogOpen(true);
                          }}
                          title="Edit product"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              {/* Order status check button */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {orders.filter(o => o.order_items.some(item => item.printify_order_id)).length} orders with Printify items
                </div>
                <CheckPrintifyStatusButton onStatusChecked={loadData} />
              </div>

              {/* Bulk actions bar */}
              {selectedOrderIds.size > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {getDeletableSelectedOrders().length} deletable order{getDeletableSelectedOrders().length !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={getDeletableSelectedOrders().length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrderIds(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={orders.filter(o => canDeleteOrder(o.status)).length > 0 && 
                                 orders.filter(o => canDeleteOrder(o.status)).every(o => selectedOrderIds.has(o.id))}
                        onCheckedChange={toggleSelectAllDeletable}
                        title="Select all deletable orders"
                      />
                    </TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className={selectedOrderIds.has(order.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        {canDeleteOrder(order.status) ? (
                          <Checkbox
                            checked={selectedOrderIds.has(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                          />
                        ) : (
                          <div className="w-4 h-4" title="Cannot delete shipped/completed orders" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-mono">{order.customer_id?.slice(0, 8) || 'Guest'}...</div>
                          {order.customer_email && (
                            <div className="text-muted-foreground">{order.customer_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">${(order.total_amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {order.order_items.map((item) => (
                            <span key={item.id}>{getFulfillmentBadge(item.fulfillment_status)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setTestEmailDialogOpen(true);
                            }}
                            title="Send test shipping email"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Test Email
                          </Button>
                          {canDeleteOrder(order.status) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSingleDelete(order)}
                              title="Delete order"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="printify" className="space-y-4">
              <PrintifyProductImporter />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ProductEditDialog
        product={editProduct}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={loadData}
      />

      {/* Test Shipping Email Dialog */}
      <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Shipping Email</DialogTitle>
            <DialogDescription>
              Send a test shipping notification email for this order.
              {selectedOrder && !selectedOrder.customer_email && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ This order has no customer email. The email will be skipped.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Order #{selectedOrder.id.slice(0, 8)}</p>
                <p className="text-sm text-muted-foreground">
                  Email: {selectedOrder.customer_email || "No email"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total: ${selectedOrder.total_amount?.toFixed(2) || "0.00"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-carrier">Carrier</Label>
                <Select value={testCarrier} onValueChange={setTestCarrier}>
                  <SelectTrigger id="test-carrier">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usps">USPS</SelectItem>
                    <SelectItem value="ups">UPS</SelectItem>
                    <SelectItem value="fedex">FedEx</SelectItem>
                    <SelectItem value="dhl">DHL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-tracking">Tracking Number</Label>
                <Input
                  id="test-tracking"
                  value={testTrackingNumber}
                  onChange={(e) => setTestTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setTestEmailDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={sendTestShippingEmail}
                  disabled={testEmailLoading || !selectedOrder.customer_email}
                >
                  {testEmailLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order{getDeletableSelectedOrders().length > 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {getDeletableSelectedOrders().length} order{getDeletableSelectedOrders().length > 1 ? 's' : ''}? 
              This will permanently remove the order{getDeletableSelectedOrders().length > 1 ? 's' : ''} and all associated items.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep dialog open while async delete runs
                e.preventDefault();
                void handleBulkDelete();
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
