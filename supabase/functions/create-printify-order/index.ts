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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    console.log('Creating Printify order for order:', orderId);

    const printifyApiKey = Deno.env.get('PRINTIFY_API_KEY');
    if (!printifyApiKey) {
      throw new Error('PRINTIFY_API_KEY not configured');
    }

    // Get the order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order query error:', orderError);
      throw new Error(`Order not found: ${orderError?.message || 'Unknown error'}`);
    }

    // Get customer profile separately
    let customerEmail = '';
    if (order.customer_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('id', order.customer_id)
        .single();
      customerEmail = profile?.email || '';
    }

    // Get order items that are Printify products
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from('order_items')
      .select(`
        *,
        product:products(
          id,
          name,
          is_printify_product,
          printify_blueprint_id,
          printify_print_provider_id,
          printify_variant_ids
        )
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      throw new Error('Failed to fetch order items');
    }

    // Filter to only Printify products
    const printifyItems = orderItems?.filter(item => item.product?.is_printify_product) || [];

    if (printifyItems.length === 0) {
      console.log('No Printify products in this order');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No Printify products to fulfill',
          printify_order_id: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get shop ID
    const shopsResponse = await fetch('https://api.printify.com/v1/shops.json', {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!shopsResponse.ok) {
      throw new Error('Failed to fetch Printify shops');
    }

    const shops = await shopsResponse.json();
    if (!shops || shops.length === 0) {
      throw new Error('No Printify shop found');
    }

    const shopId = shops[0].id;

    // Build line items for Printify
    const lineItems = printifyItems.map(item => {
      // Get the first variant ID from the mapping (simplified - you may want to track specific variants)
      const variantIds = item.product.printify_variant_ids || {};
      const firstVariantId = Object.values(variantIds)[0];

      return {
        product_id: item.product.id, // We'll need to look this up
        variant_id: firstVariantId,
        quantity: item.quantity,
      };
    });

    // For now, we need to get the actual Printify product ID
    // This requires fetching products from Printify and matching by blueprint
    const productsResponse = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productsResponse.ok) {
      throw new Error('Failed to fetch Printify products');
    }

    const printifyProducts = await productsResponse.json();

    // Match our products to Printify products
    const printifyLineItems = [];
    for (const item of printifyItems) {
      const matchingProduct = printifyProducts.data?.find((p: any) => 
        p.blueprint_id === item.product.printify_blueprint_id &&
        p.print_provider_id === item.product.printify_print_provider_id
      );

      if (matchingProduct) {
        // Get first enabled variant
        const enabledVariant = matchingProduct.variants?.find((v: any) => v.is_enabled);
        if (enabledVariant) {
          printifyLineItems.push({
            product_id: matchingProduct.id,
            variant_id: enabledVariant.id,
            quantity: item.quantity,
          });
        }
      }
    }

    if (printifyLineItems.length === 0) {
      throw new Error('Could not match any products to Printify catalog');
    }

    // Get shipping address from order (now populated from Stripe checkout)
    const dbShippingAddress = order.shipping_address as {
      name?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    } | null;

    if (!dbShippingAddress || !dbShippingAddress.line1 || !dbShippingAddress.city) {
      throw new Error('Shipping address is required but not found on order');
    }

    // Parse name into first/last for Printify
    const nameParts = (dbShippingAddress.name || '').split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';

    const shippingAddress = {
      first_name: firstName,
      last_name: lastName,
      email: customerEmail || '',
      address1: dbShippingAddress.line1,
      address2: dbShippingAddress.line2 || '',
      city: dbShippingAddress.city,
      country: dbShippingAddress.country || 'US',
      region: dbShippingAddress.state || '',
      zip: dbShippingAddress.postal_code || '',
    };
    
    console.log('Using shipping address:', shippingAddress);

    // Create the order in Printify
    console.log('Creating Printify order with', printifyLineItems.length, 'line items');
    
    const printifyOrderResponse = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: orderId,
        label: `Order ${orderId.substring(0, 8)}`,
        line_items: printifyLineItems,
        shipping_method: 1, // Standard shipping
        address_to: shippingAddress,
        send_shipping_notification: true,
      }),
    });

    if (!printifyOrderResponse.ok) {
      const errorText = await printifyOrderResponse.text();
      console.error('Printify order creation error:', errorText);
      throw new Error(`Failed to create Printify order: ${printifyOrderResponse.status}`);
    }

    const printifyOrder = await printifyOrderResponse.json();
    console.log('Printify order created:', printifyOrder.id);

    // IMPORTANT: Submit the order to send it to production
    // Without this step, orders stay "on hold"
    console.log('Submitting Printify order to production...');
    const submitResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/orders/${printifyOrder.id}/send_to_production.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!submitResponse.ok) {
      const submitError = await submitResponse.text();
      console.error('Failed to submit order to production:', submitError);
      // Order was created but not submitted - still update our records
    } else {
      console.log('Order submitted to production successfully');
    }

    // Update our order items with Printify order ID
    for (const item of printifyItems) {
      await supabaseClient
        .from('order_items')
        .update({
          printify_order_id: printifyOrder.id,
          printify_status: submitResponse.ok ? 'in_production' : 'pending',
        })
        .eq('id', item.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        printify_order_id: printifyOrder.id,
        submitted_to_production: submitResponse.ok,
        message: submitResponse.ok 
          ? 'Printify order created and submitted to production' 
          : 'Printify order created but not submitted (on hold)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating Printify order:', error);
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
