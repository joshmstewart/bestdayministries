import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin access
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'owner'].includes(userRole.role)) {
      throw new Error('Admin access required');
    }

    const printifyApiKey = Deno.env.get('PRINTIFY_API_KEY');
    if (!printifyApiKey) {
      throw new Error('PRINTIFY_API_KEY not configured');
    }

    // First, get the shop ID
    console.log('Fetching Printify shops...');
    const shopsResponse = await fetch('https://api.printify.com/v1/shops.json', {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`,
      },
    });

    if (!shopsResponse.ok) {
      const errorText = await shopsResponse.text();
      console.error('Printify shops error:', errorText);
      throw new Error(`Failed to fetch Printify shops: ${shopsResponse.status}`);
    }

    const shops = await shopsResponse.json();
    console.log('Printify shops:', JSON.stringify(shops));

    if (!shops || shops.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          products: [], 
          message: 'No Printify shops found. Please create a shop in Printify first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopId = shops[0].id;
    console.log('Using shop ID:', shopId);

    // Fetch products from Printify
    console.log('Fetching Printify products...');
    const productsResponse = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`,
      },
    });

    if (!productsResponse.ok) {
      const errorText = await productsResponse.text();
      console.error('Printify products error:', errorText);
      throw new Error(`Failed to fetch Printify products: ${productsResponse.status}`);
    }

    const productsData = await productsResponse.json();
    console.log('Fetched', productsData.data?.length || 0, 'products from Printify');

    // Helper to strip HTML from descriptions
    const stripHtml = (html: string): string => {
      if (!html) return '';
      return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Helper to clean titles
    const cleanTitle = (title: string): string => {
      if (!title) return '';
      return title.replace(/^\(Printify\)\s*/i, '').trim();
    };

    // Get existing imported products with their data for comparison
    const { data: existingProducts } = await supabaseClient
      .from('products')
      .select('printify_product_id, printify_blueprint_id, printify_print_provider_id, name, description, price')
      .eq('is_printify_product', true);

    const importedByProductId = new Map(
      existingProducts?.map(p => [p.printify_product_id, p]) || []
    );

    const importedBlueprints = new Set(
      existingProducts?.map(p => `${p.printify_blueprint_id}-${p.printify_print_provider_id}`) || []
    );

    // Map Printify products to a simplified format
    const products = (productsData.data || []).map((product: any) => {
      const cleanedTitle = cleanTitle(product.title);
      const cleanedDescription = stripHtml(product.description);
      const existingProduct = importedByProductId.get(product.id);
      const isImported = importedBlueprints.has(`${product.blueprint_id}-${product.print_provider_id}`);
      
      // Check if data has changed since import
      let hasChanges = false;
      if (isImported && existingProduct) {
        const currentBasePrice = (product.variants.find((v: any) => v.is_enabled) || product.variants[0])?.price / 100 || 0;
        hasChanges = 
          existingProduct.name !== cleanedTitle ||
          existingProduct.description !== cleanedDescription ||
          Math.abs(Number(existingProduct.price) - currentBasePrice) > 0.01;
      }

      return {
        id: product.id,
        title: cleanedTitle,
        description: cleanedDescription,
        blueprint_id: product.blueprint_id,
        print_provider_id: product.print_provider_id,
        images: (product.images || []).map((img: any) => ({
          src: img.src,
          variant_ids: img.variant_ids || [],
          position: img.position,
          is_default: img.is_default,
        })),
        variants: (product.variants || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          price: v.price / 100,
          is_enabled: v.is_enabled,
          options: v.options,
        })),
        options: product.options || [],
        is_imported: isImported,
        has_changes: hasChanges,
        created_at: product.created_at,
        visible: product.visible,
        is_locked: product.is_locked,
      };
    });

    console.log('Returning', products.length, 'products');

    return new Response(
      JSON.stringify({ 
        success: true, 
        products,
        shop: { id: shopId, title: shops[0].title }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching Printify products:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
