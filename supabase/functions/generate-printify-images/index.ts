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

    // Fetch the product from Printify to get current images and variants
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
    
    // Get all enabled variant IDs
    const enabledVariantIds = printifyProduct.variants
      ?.filter((v: any) => v.is_enabled)
      .map((v: any) => v.id) || [];
    
    console.log(`Total enabled variants: ${enabledVariantIds.length}`);

    // Get variant IDs that already have images
    const variantsWithImages = new Set<number>();
    printifyProduct.images?.forEach((img: any) => {
      img.variant_ids?.forEach((vid: number) => variantsWithImages.add(vid));
    });
    
    console.log(`Variants with images: ${variantsWithImages.size}`);

    // Find variants without images
    const variantsNeedingImages = enabledVariantIds.filter(
      (vid: number) => !variantsWithImages.has(vid)
    );
    
    console.log(`Variants needing images: ${variantsNeedingImages.length}`);
    console.log(`Variant IDs needing images: ${variantsNeedingImages.join(', ')}`);

    if (variantsNeedingImages.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All variants already have images',
          generatedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Printify's image generation endpoint
    console.log(`Requesting image generation for ${variantsNeedingImages.length} variants...`);
    
    const generateResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${existingProduct.printify_product_id}/images.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variant_ids: variantsNeedingImages
        }),
      }
    );

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Image generation failed:', errorText);
      throw new Error(`Failed to generate images: ${generateResponse.statusText} - ${errorText}`);
    }

    const generateResult = await generateResponse.json();
    console.log('Image generation result:', JSON.stringify(generateResult));

    // Fetch the updated product to get new image count
    const updatedProductResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${existingProduct.printify_product_id}.json`,
      {
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let newImageCount = 0;
    if (updatedProductResponse.ok) {
      const updatedProduct = await updatedProductResponse.json();
      newImageCount = updatedProduct.images?.length || 0;
      console.log(`Product now has ${newImageCount} images`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Requested image generation for ${variantsNeedingImages.length} variants`,
        variantsRequested: variantsNeedingImages.length,
        previousImageCount: printifyProduct.images?.length || 0,
        newImageCount: newImageCount,
        generatedCount: newImageCount - (printifyProduct.images?.length || 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating Printify images:', error);
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
