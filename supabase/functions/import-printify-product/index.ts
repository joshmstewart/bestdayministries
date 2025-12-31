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
    // NOTE: Prices from the frontend are already in dollars (converted in fetch-printify-products)
    const enabledVariants = printifyProduct.variants.filter((v: any) => v.is_enabled);
    const baseVariant = enabledVariants[0] || printifyProduct.variants[0];
    // Price is already in dollars from frontend, no need to divide by 100
    const basePriceInDollars = baseVariant ? baseVariant.price : 0;
    const basePrice = basePriceInDollars + priceMarkup;
    
    console.log('Base variant price (dollars):', basePriceInDollars, 'Markup:', priceMarkup, 'Final:', basePrice);

    // Get first image URL
    const imageUrl = printifyProduct.images?.[0]?.src || null;

    // Build variant ID mapping
    const variantIds: Record<string, number> = {};
    printifyProduct.variants.forEach((v: any) => {
      if (v.is_enabled) {
        variantIds[v.title] = v.id;
      }
    });

    // Get the user-edited values (title/description may have been modified in the dialog)
    const userEditedTitle = printifyProduct.title || '';
    const userEditedDescription = printifyProduct.description || '';
    
    // Clean the user-edited title (remove any "(Printify)" prefix that might have been left)
    const cleanUserTitle = userEditedTitle.replace(/^\(Printify\)\s*/i, '').trim();
    
    // Clean the user-edited description (strip HTML tags)
    const cleanUserDescription = userEditedDescription
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    
    // For the original Printify baseline, we need the raw Printify values BEFORE user edits
    // These come from printifyProduct.original_title/description if provided, otherwise use the edited values
    const originalPrintifyTitle = (printifyProduct.original_title || userEditedTitle).replace(/^\(Printify\)\s*/i, '').trim();
    const rawOriginalDescription = printifyProduct.original_description || userEditedDescription;
    const originalPrintifyDescription = rawOriginalDescription
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Import: User title:', cleanUserTitle);
    console.log('Import: Original Printify title for baseline:', originalPrintifyTitle);

    // Get all image URLs
    const imageUrls = printifyProduct.images?.map((img: any) => img.src) || [];
    
    // Store original image URLs for change detection
    const originalPrintifyImages = printifyProduct.original_images?.map((img: any) => img.src) || imageUrls;

    // Get house vendor for official merch
    const { data: houseVendor } = await supabaseClient
      .from('vendors')
      .select('id')
      .eq('is_house_vendor', true)
      .single();

    // Create the product in our database
    // User-edited values go in name/description
    // Original Printify values go in printify_original_* for change detection
    const { data: newProduct, error: insertError } = await supabaseClient
      .from('products')
      .insert({
        name: cleanUserTitle,
        description: cleanUserDescription,
        price: basePrice,
        images: imageUrls,
        is_active: true,
        inventory_count: 999,
        is_printify_product: true,
        printify_product_id: printifyProduct.id,
        printify_blueprint_id: printifyProduct.blueprint_id,
        printify_print_provider_id: printifyProduct.print_provider_id,
        printify_variant_ids: variantIds,
        // Store ORIGINAL Printify values (before user edits) for detecting Printify-side changes
        printify_original_title: originalPrintifyTitle,
        printify_original_description: originalPrintifyDescription,
        printify_original_price: basePriceInDollars, // Raw Printify price in dollars, no markup
        printify_original_images: originalPrintifyImages, // Original Printify image URLs for change detection
        // Auto-assign to house vendor for official merch
        vendor_id: houseVendor?.id || null,
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
