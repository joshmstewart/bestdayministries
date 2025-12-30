import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  Printer
} from "lucide-react";
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
  order_items: {
    fulfillment_status: string;
    vendor_id: string;
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
      .select("id, created_at, status, total_amount, customer_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersError) throw ordersError;

    // Then fetch order items separately to avoid RLS recursion
    if (ordersData && ordersData.length > 0) {
      const orderIds = ordersData.map(o => o.id);
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("order_id, fulfillment_status, vendor_id")
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
          <Tabs defaultValue="vendors">
            <TabsList>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
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
                    <TableHead>Product Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.vendor?.business_name || "N/A"}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.inventory_count > 10 ? "default" : "destructive"}>
                          {product.inventory_count}
                        </Badge>
                      </TableCell>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs">{order.customer_id?.slice(0, 8) || 'Guest'}...</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">${(order.total_amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{order.order_items.length} items</TableCell>
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
    </div>
  );
};
