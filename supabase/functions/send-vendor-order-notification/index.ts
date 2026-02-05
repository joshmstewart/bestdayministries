import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { SITE_URL, SENDERS } from "../_shared/domainConstants.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VendorOrderNotificationRequest {
  orderId: string;
  vendorId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, vendorId }: VendorOrderNotificationRequest = await req.json();

    console.log(`Sending order notification to vendor ${vendorId} for order ${orderId}`);

    // Get vendor profile with email and house vendor status
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from("vendors")
      .select("user_id, business_name, is_house_vendor")
      .eq("id", vendorId)
      .single();

    if (vendorError || !vendor) {
      console.error("Error fetching vendor:", vendorError);
      return new Response(
        JSON.stringify({ error: "Vendor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine recipient emails based on whether this is a house vendor
    let recipientEmails: string[] = [];
    let recipientName = vendor.business_name || "Vendor";

    if (vendor.is_house_vendor) {
      // For house vendors (Printify, Coffee, etc.), notify all admins/owners
      console.log("House vendor detected - fetching all admin/owner emails");
      
      const { data: adminRoles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "owner"]);

      if (rolesError) {
        console.error("Error fetching admin roles:", rolesError);
      } else if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map(r => r.user_id);
        
        const { data: adminProfiles, error: profilesError } = await supabaseAdmin
          .from("profiles")
          .select("email, display_name")
          .in("id", adminUserIds)
          .not("email", "is", null);

        if (profilesError) {
          console.error("Error fetching admin profiles:", profilesError);
        } else if (adminProfiles) {
          // Filter out system account and collect valid emails
          recipientEmails = adminProfiles
            .map(p => p.email)
            .filter((email): email is string => 
              email !== null && 
              email !== undefined && 
              !email.includes("system@")
            );
          
          console.log(`Found ${recipientEmails.length} admin/owner emails for house vendor notification`);
        }
      }
      
      recipientName = "Team";
    } else {
      // For regular vendors, notify the vendor owner
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("email, display_name")
        .eq("id", vendor.user_id)
        .single();

      if (profileError || !profile?.email) {
        console.error("Error fetching vendor profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Vendor email not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      recipientEmails = [profile.email];
      recipientName = profile.display_name || vendor.business_name || "there";
    }

    if (recipientEmails.length === 0) {
      console.error("No recipient emails found for vendor notification");
      return new Response(
        JSON.stringify({ error: "No recipient emails found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, total_amount, shipping_address, customer_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order items for this vendor
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select(`
        id,
        quantity,
        unit_price,
        total_price,
        variant_info,
        vendor_payout,
        products (
          title,
          images
        )
      `)
      .eq("order_id", orderId)
      .eq("vendor_id", vendorId);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // Get customer info
    let customerName = "Customer";
    if (order.customer_id) {
      const { data: customer } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("id", order.customer_id)
        .single();
      if (customer?.display_name) {
        customerName = customer.display_name;
      }
    }

    // Parse shipping address
    let shippingInfo = "";
    if (order.shipping_address) {
      const addr = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address;
      shippingInfo = `
        <p><strong>Ship to:</strong></p>
        <p style="margin-left: 16px;">
          ${addr.name || customerName}<br/>
          ${addr.address?.line1 || ''}<br/>
          ${addr.address?.line2 ? addr.address.line2 + '<br/>' : ''}
          ${addr.address?.city || ''}, ${addr.address?.state || ''} ${addr.address?.postal_code || ''}<br/>
          ${addr.address?.country || ''}
        </p>
      `;
    }

    // Build items HTML
    const itemsHtml = (orderItems || []).map(item => {
      const product = item.products as any;
      const variantInfo = item.variant_info ? ` (${(item.variant_info as any).variant || ''})` : '';
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            ${product?.title || 'Product'}${variantInfo}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
            $${(item.vendor_payout || item.total_price || 0).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    // Calculate vendor total
    const vendorTotal = (orderItems || []).reduce((sum, item) => 
      sum + (item.vendor_payout || item.total_price || 0), 0
    );

    // Get app settings for branding
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = settings?.setting_value || "";
    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
            .logo { max-width: 200px; height: auto; }
            .content { padding: 30px 0; }
            .order-box { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 14px 28px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #FF6B35; color: white; padding: 12px; text-align: left; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="Logo" class="logo" /></div>` : ''}
            
            <div class="content">
              <h1>🎉 New Order Received!</h1>
              
              <p>Hi ${recipientName}!</p>
              
              <p>Great news! You have a new order that's been paid and is ready to fulfill.</p>
              
              <div class="order-box">
                <p><strong>Order ID:</strong> ${orderId.substring(0, 8)}...</p>
                <p><strong>Order Date:</strong> ${orderDate}</p>
                <p><strong>Customer:</strong> ${customerName}</p>
              </div>
              
              <h3>Items to Fulfill:</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Your Payout</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td style="padding: 12px;" colspan="2"><strong>Total Payout</strong></td>
                    <td style="padding: 12px; text-align: right;"><strong>$${vendorTotal.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
              
              ${shippingInfo}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${SITE_URL}/vendor-dashboard" class="button">
                  View Order & Add Tracking
                </a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                <strong>Next Steps:</strong><br/>
                1. Pack the item(s) for shipping<br/>
                2. Ship the order and get a tracking number<br/>
                3. Add the tracking info in your vendor dashboard<br/>
                4. You'll receive your payout once the order is delivered!
              </p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the marketplace.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to all recipients
    const emailResponse = await resend.emails.send({
      from: SENDERS.marketplace,
      to: recipientEmails,
      subject: `🛒 New Order Received - Action Required!`,
      html: html,
    });

    console.log("Vendor notification email sent successfully:", emailResponse);
    console.log(`Sent to ${recipientEmails.length} recipient(s):`, recipientEmails);

    // Log the notification
    await supabaseAdmin
      .from("email_notifications_log")
      .insert({
        user_id: vendor.user_id,
        recipient_email: recipientEmails.join(", "),
        notification_type: vendor.is_house_vendor ? "house_vendor_new_order" : "vendor_new_order",
        subject: "New Order Received - Action Required!",
        status: "sent",
        metadata: {
          order_id: orderId,
          vendor_id: vendorId,
          items_count: orderItems?.length || 0,
          is_house_vendor: vendor.is_house_vendor,
          recipient_count: recipientEmails.length
        }
      });
    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-vendor-order-notification:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
