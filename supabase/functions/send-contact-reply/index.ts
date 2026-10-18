import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { z } from "npm:zod@3";
import { corsHeaders } from '../_shared/corsHeaders.ts';
import { validateReplyAttachments, validateReplyFileBytes, REPLY_ATTACHMENT_LIMIT } from '../_shared/replyAttachments.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL") || '';
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || '';

const replySchema = z.object({
  submissionId: z.string().uuid(),
  replyMessage: z.string().trim().min(1).max(5000),
  adminNotes: z.string().trim().max(1000).optional(),
  ccEmails: z.array(z.string().email()).optional(),
  attachments: z.array(z.object({ name: z.string().max(255), type: z.string().max(150), size: z.number().int().positive().max(REPLY_ATTACHMENT_LIMIT), content: z.string().max(Math.ceil(REPLY_ATTACHMENT_LIMIT / 3) * 4) })).default([]),
});

type ContactReplyRequest = z.infer<typeof replySchema>;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("[send-contact-reply] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roles, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'owner']).limit(1);
    if (roleError || !roles?.length) return new Response(JSON.stringify({ error: 'Only admins and owners can send replies.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Limit encoded request before parsing. Ten MB of files expands to roughly fourteen MB in base64.
    const rawBody = await req.text();
    if (rawBody.length > Math.ceil(REPLY_ATTACHMENT_LIMIT / 3) * 4 + 100000) return new Response(JSON.stringify({ error: 'Attachments must total 10 MB or less per reply.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    let requestData;
    try { requestData = JSON.parse(rawBody); } catch { return new Response(JSON.stringify({ error: 'Invalid reply request.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const validationResult = replySchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error("[send-contact-reply] Validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid reply or attachment data. Files must total 10 MB or less.",
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { submissionId, replyMessage, adminNotes, ccEmails, attachments }: ContactReplyRequest = validationResult.data;
    const decoded: { name: string; type: string; size: number; content: string; bytes: Uint8Array }[] = [];
    try {
      validateReplyAttachments(attachments);
      for (const file of attachments) {
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) throw new Error(`${file.name}: invalid attachment encoding.`);
        const bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
        if (bytes.length !== file.size) throw new Error(`${file.name}: attachment size does not match.`);
        validateReplyFileBytes(file.name, bytes);
        decoded.push({ ...file, bytes });
      }
    } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid attachment' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    console.log("[send-contact-reply] Processing reply for submission:", submissionId);

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from("contact_form_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      console.error("[send-contact-reply] Submission not found:", submissionError);
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin profile for signature
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const adminName = adminProfile?.display_name || "The Team";

    // Get app logo
    const { data: appSettings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = appSettings?.setting_value || "";

    // Get reply-from settings
    const { data: contactSettings } = await supabase
      .from("contact_form_settings")
      .select("reply_from_email, reply_from_name, recipient_email")
      .single();

    // Use Resend's testing domain if no verified domain is configured
    const fromEmail = contactSettings?.reply_from_email && !contactSettings.reply_from_email.includes('yourdomain.com') 
      ? contactSettings.reply_from_email 
      : "onboarding@resend.dev";
    const fromName = contactSettings?.reply_from_name || "Joy House";
    const replyToEmail = contactSettings?.recipient_email || "stewart.m.joshua@gmail.com";

    // Sanitize HTML in reply message
    const sanitizedReply = replyMessage
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    // Build email HTML
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reply to Your Message</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  ${logoUrl ? `
                  <tr>
                    <td align="center" style="padding: 30px 20px 20px;">
                      <img src="${logoUrl}" alt="Logo" style="max-width: 150px; height: auto;">
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 20px 40px;">
                      <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                        Thank you for contacting us, ${submission.name}!
                      </h1>
                      
                      <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e40af; white-space: pre-wrap;">
${sanitizedReply}
                        </p>
                      </div>

                      <div style="margin: 30px 0 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                          Best regards,<br>
                          <strong style="color: #1a1a1a;">${adminName}</strong>
                        </p>
                      </div>

                      <div style="margin: 30px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
                        <p style="margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #1a1a1a; text-transform: uppercase;">
                          Your Original Message:
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #666; white-space: pre-wrap;">
${submission.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 14px; color: #888888; text-align: center;">
                        This is a reply to your contact form submission. Feel free to reply directly to this email if you have any questions.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email via Resend with reply tracking
    const emailHtml = html;
    const replyFromEmail = replyToEmail;
    const replyFromName = fromName;
    
    // Build recipient list - primary recipient plus any CC emails
    const toRecipients = [submission.email];
    const ccRecipients = ccEmails && ccEmails.length > 0 ? ccEmails : [];
    // A sandbox thread can never accidentally CC a real person.
    if (submission.email.toLowerCase() === 'delivered@resend.dev' && ccRecipients.some(email => email.toLowerCase() !== 'delivered@resend.dev')) return new Response(JSON.stringify({ error: 'Sandbox replies may only be sent to delivered@resend.dev.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const storedAttachments: { name: string; type: string; size: number; url: string }[] = [];
    for (const file of decoded) {
      const path = `${submissionId}/${crypto.randomUUID()}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from('contact-reply-attachments').upload(path, file.bytes, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Could not save ${file.name} privately. Reply was not sent.`);
      storedAttachments.push({ name: file.name, type: file.type, size: file.size, url: `private://contact-reply-attachments/${path}` });
    }
    
    console.log("[send-contact-reply] Sending to:", { to: toRecipients, cc: ccRecipients });
    
    const emailResponse = await resend.emails.send({
      from: `${replyFromName} <${fromEmail}>`,
      to: toRecipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      reply_to: replyFromEmail,
      subject: `Re: ${submission.subject || 'Your message'}`,
      html: emailHtml,
      attachments: decoded.map(file => ({ filename: file.name, content: file.content, content_type: file.type })),
    });

    const { data: emailData, error: emailError } = emailResponse;

    if (emailError) {
      console.error("[send-contact-reply] Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-contact-reply] Email sent successfully:", emailData);

    // Log to universal email audit trail
    try {
      await supabase.from('email_audit_log').insert({
        resend_email_id: emailData?.id,
        email_type: 'contact_reply',
        recipient_email: submission.email,
        recipient_name: submission.name,
        from_email: fromEmail,
        from_name: fromName,
        subject: `Re: ${submission.subject || 'Your message'}`,
        html_content: emailHtml,
        status: 'sent',
        related_id: submissionId,
        related_type: 'contact_submission',
        sent_at: new Date().toISOString(),
        metadata: { 
          admin_name: adminName, 
          admin_id: user.id,
          cc_emails: ccRecipients.length > 0 ? ccRecipients : undefined,
          attachments: storedAttachments
        }
      });
    } catch (logError) {
      console.error('[email-audit] Failed to log email send:', logError);
      // Don't fail the request if logging fails
    }

    // Save reply to the threaded conversation table
    const { data: savedReply, error: replyError } = await supabase
      .from("contact_form_replies")
      .insert({
        submission_id: submissionId,
        sender_type: "admin",
        sender_id: user.id,
        sender_name: adminName,
        sender_email: fromEmail,
        message: replyMessage,
        cc_emails: ccRecipients.length > 0 ? ccRecipients : null,
        attachments: storedAttachments.length ? storedAttachments : null,
      }).select('id').single();

    if (replyError) {
      console.error("[send-contact-reply] Error saving reply:", replyError);
      return new Response(JSON.stringify({ error: 'Email was sent, but conversation history could not be saved. Do not resend; contact an owner.', emailId: emailData?.id }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update the submission with reply timestamp and admin notes
    const updateData: any = {
      replied_at: new Date().toISOString(),
      replied_by: user.id,
      reply_message: replyMessage,
      status: "read", // Mark as read when admin replies
    };
    
    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    const { error: updateError } = await supabase
      .from("contact_form_submissions")
      .update(updateData)
      .eq("id", submissionId);

    if (updateError) {
      console.error("[send-contact-reply] Error updating submission:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id, replyId: savedReply?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-contact-reply] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
