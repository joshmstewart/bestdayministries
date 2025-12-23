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

    const { productId } = await req.json();

    if (!productId) {
      throw new Error('No product ID provided');
    }

    // Get the existing product from our database
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

    // Get shop ID
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

    // Fetch the product from Printify
    console.log(`Fetching product ${existingProduct.printify_product_id} from Printify`);
    
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
    
    // Log detailed image info
    console.log(`Product has ${printifyProduct.images?.length || 0} images in API response`);
    printifyProduct.images?.forEach((img: any, idx: number) => {
      console.log(`Image ${idx + 1}: ${img.src?.substring(0, 80)}... covers ${img.variant_ids?.length || 0} variants`);
    });
    
    // Get all enabled variant IDs
    const enabledVariants = printifyProduct.variants?.filter((v: any) => v.is_enabled) || [];
    console.log(`Total enabled variants: ${enabledVariants.length}`);

    // Build a map of variant ID to image
    const variantToImage = new Map<number, string>();
    printifyProduct.images?.forEach((img: any) => {
      img.variant_ids?.forEach((vid: number) => {
        if (!variantToImage.has(vid)) {
          variantToImage.set(vid, img.src);
        }
      });
    });
    
    console.log(`Variants with images: ${variantToImage.size}`);

    // Find variants without images and group by color
    const variantsWithoutImages = enabledVariants.filter((v: any) => !variantToImage.has(v.id));
    const colorsMissingImages = [...new Set(variantsWithoutImages.map((v: any) => {
      const colorPart = v.title?.split(' / ')[0]?.trim();
      return colorPart || 'Unknown';
    }))];
    
    console.log(`Variants without images: ${variantsWithoutImages.length}`);
    console.log(`Colors missing: ${colorsMissingImages.join(', ')}`);

    // Return diagnostic info - we can't generate images through API
    // but we can tell the user exactly what's missing
    return new Response(
      JSON.stringify({ 
        success: true,
        message: variantsWithoutImages.length === 0 
          ? 'All enabled variants have images in Printify!'
          : `${variantsWithoutImages.length} variants are missing images in Printify's API. Colors affected: ${colorsMissingImages.join(', ')}. These mockups may need to be generated in Printify's dashboard by clicking on the product and ensuring all colors have mockups generated.`,
        totalImages: printifyProduct.images?.length || 0,
        totalEnabledVariants: enabledVariants.length,
        variantsWithImages: variantToImage.size,
        variantsWithoutImages: variantsWithoutImages.length,
        colorsMissingImages,
        // Include all images we DO have for debugging
        availableImages: printifyProduct.images?.map((img: any) => ({
          src: img.src,
          variantCount: img.variant_ids?.length || 0,
          isDefault: img.is_default
        })) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error checking Printify images:', error);
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