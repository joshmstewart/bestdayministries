import { Coffee, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_small: number | null;
  price_large: number | null;
  price_hot_12oz: number | null;
  price_hot_16oz: number | null;
  price_iced_16oz: number | null;
  price_iced_24oz: number | null;
  single_price: number | null;
  display_order: number;
  is_featured: boolean;
}

interface MenuAddon {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  display_order: number;
}

const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) return "—";
  return `$${price.toFixed(2)}`;
};

const CoffeeShopMenu = () => {
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["coffee-menu-categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shop_menu_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as MenuCategory[];
    }
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["coffee-menu-items-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shop_menu_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as MenuItem[];
    }
  });

  const { data: addons = [], isLoading: addonsLoading } = useQuery({
    queryKey: ["coffee-menu-addons-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shop_menu_addons")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as MenuAddon[];
    }
  });

  const isLoading = categoriesLoading || itemsLoading || addonsLoading;

  if (isLoading) {
    return (
      <section id="menu" className="py-16 bg-gradient-to-b from-amber-50/80 to-orange-50/60">
        <div className="container mx-auto px-4 flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  // If no menu data, show empty state
  if (categories.length === 0 && items.length === 0) {
    return null;
  }

  // Check if any category has hot/iced pricing (coffee-style)
  const hasCoffeePricing = (categoryId: string) => {
    return items.some(item => 
      item.category_id === categoryId && 
      (item.price_hot_12oz !== null || item.price_hot_16oz !== null)
    );
  };

  // Check if category has small/large pricing
  const hasSmallLargePricing = (categoryId: string) => {
    return items.some(item => 
      item.category_id === categoryId && 
      (item.price_small !== null || item.price_large !== null)
    );
  };

  // Get addons for a specific category (or global addons)
  const getAddonsForCategory = (categoryId: string) => {
    return addons.filter(a => a.category_id === categoryId || a.category_id === null);
  };

  return (
    <section id="menu" className="py-16 bg-gradient-to-b from-amber-50/80 to-orange-50/60">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Menu Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 shadow-lg mb-6">
              <Coffee className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-amber-900 tracking-tight mb-3">
              Our Menu
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-600 mx-auto rounded-full mb-4" />
            <p className="text-lg text-amber-800/80 max-w-xl mx-auto font-medium">
              Welcome! You are being served today by our "Besties", people with special abilities. 
              We hope we can help you have the best day ever!
            </p>
          </div>

          {/* Menu Categories */}
          <div className="space-y-12">
            {categories.map((category) => {
              const categoryItems = items.filter(item => item.category_id === category.id);
              const categoryAddons = getAddonsForCategory(category.id);
              const isCoffeeStyle = hasCoffeePricing(category.id);
              const isSmallLarge = hasSmallLargePricing(category.id);

              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-amber-200/50 overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-6 py-4 border-b border-amber-200/50">
                    <h3 className="text-2xl font-bold text-amber-900">{category.name}</h3>
                    {category.description && (
                      <p className="text-amber-700/80 mt-1">{category.description}</p>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Coffee-style pricing table */}
                    {isCoffeeStyle ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-amber-200">
                              <th className="text-left py-3 px-2 font-bold text-amber-900">Item</th>
                              <th className="text-center py-3 px-2 font-semibold text-amber-800 text-sm">Hot 12oz</th>
                              <th className="text-center py-3 px-2 font-semibold text-amber-800 text-sm">Hot 16oz</th>
                              <th className="text-center py-3 px-2 font-semibold text-amber-800 text-sm">Iced 16oz</th>
                              <th className="text-center py-3 px-2 font-semibold text-amber-800 text-sm">Iced 24oz</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            {categoryItems.map((item) => (
                              <tr key={item.id} className="hover:bg-amber-50/50 transition-colors">
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {item.is_featured && (
                                      <span className="inline-block w-2 h-2 bg-orange-500 rounded-full" title="Featured" />
                                    )}
                                    <span className="font-medium text-amber-900">{item.name}</span>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-amber-600 mt-0.5">{item.description}</p>
                                  )}
                                </td>
                                <td className="text-center py-3 px-2 text-amber-800 font-medium">{formatPrice(item.price_hot_12oz)}</td>
                                <td className="text-center py-3 px-2 text-amber-800 font-medium">{formatPrice(item.price_hot_16oz)}</td>
                                <td className="text-center py-3 px-2 text-amber-800 font-medium">{formatPrice(item.price_iced_16oz)}</td>
                                <td className="text-center py-3 px-2 text-amber-800 font-medium">{formatPrice(item.price_iced_24oz)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : isSmallLarge ? (
                      /* Small/Large pricing grid (crepes, etc.) */
                      <div className="grid md:grid-cols-2 gap-4">
                        {categoryItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex justify-between items-start p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/50 border border-amber-100"
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2">
                                {item.is_featured && (
                                  <span className="inline-block w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" title="Featured" />
                                )}
                                <h4 className="font-semibold text-amber-900">{item.name}</h4>
                              </div>
                              {item.description && (
                                <p className="text-sm text-amber-700/80 mt-1">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {item.price_small && (
                                <p className="text-sm font-medium text-amber-800">
                                  <span className="text-amber-600">Sm:</span> {formatPrice(item.price_small)}
                                </p>
                              )}
                              {item.price_large && (
                                <p className="text-sm font-medium text-amber-800">
                                  <span className="text-amber-600">Lg:</span> {formatPrice(item.price_large)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Single price or specialty items grid */
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/50 border border-amber-100"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {item.is_featured && (
                                    <span className="inline-block w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" title="Featured" />
                                  )}
                                  <h4 className="font-semibold text-amber-900">{item.name}</h4>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-amber-700/80 mt-1">{item.description}</p>
                                )}
                              </div>
                              {item.single_price && (
                                <span className="font-bold text-lg text-amber-800 flex-shrink-0">
                                  {formatPrice(item.single_price)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Category-specific addons */}
                    {categoryAddons.length > 0 && categoryAddons.some(a => a.category_id === category.id) && (
                      <div className="mt-4 pt-4 border-t border-amber-200/50">
                        <p className="text-sm text-amber-700">
                          {categoryAddons.filter(a => a.category_id === category.id).map(addon => (
                            <span key={addon.id} className="mr-4">
                              {addon.name}: <span className="font-medium">{formatPrice(addon.price)}</span>
                            </span>
                          ))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global Add-ons */}
          {addons.filter(a => a.category_id === null).length > 0 && (
            <div className="mt-8 text-center bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50">
              <h4 className="font-bold text-amber-900 mb-3">Customize Your Order</h4>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-amber-800">
                {addons.filter(a => a.category_id === null).map(addon => (
                  <span key={addon.id}>
                    {addon.name}: <span className="font-semibold">{formatPrice(addon.price)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CoffeeShopMenu;