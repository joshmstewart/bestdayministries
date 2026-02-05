import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNumber, email } = await req.json();

    console.log('Guest order lookup request:', { orderNumber, email });

    if (!orderNumber || !email) {
      return new Response(
        JSON.stringify({ error: 'Order number and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize the order number - remove any prefix and convert to lowercase for comparison
    const normalizedOrderNumber = orderNumber.replace(/^#?/i, '').toLowerCase();

    // First, find orders matching the email
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total_amount,
        status,
        shipping_address,
        customer_email,
        order_items (
          id,
          product_id,
          vendor_id,
          quantity,
          price_at_purchase,
          fulfillment_status,
          tracking_number,
          tracking_url,
          carrier,
          products (
            name,
            images,
            is_printify_product
          ),
          vendors (
            business_name
          )
        )
      `)
      .ilike('customer_email', email)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    console.log(`Found ${orders?.length || 0} orders for email ${email}`);

    // Filter to find the order matching the order number (first 8 chars of UUID)
    const matchingOrder = orders?.find(order => 
      order.id.toLowerCase().startsWith(normalizedOrderNumber) ||
      order.id.toLowerCase() === normalizedOrderNumber
    );

    if (!matchingOrder) {
      console.log('No matching order found for:', { normalizedOrderNumber, email });
      return new Response(
        JSON.stringify({ error: 'No order found with that order number and email combination' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found matching order:', matchingOrder.id);

    return new Response(
      JSON.stringify({ order: matchingOrder }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in lookup-guest-order:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to lookup order' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
