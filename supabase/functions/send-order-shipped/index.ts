import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { EMAILS } from "../_shared/domainConstants.ts";
import { emailDelay } from "../_shared/emailRateLimiter.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[send-order-shipped] ${step}${detailsStr}`);
};

interface ShippedEmailRequest {
  orderId: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, trackingNumber, trackingUrl, carrier }: ShippedEmailRequest = await req.json();
    
    logStep('Processing shipped email', { orderId, trackingNumber, carrier });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order details with vendor info
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        id,
        customer_email,
        shipping_address,
        order_items (
          id,
          quantity,
          price_at_purchase,
          products (
            name,
            vendor_id
          )
        )
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      logStep("Order query failed", {
        message: orderError.message,
        details: (orderError as any).details,
        hint: (orderError as any).hint,
        code: (orderError as any).code,
      });
      throw new Error(`Failed to load order ${orderId}: ${orderError.message}`);
    }

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (!order.customer_email) {
      logStep('No customer email, skipping');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique vendor IDs from order items
    const vendorIds = [...new Set(
      (order.order_items || [])
        .map((item: any) => item.products?.vendor_id)
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
      .filter(email => email && email !== order.customer_email);
    
    logStep("Vendor emails collected", { count: uniqueVendorEmails.length });

    const shippingAddress = (order.shipping_address || {}) as any;

    const line1 = shippingAddress.line1 || shippingAddress.address1 || '';
    const line2 = shippingAddress.line2 || shippingAddress.address2 || '';
    const city = shippingAddress.city || '';
    const state = shippingAddress.state || shippingAddress.region || '';
    const postalCode = shippingAddress.postal_code || shippingAddress.zip || '';

    const addressLine = line1
      ? `${line1}${line2 ? `, ${line2}` : ''}, ${city}${state ? `, ${state}` : ''} ${postalCode}`.replace(/\s+/g, ' ').trim()
      : 'Address on file';

    // Build items HTML
    const itemsHtml = order.order_items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.products?.name || 'Product'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D97706; margin-bottom: 10px;">📦 Your Order Has Shipped!</h1>
          <p style="color: #666; font-size: 16px;">Great news! Your order is on its way.</p>
        </div>

        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h2 style="margin: 0 0 16px 0; color: #92400E;">Track Your Package</h2>
          <p style="margin: 0 0 8px 0; color: #78350F;">
            <strong>Carrier:</strong> ${carrier}
          </p>
          <p style="margin: 0 0 16px 0; color: #78350F;">
            <strong>Tracking Number:</strong> ${trackingNumber}
          </p>
          <a href="${trackingUrl}" style="display: inline-block; background: #D97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Track Package →
          </a>
        </div>

        <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; color: #333;">Items Shipped</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #eee;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #0369A1;">Shipping To</h3>
          <p style="margin: 0; color: #0C4A6E;">${addressLine}</p>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Thank you for supporting Best Day Ever Ministries!</p>
          <p style="margin-top: 16px;">
            Questions? Reply to this email or contact us at<br>
            <a href="mailto:${EMAILS.info}" style="color: #D97706;">${EMAILS.info}</a>
          </p>
        </div>
      </body>
      </html>
    `;

    logStep('Sending shipped email', { to: order.customer_email });

    const emailResponse = await resend.emails.send({
      from: `Joy House Store <orders@bestdayministries.org>`,
      to: [order.customer_email],
      subject: `📦 Your order has shipped! Tracking: ${trackingNumber}`,
      html: emailHtml,
    });

    const emailId = (emailResponse as any)?.id || (emailResponse as any)?.data?.id;
    logStep('Shipped email sent', { emailId });

    // Log to email audit log for tracking and preview
    await supabaseClient.from("email_audit_log").insert({
      email_type: "order_shipped",
      recipient_email: order.customer_email,
      subject: `📦 Your order has shipped! Tracking: ${trackingNumber}`,
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
        'Your Order Has Shipped!',
        'Order Shipped Notification'
      ).replace(
        'Great news! Your order is on its way.',
        `Order for ${order.customer_email} has been shipped.`
      );

      for (let i = 0; i < uniqueVendorEmails.length; i++) {
        const vendorEmail = uniqueVendorEmails[i];
        // Rate limit: wait before sending (except first email after customer email)
        if (i > 0) await emailDelay();
        
        try {
          const vendorEmailResponse = await resend.emails.send({
            from: `Joy House Store <orders@bestdayministries.org>`,
            to: [vendorEmail],
            subject: `📦 Order Shipped - Tracking: ${trackingNumber}`,
            html: vendorEmailHtml,
          });

          const vendorEmailId = (vendorEmailResponse as any)?.id || (vendorEmailResponse as any)?.data?.id;
          logStep('Vendor shipped email sent', { vendorEmail, vendorEmailId });

          await supabaseClient.from("email_audit_log").insert({
            email_type: "order_shipped_vendor",
            recipient_email: vendorEmail,
            subject: `📦 Order Shipped - Tracking: ${trackingNumber}`,
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
          logStep('Vendor shipped email failed', { vendorEmail, error: String(vendorError) });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, emailId, vendorEmailsSent: uniqueVendorEmails.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[send-order-shipped] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
