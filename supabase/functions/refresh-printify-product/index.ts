import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { productId } = await req.json();

    if (!productId) {
      throw new Error('No product ID provided');
    }

    // Get the existing product from our database to get the Printify product ID
    const { data: existingProduct, error: fetchError } = await supabaseClient
      .from('products')
      .select('id, name, printify_product_id')
      .eq('id', productId)
      .single();

    if (fetchError || !existingProduct) {
      throw new Error('Product not found in database');
    }

    if (!existingProduct.printify_product_id) {
      throw new Error('This product is not linked to Printify');
    }

    // Get Printify API key
    const printifyApiKey = Deno.env.get('PRINTIFY_API_KEY');
    if (!printifyApiKey) {
      throw new Error('PRINTIFY_API_KEY is not configured');
    }

    // Get shop ID first
    const shopsResponse = await fetch('https://api.printify.com/v1/shops.json', {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!shopsResponse.ok) {
      throw new Error(`Failed to fetch Printify shops: ${shopsResponse.statusText}`);
    }

    const shops = await shopsResponse.json();
    if (!shops || shops.length === 0) {
      throw new Error('No Printify shops found');
    }

    const shopId = shops[0].id;

    // Fetch the specific product from Printify
    console.log(`Fetching product ${existingProduct.printify_product_id} from Printify shop ${shopId}`);
    
    const productResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${existingProduct.printify_product_id}.json`,
      {
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!productResponse.ok) {
      throw new Error(`Failed to fetch product from Printify: ${productResponse.statusText}`);
    }

    const printifyProduct = await productResponse.json();
    console.log(`Fetched product: ${printifyProduct.title}, images: ${printifyProduct.images?.length || 0}, variants: ${printifyProduct.variants?.length || 0}`);

    // Extract colors from variant titles (format: "Color / Size" or just "Color")
    const uniqueColors = new Set<string>();
    printifyProduct.variants?.forEach((v: any) => {
      if (v.title) {
        // Parse color from title - it's usually before the " / " separator
        const colorPart = v.title.split(' / ')[0]?.trim();
        if (colorPart) {
          uniqueColors.add(colorPart);
        }
      }
    });
    console.log(`Available colors from variant titles: ${Array.from(uniqueColors).join(', ')}`);

    // Log image details to see which variant IDs they're associated with
    console.log(`Image details from Printify:`);
    printifyProduct.images?.forEach((img: any, index: number) => {
      console.log(`  Image ${index + 1}: variant_ids=${JSON.stringify(img.variant_ids)}, is_default=${img.is_default}`);
    });

    // Get the first enabled variant's price as base (convert from cents to dollars)
    const enabledVariants = printifyProduct.variants.filter((v: any) => v.is_enabled);
    const baseVariant = enabledVariants[0] || printifyProduct.variants[0];
    const basePrice = baseVariant ? baseVariant.price / 100 : 0;

    // Get all image URLs with their variant associations for better debugging
    const imageUrls = printifyProduct.images?.map((img: any) => img.src) || [];
    
    // Also store image-to-variant mapping for frontend use
    const imageVariantMap = printifyProduct.images?.map((img: any) => ({
      src: img.src,
      variant_ids: img.variant_ids || [],
      is_default: img.is_default || false,
    })) || [];

    // Build variant ID mapping
    const variantIds: Record<string, number> = {};
    printifyProduct.variants.forEach((v: any) => {
      if (v.is_enabled) {
        variantIds[v.title] = v.id;
      }
    });

    // Strip HTML tags from description
    const rawDescription = printifyProduct.description || '';
    const cleanDescription = rawDescription
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    // Clean title - remove "(Printify)" prefix
    const rawTitle = printifyProduct.title || '';
    const cleanTitle = rawTitle.replace(/^\(Printify\)\s*/i, '').trim();

    // Get the current product to preserve the markup
    const { data: currentProduct } = await supabaseClient
      .from('products')
      .select('price, printify_original_price')
      .eq('id', productId)
      .single();

    // Calculate the markup the admin applied (current price - original base price)
    // If original price is missing or clearly wrong (like $0.03 for a sticker), default to 0 markup
    let existingMarkup = 0;
    if (currentProduct && currentProduct.printify_original_price && currentProduct.printify_original_price > 1) {
      existingMarkup = Number(currentProduct.price) - currentProduct.printify_original_price;
    }
    
    // Apply the same markup to the new base price
    const newPriceWithMarkup = basePrice + Math.max(0, existingMarkup);

    console.log(`Price calculation: base=${basePrice}, markup=${existingMarkup}, final=${newPriceWithMarkup}`);

    // Update the product in our database - sync both the tracking fields AND the actual display values
    const { data: updatedProduct, error: updateError } = await supabaseClient
      .from('products')
      .update({
        // Update actual display values to match Printify (with preserved markup for price)
        name: cleanTitle,
        description: cleanDescription,
        price: newPriceWithMarkup,
        // Update images and variants
        images: imageUrls,
        printify_variant_ids: variantIds,
        // Update baseline tracking to mark as synced
        printify_original_title: cleanTitle,
        printify_original_description: cleanDescription,
        printify_original_price: basePrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating product:', updateError);
      throw new Error(`Failed to update product: ${updateError.message}`);
    }

    console.log(`Successfully refreshed product: ${updatedProduct.id}, now has ${imageUrls.length} images`);
    console.log(`Colors found in variants: ${Array.from(uniqueColors).join(', ')}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        product: updatedProduct,
        imageCount: imageUrls.length,
        variantCount: printifyProduct.variants?.length || 0,
        colorCount: uniqueColors.size,
        colors: Array.from(uniqueColors),
        message: `Successfully refreshed "${existingProduct.name}" with ${imageUrls.length} images (${uniqueColors.size} colors available in Printify)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error refreshing Printify product:', error);
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
