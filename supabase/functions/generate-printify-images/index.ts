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
    
    // Get all enabled variant IDs
    const enabledVariants = printifyProduct.variants?.filter((v: any) => v.is_enabled) || [];
    console.log(`Total enabled variants: ${enabledVariants.length}`);

    // Get variant IDs that already have images
    const variantsWithImages = new Set<number>();
    printifyProduct.images?.forEach((img: any) => {
      img.variant_ids?.forEach((vid: number) => variantsWithImages.add(vid));
    });
    
    console.log(`Variants with images: ${variantsWithImages.size}`);
    console.log(`Total images: ${printifyProduct.images?.length || 0}`);

    // Find variants without images
    const variantsNeedingImages = enabledVariants.filter(
      (v: any) => !variantsWithImages.has(v.id)
    );
    
    // Extract color info from variants needing images
    const colorsNeedingImages = [...new Set(variantsNeedingImages.map((v: any) => {
      const colorPart = v.title?.split(' / ')[0]?.trim();
      return colorPart || 'Unknown';
    }))];
    
    console.log(`Variants needing images: ${variantsNeedingImages.length}`);
    console.log(`Colors needing images: ${colorsNeedingImages.join(', ')}`);

    if (variantsNeedingImages.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All variants already have images',
          totalImages: printifyProduct.images?.length || 0,
          totalVariants: enabledVariants.length,
          variantsWithImages: variantsWithImages.size,
          variantsNeedingImages: 0,
          colorsNeedingImages: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Printify doesn't have a dedicated "generate images" API endpoint.
    // Mockup images are generated when you create/update a product with print areas.
    // We can try to trigger regeneration by doing a PUT request to update the product.
    
    console.log(`Attempting to trigger image regeneration by re-saving product...`);
    
    // Get current print areas (we'll just re-save them to trigger mockup generation)
    const updatePayload = {
      title: printifyProduct.title,
      description: printifyProduct.description,
      variants: printifyProduct.variants.map((v: any) => ({
        id: v.id,
        price: v.price,
        is_enabled: v.is_enabled
      })),
      print_areas: printifyProduct.print_areas
    };

    const updateResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${existingProduct.printify_product_id}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Product update failed:', errorText);
      
      // Even if update fails, return helpful info about what's missing
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Could not trigger image regeneration. ${variantsNeedingImages.length} variants (colors: ${colorsNeedingImages.join(', ')}) are missing images. You may need to generate these mockups directly in Printify's dashboard.`,
          totalImages: printifyProduct.images?.length || 0,
          totalVariants: enabledVariants.length,
          variantsWithImages: variantsWithImages.size,
          variantsNeedingImages: variantsNeedingImages.length,
          colorsNeedingImages
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const updatedProduct = await updateResponse.json();
    const newImageCount = updatedProduct.images?.length || 0;
    
    console.log(`Product re-saved. Now has ${newImageCount} images (was ${printifyProduct.images?.length || 0})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: newImageCount > (printifyProduct.images?.length || 0) 
          ? `Generated ${newImageCount - (printifyProduct.images?.length || 0)} new images!`
          : `Product re-saved. ${variantsNeedingImages.length} variants still need images (colors: ${colorsNeedingImages.join(', ')}). These may need to be generated in Printify's dashboard.`,
        previousImageCount: printifyProduct.images?.length || 0,
        newImageCount,
        totalVariants: enabledVariants.length,
        variantsNeedingImages: variantsNeedingImages.length,
        colorsNeedingImages
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
