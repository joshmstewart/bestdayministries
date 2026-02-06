import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const subscriberId = url.searchParams.get("id");

    if (!subscriberId) {
      return new Response(
        `<html>
          <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>Invalid Unsubscribe Link</h1>
            <p>This unsubscribe link is invalid or expired.</p>
          </body>
        </html>`,
        { 
          status: 400,
          headers: { "Content-Type": "text/html" }
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update subscriber status
    const { error } = await supabaseClient
      .from("newsletter_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", subscriberId);

    if (error) {
      throw error;
    }

    // Return confirmation page
    return new Response(
      `<html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Unsubscribed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              text-align: center;
              background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
              min-height: 100vh;
            }
            .card {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2d3748;
              margin-bottom: 20px;
            }
            p {
              color: #4a5568;
              line-height: 1.6;
              margin-bottom: 15px;
            }
            .emoji {
              font-size: 48px;
              margin-bottom: 20px;
            }
            a {
              color: #3b82f6;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="emoji">✓</div>
            <h1>You've Been Unsubscribed</h1>
            <p>You will no longer receive newsletter emails from Best Day Ministries.</p>
            <p>We're sorry to see you go! If you change your mind, you can always <a href="https://bestdayministries.org/newsletter">resubscribe here</a>.</p>
            <p style="margin-top: 30px; font-size: 14px; color: #718096;">
              <a href="https://bestdayministries.org">Return to Best Day Ministries</a>
            </p>
          </div>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error: any) {
    console.error("Error in unsubscribe-newsletter:", error);
    return new Response(
      `<html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
          <h1>Error</h1>
          <p>Sorry, there was an error processing your unsubscribe request.</p>
          <p style="color: #666;">${error.message}</p>
        </body>
      </html>`,
      { 
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
});