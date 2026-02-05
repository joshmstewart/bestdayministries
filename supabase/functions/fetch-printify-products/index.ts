import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper function to fetch with retry and timeout
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // If we get a 5xx error, retry
      if (response.status >= 500 && attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed with ${response.status}, retrying in ${attempt * 2}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed: ${errorMessage}, retrying in ${attempt * 2}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

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
    const shopsResponse = await fetchWithRetry('https://api.printify.com/v1/shops.json', {
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

    // Fetch ALL products from Printify with pagination
    console.log('Fetching Printify products...');
    let allProducts: any[] = [];
    let page = 1;
    const limit = 50; // Printify max per page is 50
    let hasMore = true;

    while (hasMore) {
      const productsResponse = await fetchWithRetry(
        `https://api.printify.com/v1/shops/${shopId}/products.json?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${printifyApiKey}`,
          },
        }
      );

      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        console.error('Printify products error:', errorText);
        throw new Error(`Failed to fetch Printify products: ${productsResponse.status}`);
      }

      const productsData = await productsResponse.json();
      const pageProducts = productsData.data || [];
      console.log(`Fetched page ${page}: ${pageProducts.length} products`);
      
      allProducts = allProducts.concat(pageProducts);
      
      // Check if there are more pages
      if (pageProducts.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log('Fetched', allProducts.length, 'total products from Printify');

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

    // Get existing imported products with their original Printify data for comparison
    const { data: existingProducts } = await supabaseClient
      .from('products')
      .select('id, printify_product_id, printify_blueprint_id, printify_print_provider_id, name, description, price, images, printify_original_title, printify_original_description, printify_original_price, printify_original_images, is_active')
      .eq('is_printify_product', true);

    const importedByProductId = new Map(
      existingProducts?.map(p => [p.printify_product_id, p]) || []
    );

    // Track Printify product IDs from API response to detect deletions
    const printifyProductIds = new Set(allProducts.map((p: any) => p.id));

    // Map Printify products to a simplified format
    const products = allProducts.map((product: any) => {
      const cleanedTitle = cleanTitle(product.title);
      const cleanedDescription = stripHtml(product.description);
      const existingProduct = importedByProductId.get(product.id);
      // Check by actual Printify product ID, not blueprint combo
      const isImported = importedByProductId.has(product.id);
      
      // Check if Printify data has changed since import
      // Compare current Printify data vs original Printify data at import time
      // This way, manual local edits won't trigger false "has changes" flags
      let hasChanges = false;
      if (isImported && existingProduct) {
        const currentBasePrice = (product.variants.find((v: any) => v.is_enabled) || product.variants[0])?.price / 100 || 0;
        
        // Compare against ORIGINAL Printify values, not current store values
        const originalTitle = existingProduct.printify_original_title || existingProduct.name;
        const originalDescription = existingProduct.printify_original_description || existingProduct.description;
        const originalPrice = existingProduct.printify_original_price ?? Number(existingProduct.price);
        
        const titleChanged = originalTitle !== cleanedTitle;
        const descriptionChanged = originalDescription !== cleanedDescription;
        const priceChanged = Math.abs(originalPrice - currentBasePrice) > 0.01;
        
        // Check if images have changed
        const currentPrintifyImages = (product.images || []).map((img: any) => img.src).sort();
        const originalImages = (existingProduct.printify_original_images || existingProduct.images || []).sort();
        const imagesChanged = JSON.stringify(currentPrintifyImages) !== JSON.stringify(originalImages);
        
        hasChanges = titleChanged || descriptionChanged || priceChanged || imagesChanged;
        
        // Debug logging for change detection
        if (hasChanges) {
          console.log(`Change detected for "${product.title}":`);
          if (titleChanged) console.log(`  Title: "${originalTitle}" -> "${cleanedTitle}"`);
          if (descriptionChanged) console.log(`  Description changed (length: ${originalDescription?.length || 0} -> ${cleanedDescription?.length || 0})`);
          if (priceChanged) console.log(`  Price: ${originalPrice} -> ${currentBasePrice}`);
          if (imagesChanged) console.log(`  Images: ${originalImages.length} -> ${currentPrintifyImages.length} images`);
        }
      }

      // Get the current Printify base price
      const currentBasePrice = (product.variants.find((v: any) => v.is_enabled) || product.variants[0])?.price / 100 || 0;
      
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
        local_product_id: existingProduct?.id || null,
        // Include current local values AND original Printify values for comparison
        local_values: existingProduct ? {
          title: existingProduct.name,
          description: existingProduct.description || '',
          price: Number(existingProduct.price),
          original_title: existingProduct.printify_original_title,
          original_description: existingProduct.printify_original_description,
          original_price: existingProduct.printify_original_price,
        } : null,
        // Current Printify values (what's new)
        printify_values: {
          title: cleanedTitle,
          description: cleanedDescription,
          price: currentBasePrice,
        },
      };
    });

    // Find products that are in our database but no longer in Printify (deleted from Printify)
    const deletedFromPrintify = (existingProducts || [])
      .filter(p => p.printify_product_id && !printifyProductIds.has(p.printify_product_id))
      .map(p => ({
        id: p.printify_product_id,
        local_product_id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        is_active: p.is_active,
      }));

    console.log('Returning', products.length, 'products,', deletedFromPrintify.length, 'deleted from Printify');

    return new Response(
      JSON.stringify({ 
        success: true, 
        products,
        deletedFromPrintify,
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
