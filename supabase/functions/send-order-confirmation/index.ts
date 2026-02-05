import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { emailDelay } from "../_shared/emailRateLimiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ORDER-CONFIRMATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerEmail } = await req.json();
    logStep("Function started", { orderId, customerEmail });

    if (!orderId) throw new Error("Order ID is required");
    if (!customerEmail) throw new Error("Customer email is required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get order details with items and vendor info
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          product:products (
            name,
            images,
            vendor_id
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message || 'Unknown'}`);
    }

    logStep("Order fetched", { itemCount: order.order_items?.length });

    // Get unique vendor IDs from order items
    const vendorIds = [...new Set(
      (order.order_items || [])
        .map((item: any) => item.product?.vendor_id)
        .filter(Boolean)
    )];

    // Get vendor owner emails and team member emails
    const vendorEmails: string[] = [];
    
    if (vendorIds.length > 0) {
      // Get vendor owner emails
      const { data: vendors } = await supabaseClient
        .from("vendors")
        .select("user_id")
        .in("id", vendorIds);
      
      if (vendors && vendors.length > 0) {
        const ownerIds = vendors.map((v: any) => v.user_id).filter(Boolean);
        
        // Get owner profile emails
        const { data: ownerProfiles } = await supabaseClient
          .from("profiles")
          .select("id, email")
          .in("id", ownerIds);
        
        if (ownerProfiles) {
          vendorEmails.push(...ownerProfiles.map((p: any) => p.email).filter(Boolean));
        }
      }

      // Get team member emails
      const { data: teamMembers } = await supabaseClient
        .from("vendor_team_members")
        .select("user_id")
        .in("vendor_id", vendorIds)
        .not("accepted_at", "is", null);
      
      if (teamMembers && teamMembers.length > 0) {
        const teamMemberIds = teamMembers.map((tm: any) => tm.user_id).filter(Boolean);
        
        const { data: teamProfiles } = await supabaseClient
          .from("profiles")
          .select("id, email")
          .in("id", teamMemberIds);
        
        if (teamProfiles) {
          vendorEmails.push(...teamProfiles.map((p: any) => p.email).filter(Boolean));
        }
      }
    }

    // Deduplicate vendor emails and exclude customer email
    const uniqueVendorEmails = [...new Set(vendorEmails)]
      .filter(email => email && email !== customerEmail);
    
    logStep("Vendor emails collected", { count: uniqueVendorEmails.length, emails: uniqueVendorEmails });

    // Format shipping address
    const shipping = order.shipping_address as any;
    const shippingHtml = shipping ? `
      <p style="margin: 0; color: #666;">
        ${shipping.name || ''}<br>
        ${shipping.line1 || ''}<br>
        ${shipping.line2 ? shipping.line2 + '<br>' : ''}
        ${shipping.city || ''}, ${shipping.state || ''} ${shipping.postal_code || ''}<br>
        ${shipping.country || 'US'}
      </p>
    ` : '<p style="color: #666;">Address not available</p>';

    // Build items HTML
    const itemsHtml = (order.order_items || []).map((item: any) => {
      const productName = item.product?.name || 'Product';
      const imageUrl = item.product?.images?.[0] || '';
      const price = (item.price_at_purchase * item.quantity).toFixed(2);
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            ${imageUrl ? `<img src="${imageUrl}" alt="${productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${productName}</strong><br>
            <span style="color: #666;">Qty: ${item.quantity}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
            $${price}
          </td>
        </tr>
      `;
    }).join('');

    const totalAmount = order.total_amount?.toFixed(2) || '0.00';
    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B4513; margin: 0;">Order Confirmed! 🎉</h1>
          <p style="color: #666; margin-top: 10px;">Thank you for your purchase</p>
        </div>

        <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Order Details</h2>
          <p style="margin: 5px 0; color: #666;">
            <strong>Order ID:</strong> ${orderId.substring(0, 8).toUpperCase()}<br>
            <strong>Date:</strong> ${orderDate}<br>
            <strong>Total:</strong> $${totalAmount}
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Items</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemsHtml}
          </table>
        </div>

        <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Shipping To</h2>
          ${shippingHtml}
        </div>

        <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            We'll send you another email when your order ships.<br>
            Questions? Reply to this email and we'll help!
          </p>
        </div>

        <div style="text-align: center; padding-top: 20px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Best Day Ministries<br>
            Thank you for supporting our mission!
          </p>
        </div>
      </body>
      </html>
    `;

    // Send to customer
    const emailResponse = await resend.emails.send({
      from: "Joy House Store <orders@bestdayministries.org>",
      to: [customerEmail],
      subject: `Order Confirmed - #${orderId.substring(0, 8).toUpperCase()}`,
      html: emailHtml,
    });

    const emailId = emailResponse?.data?.id || 'unknown';
    logStep("Customer email sent", { emailId });

    // Log the customer email
    await supabaseClient.from("email_audit_log").insert({
      email_type: "order_confirmation",
      recipient_email: customerEmail,
      subject: `Order Confirmed - #${orderId.substring(0, 8).toUpperCase()}`,
      from_email: "orders@bestdayministries.org",
      from_name: "Joy House Store",
      status: "sent",
      related_type: "order",
      related_id: orderId,
      resend_email_id: emailId,
      sent_at: new Date().toISOString(),
      html_content: emailHtml,
    });

    // Send to vendor owners and team members
    if (uniqueVendorEmails.length > 0) {
      const vendorEmailHtml = emailHtml.replace(
        'Order Confirmed! 🎉',
        '🛒 New Order Received!'
      ).replace(
        'Thank you for your purchase',
        `Order from ${customerEmail}`
      );

      for (let i = 0; i < uniqueVendorEmails.length; i++) {
        const vendorEmail = uniqueVendorEmails[i];
        // Rate limit: wait before sending (except first email after customer email)
        if (i > 0) await emailDelay();
        
        try {
          const vendorEmailResponse = await resend.emails.send({
            from: "Joy House Store <orders@bestdayministries.org>",
            to: [vendorEmail],
            subject: `🛒 New Order - #${orderId.substring(0, 8).toUpperCase()}`,
            html: vendorEmailHtml,
          });

          const vendorEmailId = vendorEmailResponse?.data?.id || 'unknown';
          logStep("Vendor email sent", { vendorEmail, vendorEmailId });

          await supabaseClient.from("email_audit_log").insert({
            email_type: "order_notification_vendor",
            recipient_email: vendorEmail,
            subject: `🛒 New Order - #${orderId.substring(0, 8).toUpperCase()}`,
            from_email: "orders@bestdayministries.org",
            from_name: "Joy House Store",
            status: "sent",
            related_type: "order",
            related_id: orderId,
            resend_email_id: vendorEmailId,
            sent_at: new Date().toISOString(),
            html_content: vendorEmailHtml,
          });
        } catch (vendorError) {
          logStep("Vendor email failed", { vendorEmail, error: String(vendorError) });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailId, vendorEmailsSent: uniqueVendorEmails.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
