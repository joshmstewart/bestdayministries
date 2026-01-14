import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, EyeOff, Package, Edit, Store, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface Pack {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_coins: number;
  pack_type: string;
  is_active: boolean;
  display_order: number;
}

interface PackItem {
  id: string;
  pack_id: string;
  store_id: string | null;
  customer_id: string | null;
}

interface StoreType {
  id: string;
  name: string;
  image_url: string | null;
}

interface CustomerType {
  id: string;
  name: string;
  image_url: string | null;
}

export const CashRegisterPacksManager = () => {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState(100);
  const [formPackType, setFormPackType] = useState<string>("mixed");
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const [packsRes, itemsRes, storesRes, customersRes] = await Promise.all([
        supabase.from("cash_register_packs").select("*").order("display_order"),
        supabase.from("cash_register_pack_items").select("*"),
        supabase.from("cash_register_stores").select("id, name, image_url").order("display_order"),
        supabase.from("cash_register_customers").select("id, name, image_url").order("display_order"),
      ]);

      if (packsRes.error) throw packsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (storesRes.error) throw storesRes.error;
      if (customersRes.error) throw customersRes.error;

      setPacks(packsRes.data || []);
      setPackItems(itemsRes.data || []);
      setStores(storesRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormPrice(100);
    setFormPackType("mixed");
    setSelectedStoreIds(new Set());
    setSelectedCustomerIds(new Set());
    setEditingPack(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (pack: Pack) => {
    setEditingPack(pack);
    setFormName(pack.name);
    setFormDescription(pack.description || "");
    setFormPrice(pack.price_coins);
    setFormPackType(pack.pack_type);
    
    // Load existing items for this pack
    const items = packItems.filter(item => item.pack_id === pack.id);
    setSelectedStoreIds(new Set(items.filter(i => i.store_id).map(i => i.store_id!)));
    setSelectedCustomerIds(new Set(items.filter(i => i.customer_id).map(i => i.customer_id!)));
    
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    if (selectedStoreIds.size === 0 && selectedCustomerIds.size === 0) {
      toast({ title: "Error", description: "Select at least one store or customer", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let packId: string;

      if (editingPack) {
        // Update existing pack
        const { error } = await supabase
          .from("cash_register_packs")
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            price_coins: formPrice,
            pack_type: formPackType,
          })
          .eq("id", editingPack.id);
        
        if (error) throw error;
        packId = editingPack.id;

        // Delete existing items
        await supabase.from("cash_register_pack_items").delete().eq("pack_id", packId);
      } else {
        // Create new pack
        const maxOrder = Math.max(...packs.map(p => p.display_order), 0);
        const { data, error } = await supabase
          .from("cash_register_packs")
          .insert({
            name: formName.trim(),
            description: formDescription.trim() || null,
            price_coins: formPrice,
            pack_type: formPackType,
            display_order: maxOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;
        packId = data.id;
      }

      // Insert new pack items
      const itemsToInsert: { pack_id: string; store_id?: string; customer_id?: string }[] = [];
      
      selectedStoreIds.forEach(storeId => {
        itemsToInsert.push({ pack_id: packId, store_id: storeId });
      });
      
      selectedCustomerIds.forEach(customerId => {
        itemsToInsert.push({ pack_id: packId, customer_id: customerId });
      });

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("cash_register_pack_items")
          .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;
      }

      toast({ title: "Success", description: editingPack ? "Pack updated" : "Pack created" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving pack:", error);
      toast({ title: "Error", description: "Failed to save pack", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (pack: Pack) => {
    try {
      const { error } = await supabase
        .from("cash_register_packs")
        .update({ is_active: !pack.is_active })
        .eq("id", pack.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error toggling active:", error);
      toast({ title: "Error", description: "Failed to update pack", variant: "destructive" });
    }
  };

  const deletePack = async (pack: Pack) => {
    if (!confirm(`Delete pack "${pack.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("cash_register_packs")
        .delete()
        .eq("id", pack.id);

      if (error) throw error;
      toast({ title: "Deleted", description: "Pack removed" });
      fetchData();
    } catch (error) {
      console.error("Error deleting pack:", error);
      toast({ title: "Error", description: "Failed to delete pack", variant: "destructive" });
    }
  };

  const getPackItemCounts = (packId: string) => {
    const items = packItems.filter(i => i.pack_id === packId);
    const storeCount = items.filter(i => i.store_id).length;
    const customerCount = items.filter(i => i.customer_id).length;
    return { storeCount, customerCount };
  };

  const toggleStoreSelection = (storeId: string) => {
    setSelectedStoreIds(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cash Register Packs</h3>
          <p className="text-sm text-muted-foreground">
            Bundle stores and customers for the coin shop
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pack
        </Button>
      </div>

      {packs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No packs created yet. Create your first pack!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packs.map(pack => {
            const { storeCount, customerCount } = getPackItemCounts(pack.id);
            return (
              <Card key={pack.id} className={!pack.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{pack.name}</CardTitle>
                    </div>
                    <Badge variant={pack.is_active ? "default" : "secondary"}>
                      {pack.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pack.description && (
                    <p className="text-sm text-muted-foreground">{pack.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Store className="h-3 w-3" />
                      {storeCount} stores
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {customerCount} customers
                    </Badge>
                  </div>
                  
                  <div className="text-lg font-bold text-primary">
                    {pack.price_coins} coins
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(pack)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(pack)}>
                      {pack.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deletePack(pack)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPack ? "Edit Pack" : "Create Pack"}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pack Name</Label>
                  <Input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Sports Players Pack"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (coins)</Label>
                  <Input
                    type="number"
                    value={formPrice}
                    onChange={e => setFormPrice(parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Unlock sports-themed customers for the cash register game"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Pack Type</Label>
                <Select value={formPackType} onValueChange={(v: "stores" | "customers" | "mixed") => setFormPackType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customers">Customers Only</SelectItem>
                    <SelectItem value="stores">Stores Only</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stores Selection */}
              {(formPackType === "stores" || formPackType === "mixed") && (
                <div className="space-y-2">
                  <Label>Select Stores ({selectedStoreIds.size} selected)</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                    {stores.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No stores available</p>
                    ) : (
                      <div className="space-y-2">
                        {stores.map(store => (
                          <div key={store.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedStoreIds.has(store.id)}
                              onCheckedChange={() => toggleStoreSelection(store.id)}
                            />
                            <div className="flex items-center gap-2 flex-1">
                              {store.image_url && (
                                <img src={store.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                              )}
                              <span className="text-sm">{store.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customers Selection */}
              {(formPackType === "customers" || formPackType === "mixed") && (
                <div className="space-y-2">
                  <Label>Select Customers ({selectedCustomerIds.size} selected)</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                    {customers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No customers available</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {customers.map(customer => (
                          <div key={customer.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedCustomerIds.has(customer.id)}
                              onCheckedChange={() => toggleCustomerSelection(customer.id)}
                            />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {customer.image_url && (
                                <img src={customer.image_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              )}
                              <span className="text-sm truncate">{customer.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : (editingPack ? "Update Pack" : "Create Pack")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
