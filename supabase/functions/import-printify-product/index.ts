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

    const { printifyProduct, priceMarkup = 0 } = await req.json();

    if (!printifyProduct) {
      throw new Error('No product data provided');
    }

    console.log('Importing Printify product:', printifyProduct.title);

    // Get the first enabled variant's price as base, or first variant
    const enabledVariants = printifyProduct.variants.filter((v: any) => v.is_enabled);
    const baseVariant = enabledVariants[0] || printifyProduct.variants[0];
    const basePrice = baseVariant ? (baseVariant.price + priceMarkup) : 0;

    // Get first image URL
    const imageUrl = printifyProduct.images?.[0]?.src || null;

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
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&')  // Replace &amp; with &
      .replace(/&lt;/g, '<')   // Replace &lt; with <
      .replace(/&gt;/g, '>')   // Replace &gt; with >
      .replace(/\s+/g, ' ')    // Collapse multiple spaces
      .trim();

    // Get all image URLs
    const imageUrls = printifyProduct.images?.map((img: any) => img.src) || [];

    // Create the product in our database
    const { data: newProduct, error: insertError } = await supabaseClient
      .from('products')
      .insert({
        name: printifyProduct.title,
        description: cleanDescription,
        price: basePrice,
        images: imageUrls,
        is_active: true,
        inventory_count: 999, // POD has unlimited inventory
        is_printify_product: true,
        printify_product_id: printifyProduct.id,
        printify_blueprint_id: printifyProduct.blueprint_id,
        printify_print_provider_id: printifyProduct.print_provider_id,
        printify_variant_ids: variantIds,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting product:', insertError);
      throw new Error(`Failed to import product: ${insertError.message}`);
    }

    console.log('Successfully imported product:', newProduct.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        product: newProduct,
        message: `Successfully imported "${printifyProduct.title}"`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error importing Printify product:', error);
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
