import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const PRIMARY_DOMAIN = "bestdayministries.org";
const DEFAULT_REDIRECT_URL = `https://${PRIMARY_DOMAIN}/auth?type=recovery`;

// Token validity: 1 hour
const TOKEN_VALIDITY_HOURS = 1;

const normalizeRedirectUrl = (candidate?: string) => {
  if (!candidate) return DEFAULT_REDIRECT_URL;
  try {
    const url = new URL(candidate);
    url.protocol = "https:";
    url.host = PRIMARY_DOMAIN;
    if (!url.pathname || url.pathname === "/") url.pathname = "/auth";
    if (!url.searchParams.get("type")) url.searchParams.set("type", "recovery");
    return url.toString();
  } catch {
    return DEFAULT_REDIRECT_URL;
  }
};

// Generate a secure random token
const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PasswordResetRequest {
  email: string;
  redirectUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("Processing password reset for email:", normalizedEmail);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Look up user by email using direct database query (more reliable than listUsers pagination)
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", supabaseAdmin.rpc("get_user_id_by_email", { email_input: normalizedEmail }))
      .maybeSingle();

    // Fallback: Query auth.users directly via RPC or use listUsers with filter
    // The listUsers API supports email filter which is more efficient
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Actually, let's use a more reliable approach - query with pagination to find the user
    let user = null;
    let page = 1;
    const perPage = 100;
    
    while (!user) {
      const { data: pageData, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (pageError) {
        console.error("Error listing users page", page, ":", pageError);
        break;
      }
      
      if (!pageData.users || pageData.users.length === 0) {
        break;
      }
      
      user = pageData.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      
      if (user) break;
      
      // If we got fewer users than perPage, we've reached the end
      if (pageData.users.length < perPage) {
        break;
      }
      
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 20) {
        console.error("Exceeded maximum page limit while searching for user");
        break;
      }
    }

    if (!user) {
      // Don't reveal if email exists or not for security
      console.log("No user found for email after searching all pages (not revealing to client)");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Found user:", user.id, "for email:", normalizedEmail);

    // Generate our own reusable token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + TOKEN_VALIDITY_HOURS * 60 * 60 * 1000);

    // Store token in database
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token_hash: token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing reset token:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate reset link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build reset link with our custom token
    const redirectToUrl = new URL(normalizeRedirectUrl(redirectUrl));
    redirectToUrl.searchParams.set("reset_token", token);

    const resetLink = redirectToUrl.toString();
    console.log("Generated reset link for user");

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Best Day Ever <no-reply@bestdayministries.org>",
      to: [normalizedEmail],
      subject: "Reset Your Password - Best Day Ministries",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #E07B39 0%, #D2691E 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Best Day Ministries</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            <p>We received a request to reset the password for your account. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #E07B39 0%, #D2691E 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px; word-break: break-all; text-align: center;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #E07B39;">${resetLink}</a>
            </p>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Best Day Ministries<br>
              <a href="https://bestdayministries.org" style="color: #E07B39;">bestdayministries.org</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
