import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => ["admin", "owner"].includes(r.role));
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get Stripe mode
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "stripe_mode")
      .single();

    const stripeMode = settings?.setting_value === "live" ? "live" : "test";
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    const stripe = new Stripe(stripeKey!, {
      apiVersion: "2025-08-27.basil",
    });

    const startTime = new Date().toISOString();
    console.log("\n=== Starting Sponsorship Recovery ===");
    console.log(`Recovery started at: ${startTime}`);
    console.log(`Using Stripe mode: ${stripeMode}`);
    console.log("Finding incomplete sponsorships...");

    // Find sponsorships with missing critical fields
    const { data: incompleteSponsorships, error: fetchError } = await supabaseAdmin
      .from("sponsorships")
      .select("*")
      .not("stripe_subscription_id", "is", null)
      .or("sponsor_email.is.null,bestie_id.is.null,stripe_customer_id.is.null");

    if (fetchError) {
      throw new Error(`Error fetching sponsorships: ${fetchError.message}`);
    }

    console.log(`Found ${incompleteSponsorships?.length || 0} incomplete sponsorships`);

    const results = {
      checked: 0,
      fixed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    // Track changes for logging
    const changes: Array<{
      sponsorship_id: string;
      change_type: string;
      before_state: any;
      after_state: any;
      stripe_subscription_id: string;
    }> = [];

    // Track detailed logs
    const detailedLogs: Array<{
      timestamp: string;
      sponsorship_id: string;
      level: 'info' | 'success' | 'warning' | 'error';
      message: string;
      details?: any;
    }> = [];

    for (const sponsorship of incompleteSponsorships || []) {
      try {
        results.checked++;
        const logEntry = {
          timestamp: new Date().toISOString(),
          sponsorship_id: sponsorship.id,
          level: 'info' as const,
          message: `Processing sponsorship ${sponsorship.id}`,
          details: {
            stripe_subscription_id: sponsorship.stripe_subscription_id,
            stripe_mode: sponsorship.stripe_mode,
            sponsor_email: sponsorship.sponsor_email,
            bestie_id: sponsorship.bestie_id,
            stripe_customer_id: sponsorship.stripe_customer_id,
          }
        };
        detailedLogs.push(logEntry);
        console.log(`\nProcessing sponsorship ${sponsorship.id}...`);

        // Skip if wrong Stripe mode
        if (sponsorship.stripe_mode !== stripeMode) {
          detailedLogs.push({
            timestamp: new Date().toISOString(),
            sponsorship_id: sponsorship.id,
            level: 'warning',
            message: `Skipped: Wrong Stripe mode`,
            details: { expected: stripeMode, actual: sponsorship.stripe_mode }
          });
          console.log(`  Skipped: Wrong Stripe mode (${sponsorship.stripe_mode} vs ${stripeMode})`);
          results.skipped++;
          continue;
        }

        // Check if this is a payment intent instead of subscription
        if (sponsorship.stripe_subscription_id.startsWith('pi_')) {
          detailedLogs.push({
            timestamp: new Date().toISOString(),
            sponsorship_id: sponsorship.id,
            level: 'info',
            message: 'Detected payment intent ID (one-time payment)'
          });
          console.log(`  Detected payment intent ID (one-time payment)`);
          
          try {
            // Retrieve as payment intent, not subscription
            const paymentIntent = await stripe.paymentIntents.retrieve(
              sponsorship.stripe_subscription_id
            );
            
            const customer = await stripe.customers.retrieve(paymentIntent.customer as string);
            if (!customer || customer.deleted) {
              console.log(`  Skipped: Customer not found or deleted`);
              results.skipped++;
              continue;
            }
            
            const customerEmail = (customer as Stripe.Customer).email;
            const customerId = customer.id;
            
            // Only update email and customer_id for one-time payments
            const updateData: any = {};
            let needsUpdate = false;
            const beforeState: any = {
              sponsor_email: sponsorship.sponsor_email,
              stripe_customer_id: sponsorship.stripe_customer_id,
            };
            
            if (!sponsorship.sponsor_email && customerEmail) {
              updateData.sponsor_email = customerEmail;
              needsUpdate = true;
              console.log(`  Will add sponsor_email: ${customerEmail}`);
            }
            if (!sponsorship.stripe_customer_id) {
              updateData.stripe_customer_id = customerId;
              needsUpdate = true;
              console.log(`  Will add stripe_customer_id: ${customerId}`);
            }
            
            // Update if needed
            if (needsUpdate) {
              const { error: updateError } = await supabaseAdmin
                .from("sponsorships")
                .update(updateData)
                .eq("id", sponsorship.id);
              
              if (updateError) {
                detailedLogs.push({
                  timestamp: new Date().toISOString(),
                  sponsorship_id: sponsorship.id,
                  level: 'error',
                  message: `Error updating: ${updateError.message}`,
                  details: { attempted_values: updateData }
                });
                console.log(`  Error updating: ${updateError.message}`);
                results.errors.push({
                  sponsorship_id: sponsorship.id,
                  stripe_subscription_id: sponsorship.stripe_subscription_id,
                  error_type: 'update_failed',
                  error_message: updateError.message,
                  attempted_values: updateData,
                  suggested_fix: 'Check database constraints and field permissions',
                });
              } else {
                detailedLogs.push({
                  timestamp: new Date().toISOString(),
                  sponsorship_id: sponsorship.id,
                  level: 'success',
                  message: 'Updated one-time payment with customer info',
                  details: updateData
                });
                console.log(`  ✅ Updated one-time payment with customer info`);
                results.fixed++;
                
                const afterState = { ...beforeState, ...updateData };
                changes.push({
                  sponsorship_id: sponsorship.id,
                  change_type: 'payment_intent_backfill',
                  before_state: beforeState,
                  after_state: afterState,
                  stripe_subscription_id: sponsorship.stripe_subscription_id,
                });
              }
            } else {
              results.skipped++;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(`  Error processing payment intent: ${message}`);
            results.errors.push({
              sponsorship_id: sponsorship.id,
              stripe_subscription_id: sponsorship.stripe_subscription_id,
              error_type: 'payment_intent_error',
              error_message: message,
              suggested_fix: 'Verify payment intent exists in Stripe and customer is not deleted',
            });
          }
          
          continue; // Skip regular subscription processing
        }

        // Regular subscription processing
        const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
        detailedLogs.push({
          timestamp: new Date().toISOString(),
          sponsorship_id: sponsorship.id,
          level: 'info',
          message: 'Found Stripe subscription',
          details: {
            subscription_id: subscription.id,
            status: subscription.status,
            customer: subscription.customer
          }
        });

        // Fetch customer from Stripe
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer || customer.deleted) {
          detailedLogs.push({
            timestamp: new Date().toISOString(),
            sponsorship_id: sponsorship.id,
            level: 'warning',
            message: 'Skipped: Customer not found or deleted',
            details: { customer_id: subscription.customer }
          });
          results.skipped++;
          continue;
        }

        const customerEmail = (customer as Stripe.Customer).email;
        const customerId = customer.id;

        detailedLogs.push({
          timestamp: new Date().toISOString(),
          sponsorship_id: sponsorship.id,
          level: 'info',
          message: 'Found Stripe customer',
          details: {
            customer_id: customerId,
            customer_email: customerEmail
          }
        });

        // Prepare update data
        const updateData: any = {};
        let needsUpdate = false;
        const beforeState: any = {
          sponsor_email: sponsorship.sponsor_email,
          stripe_customer_id: sponsorship.stripe_customer_id,
          bestie_id: sponsorship.bestie_id,
        };

        if (!sponsorship.sponsor_email && customerEmail) {
          updateData.sponsor_email = customerEmail;
          needsUpdate = true;
          detailedLogs.push({
            timestamp: new Date().toISOString(),
            sponsorship_id: sponsorship.id,
            level: 'info',
            message: 'Will add sponsor_email',
            details: { sponsor_email: customerEmail }
          });
        }

        if (!sponsorship.stripe_customer_id) {
          updateData.stripe_customer_id = customerId;
          needsUpdate = true;
          detailedLogs.push({
            timestamp: new Date().toISOString(),
            sponsorship_id: sponsorship.id,
            level: 'info',
            message: 'Will add stripe_customer_id',
            details: { stripe_customer_id: customerId }
          });
        }

        // Try to get bestie_id - check sponsor_besties table FIRST (most reliable)
        if (!sponsorship.bestie_id) {
          let bestieId = null;

          // STRATEGY 1: Look up from sponsor_besties table (database join - most reliable)
          if (sponsorship.sponsor_bestie_id) {
            const { data: sponsorBestie } = await supabaseAdmin
              .from("sponsor_besties")
              .select("bestie_id")
              .eq("id", sponsorship.sponsor_bestie_id)
              .single();

            if (sponsorBestie?.bestie_id) {
              bestieId = sponsorBestie.bestie_id;
              detailedLogs.push({
                timestamp: new Date().toISOString(),
                sponsorship_id: sponsorship.id,
                level: 'success',
                message: 'Found bestie_id from sponsor_besties table',
                details: {
                  sponsor_bestie_id: sponsorship.sponsor_bestie_id,
                  bestie_id: bestieId
                }
              });
            } else {
              detailedLogs.push({
                timestamp: new Date().toISOString(),
                sponsorship_id: sponsorship.id,
                level: 'warning',
                message: 'sponsor_bestie_id exists but no bestie_id found',
                details: { sponsor_bestie_id: sponsorship.sponsor_bestie_id }
              });
            }
          }

          // STRATEGY 2: Check Stripe subscription metadata (fallback)
          if (!bestieId) {
            bestieId = subscription.metadata?.bestie_id;

            // VALIDATE metadata bestie_id against profiles table
            if (bestieId) {
              const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("id", bestieId)
                .single();
              
              if (!profile) {
                detailedLogs.push({
                  timestamp: new Date().toISOString(),
                  sponsorship_id: sponsorship.id,
                  level: 'warning',
                  message: 'Invalid bestie_id in Stripe metadata',
                  details: {
                    invalid_bestie_id: bestieId,
                    metadata: subscription.metadata
                  }
                });
                bestieId = null; // Reset to null
              } else {
                detailedLogs.push({
                  timestamp: new Date().toISOString(),
                  sponsorship_id: sponsorship.id,
                  level: 'success',
                  message: 'Validated bestie_id from Stripe metadata',
                  details: { bestie_id: bestieId }
                });
              }
            }
          }

          // If not found, try to get from receipts
          if (!bestieId) {
            const { data: receipt } = await supabaseAdmin
              .from("sponsorship_receipts")
              .select("bestie_name")
              .eq("sponsorship_id", sponsorship.id)
              .limit(1)
              .single();

            if (receipt?.bestie_name && receipt.bestie_name !== 'Bestie') {
              detailedLogs.push({
                timestamp: new Date().toISOString(),
                sponsorship_id: sponsorship.id,
                level: 'info',
                message: 'Found bestie_name from receipt',
                details: { bestie_name: receipt.bestie_name }
              });
              // Could potentially match to profiles here if needed
            }
          }

          if (bestieId) {
            updateData.bestie_id = bestieId;
            needsUpdate = true;
            detailedLogs.push({
              timestamp: new Date().toISOString(),
              sponsorship_id: sponsorship.id,
              level: 'info',
              message: 'Will add bestie_id',
              details: { bestie_id: bestieId }
            });
          } else {
            detailedLogs.push({
              timestamp: new Date().toISOString(),
              sponsorship_id: sponsorship.id,
              level: 'warning',
              message: 'Could not determine bestie_id from any source',
              details: {
                checked_sponsor_bestie_id: !!sponsorship.sponsor_bestie_id,
                sponsor_bestie_id_value: sponsorship.sponsor_bestie_id,
                checked_stripe_metadata: !!subscription.metadata?.bestie_id
              }
            });
          }
        }

        // Update sponsorship if needed
        if (needsUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update(updateData)
            .eq("id", sponsorship.id);

          if (updateError) {
            detailedLogs.push({
              timestamp: new Date().toISOString(),
              sponsorship_id: sponsorship.id,
              level: 'error',
              message: `Error updating: ${updateError.message}`,
              details: { attempted_values: updateData }
            });
            results.errors.push({
              sponsorship_id: sponsorship.id,
              stripe_subscription_id: sponsorship.stripe_subscription_id,
              error_type: updateError.code === '23503' ? 'foreign_key_violation' : 'update_failed',
              error_message: updateError.message,
              attempted_values: updateData,
              context: {
                stripe_metadata: subscription.metadata,
                sponsor_bestie_id: sponsorship.sponsor_bestie_id,
              },
              suggested_fix: updateError.code === '23503' 
                ? `Bestie ID ${updateData.bestie_id} does not exist in profiles table. Verify sponsor_besties mapping or Stripe metadata.`
                : 'Check database constraints and field permissions',
            });
          } else {
            detailedLogs.push({
              timestamp: new Date().toISOString(),
              sponsorship_id: sponsorship.id,
              level: 'success',
              message: 'Updated successfully',
              details: updateData
            });
            results.fixed++;
            
            // Track the change
            const afterState = { ...beforeState, ...updateData };
            changes.push({
              sponsorship_id: sponsorship.id,
              change_type: 'field_backfill',
              before_state: beforeState,
              after_state: afterState,
              stripe_subscription_id: sponsorship.stripe_subscription_id,
            });
          }
        } else {
          detailedLogs.push({
            timestamp: new Date().toISOString(),
            sponsorship_id: sponsorship.id,
            level: 'info',
            message: 'Skipped: No missing data found'
          });
          results.skipped++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`  Error: ${message}`);
        results.errors.push({
          sponsorship_id: sponsorship.id,
          stripe_subscription_id: sponsorship.stripe_subscription_id,
          error_type: message.includes('No such subscription') ? 'stripe_not_found' : 'unknown',
          error_message: message,
          suggested_fix: message.includes('No such subscription') 
            ? 'Subscription may be deleted in Stripe or ID format is incorrect'
            : 'Check logs for details',
        });
      }
    }

    const endTime = new Date().toISOString();
    console.log("\n=== Recovery Complete ===");
    console.log(`Started: ${startTime}`);
    console.log(`Completed: ${endTime}`);
    console.log(`Checked: ${results.checked} sponsorships`);
    console.log(`Fixed: ${results.fixed} sponsorships`);
    console.log(`Skipped: ${results.skipped} sponsorships`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.fixed > 0) {
      console.log(`\n✅ Successfully recovered ${results.fixed} incomplete sponsorships`);
    }
    if (results.skipped > 0) {
      console.log(`⏭️  Skipped ${results.skipped} sponsorships (no missing data or already complete)`);
    }
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors occurred during recovery:`);
      results.errors.forEach((error: any, i: number) => {
        console.log(`  ${i + 1}. Sponsorship ${error.sponsorship_id}: ${error.error_message}`);
      });
    }


    // Log the job execution
    try {
      const { data: jobLog, error: logError } = await supabaseAdmin
        .from('reconciliation_job_logs')
        .insert({
          job_name: 'recover-incomplete-sponsorships',
          ran_at: startTime,
          completed_at: new Date().toISOString(),
          stripe_mode: stripeMode,
          triggered_by: user?.id || 'system',
          checked_count: results.checked,
          updated_count: results.fixed,
          skipped_count: results.skipped,
          error_count: results.errors.length,
          errors: results.errors,
          status: results.errors.length > 0 ? 'partial_failure' : 'success',
          metadata: {
            detailed_logs: detailedLogs,
            start_time: startTime,
            end_time: endTime,
          }
        })
        .select()
        .single();

      if (logError) {
        console.error('Failed to create job log:', logError);
      } else if (jobLog && changes.length > 0) {
        // Insert individual changes
        const { error: changesError } = await supabaseAdmin
          .from('reconciliation_changes')
          .insert(
            changes.map(c => ({
              ...c,
              job_log_id: jobLog.id,
            }))
          );

        if (changesError) {
          console.error('Failed to log changes:', changesError);
        } else {
          console.log(`Logged ${changes.length} changes`);
        }
      }
    } catch (logError) {
      console.error('Error logging job:', logError);
      // Don't fail the whole operation if logging fails
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recovery error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
