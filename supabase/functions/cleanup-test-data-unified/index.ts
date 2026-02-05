import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CleanupOptions {
  // Email test cleanup options
  testRunId?: string;
  emailPrefix?: string;
  
  // E2E test cleanup options
  namePatterns?: string[];
  
  // Legacy options for backwards compatibility
  removeTestProfiles?: boolean;
  removeTestSponsorships?: boolean;
  removeTestBesties?: boolean;
  removeTestPosts?: boolean;
  removeTestVendors?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 ============================================');
    console.log('🧹 UNIFIED TEST DATA CLEANUP - START');
    console.log('🧹 ============================================');
    console.log(`🧹 Timestamp: ${new Date().toISOString()}`);
    
    const options: CleanupOptions = await req.json();
    console.log('🧹 Cleanup options:', JSON.stringify(options, null, 2));

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get all test users by email prefix OR name patterns
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const prefix = options.emailPrefix || (options.testRunId ? `emailtest-${options.testRunId}` : null);
    const namePatterns = options.namePatterns || ['Test', 'E2E', 'New Member'];

    // PERSISTENT TEST ACCOUNTS - NEVER DELETE THESE
    // These are used for testing different user experiences and must remain
    const PERSISTENT_TEST_EMAILS = [
      'testbestie@example.com',
      'testguardian@example.com',
      'testsupporter@example.com',
      // Shard accounts that persist for parallel testing
      'test@example.com',
      'test1@example.com',
      'test2@example.com',
      'test3@example.com',
      'test4@example.com',
      'test5@example.com',
      'test6@example.com'
    ];

    // Filter test users by email prefix OR generic test patterns
    // EXCLUDING persistent test accounts
    const testUsers = authUsers.users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      
      // NEVER delete persistent test accounts
      if (PERSISTENT_TEST_EMAILS.includes(email)) {
        console.log(`🔒 Protecting persistent test account: ${email}`);
        return false;
      }
      
      // Email-based cleanup - check for specific prefix first
      if (prefix && email.startsWith(prefix)) return true;
      
      // Enhanced generic email patterns - catches orphaned test users
      if (
        email.includes('emailtest-') ||  // Catches emailtest-default-* and emailtest-{runId}-*
        email.includes('accepttest') ||  // Catches accepttest{timestamp}@example.com
        email.includes('contenttest') ||  // Catches content test users
        email.includes('visualtest') ||  // Catches visual test users
        email === 'testvendor@example.com' ||
        (email.includes('test') && email.includes('@test.com')) ||
        email.startsWith('test-') ||  // Matches test-{timestamp}@example.com
        (email.includes('@example.com') && 
         (email.includes('test-') || email.includes('-test')))  // More flexible matching
      ) {
        return true;
      }
      
      return false;
    });

    console.log(`Found ${testUsers.length} test users by email patterns`);
    
    // Also find users by display name pattern (like "New Member")
    const { data: profilesByName, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name')
      .or(namePatterns.map(p => `display_name.ilike.%${p}%`).join(','));
    
    if (profilesError) {
      console.error('Error finding users by display name:', profilesError);
    } else if (profilesByName && profilesByName.length > 0) {
      // Get user IDs from profiles and find corresponding auth users
      const userIdsByName = profilesByName.map(p => p.user_id).filter(Boolean);
      const usersByName = authUsers.users.filter(u => 
        userIdsByName.includes(u.id) && 
        !PERSISTENT_TEST_EMAILS.includes(u.email?.toLowerCase() || '')
      );
      
      console.log(`Found ${usersByName.length} additional test users by display name`);
      
      // Combine both sets of test users (avoid duplicates)
      const existingIds = new Set(testUsers.map(u => u.id));
      const newUsers = usersByName.filter(u => !existingIds.has(u.id));
      testUsers.push(...newUsers);
    }

    console.log(`Total test users to clean up: ${testUsers.length}`);

    const testUserIds = testUsers.map(u => u.id);

    // Get persistent test account IDs (accounts we keep but clean their data)
    const persistentAccounts = authUsers.users.filter(user => 
      PERSISTENT_TEST_EMAILS.includes(user.email?.toLowerCase() || '')
    );
    const persistentAccountIds = persistentAccounts.map(u => u.id);
    
    console.log(`Found ${persistentAccountIds.length} persistent test accounts to clean data from`);
    console.log('Persistent accounts:', persistentAccounts.map(u => u.email).join(', '));

    // COMPREHENSIVE CLEANUP: Delete all test-related records in correct order
    console.log('🧹 Starting comprehensive cleanup...');
    
    // === STRATEGY 1: Clean data FROM persistent accounts (keep accounts, delete their data) ===
    if (persistentAccountIds.length > 0) {
      console.log('🧹 Cleaning data from persistent test accounts...');
      
      // Delete notifications owned by persistent accounts
      const { error: persistentNotifError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .in('user_id', persistentAccountIds);
      
      if (persistentNotifError) {
        console.error('Error deleting notifications from persistent accounts:', persistentNotifError);
      } else {
        console.log('✅ Deleted notifications from persistent accounts');
      }
      
      // Delete notification preferences
      const { error: persistentPrefsError } = await supabaseAdmin
        .from('notification_preferences')
        .delete()
        .in('user_id', persistentAccountIds);
      
      if (persistentPrefsError) {
        console.error('Error deleting notification preferences from persistent accounts:', persistentPrefsError);
      } else {
        console.log('✅ Deleted notification preferences from persistent accounts');
      }
      
      // Delete email notification logs
      const { error: persistentEmailLogsError } = await supabaseAdmin
        .from('email_notifications_log')
        .delete()
        .in('user_id', persistentAccountIds);
      
      if (persistentEmailLogsError) {
        console.error('Error deleting email logs from persistent accounts:', persistentEmailLogsError);
      } else {
        console.log('✅ Deleted email logs from persistent accounts');
      }
      
      // Delete contact form replies sent by persistent accounts
      const { error: persistentRepliesError } = await supabaseAdmin
        .from('contact_form_replies')
        .delete()
        .in('sender_id', persistentAccountIds);
      
      if (persistentRepliesError) {
        console.error('Error deleting contact form replies from persistent accounts:', persistentRepliesError);
      } else {
        console.log('✅ Deleted contact form replies from persistent accounts');
      }
      
      // Delete contact form submissions by persistent accounts (NO user_id column - use email pattern)
      console.log('🧹 Cleaning contact form submissions from persistent accounts by email...');
      const { data: persistentProfiles } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .in('id', persistentAccountIds);
      
      if (persistentProfiles && persistentProfiles.length > 0) {
        const persistentEmails = persistentProfiles.map(p => p.email).filter(Boolean);
        console.log(`Found ${persistentEmails.length} persistent account emails:`, persistentEmails);
        
        if (persistentEmails.length > 0) {
          const { error: persistentSubmissionsError, count } = await supabaseAdmin
            .from('contact_form_submissions')
            .delete({ count: 'exact' })
            .in('email', persistentEmails);
          
          if (persistentSubmissionsError) {
            console.error('❌ Error deleting contact form submissions from persistent accounts:', persistentSubmissionsError);
          } else {
            console.log(`✅ Deleted ${count || 0} contact form submissions from persistent accounts`);
          }
        }
      }
      
      // Delete discussion comments by persistent accounts
      const { error: persistentCommentsError } = await supabaseAdmin
        .from('discussion_comments')
        .delete()
        .in('author_id', persistentAccountIds);
      
      if (persistentCommentsError) {
        console.error('Error deleting discussion comments from persistent accounts:', persistentCommentsError);
      } else {
        console.log('✅ Deleted discussion comments from persistent accounts');
      }
      
      // Delete discussion posts by persistent accounts
      const { error: persistentPostsError } = await supabaseAdmin
        .from('discussion_posts')
        .delete()
        .in('author_id', persistentAccountIds);
      
      if (persistentPostsError) {
        console.error('Error deleting discussion posts from persistent accounts:', persistentPostsError);
      } else {
        console.log('✅ Deleted discussion posts from persistent accounts');
      }
      
      // Delete featured bestie hearts
      const { error: persistentHeartsError } = await supabaseAdmin
        .from('featured_bestie_hearts')
        .delete()
        .in('user_id', persistentAccountIds);
      
      if (persistentHeartsError) {
        console.error('Error deleting featured bestie hearts from persistent accounts:', persistentHeartsError);
      } else {
        console.log('✅ Deleted featured bestie hearts from persistent accounts');
      }
      
      // Delete featured besties
      const { error: persistentFeaturedError } = await supabaseAdmin
        .from('featured_besties')
        .delete()
        .in('bestie_id', persistentAccountIds);
      
      if (persistentFeaturedError) {
        console.error('Error deleting featured besties from persistent accounts:', persistentFeaturedError);
      } else {
        console.log('✅ Deleted featured besties from persistent accounts');
      }
      
      // Delete sponsorships
      const { error: persistentSponsorshipsError } = await supabaseAdmin
        .from('sponsorships')
        .delete()
        .or(`sponsor_id.in.(${persistentAccountIds.join(',')}),bestie_id.in.(${persistentAccountIds.join(',')})`);
      
      if (persistentSponsorshipsError) {
        console.error('Error deleting sponsorships from persistent accounts:', persistentSponsorshipsError);
      } else {
        console.log('✅ Deleted sponsorships from persistent accounts');
      }
      
      // Delete sponsor_besties
      const { error: persistentSponsorBestiesError } = await supabaseAdmin
        .from('sponsor_besties')
        .delete()
        .in('bestie_id', persistentAccountIds);
      
      if (persistentSponsorBestiesError) {
        console.error('Error deleting sponsor_besties from persistent accounts:', persistentSponsorBestiesError);
      } else {
        console.log('✅ Deleted sponsor_besties from persistent accounts');
      }
      
      // Delete guardian-bestie links
      const { error: persistentLinksError } = await supabaseAdmin
        .from('caregiver_bestie_links')
        .delete()
        .or(`caregiver_id.in.(${persistentAccountIds.join(',')}),bestie_id.in.(${persistentAccountIds.join(',')})`);
      
      if (persistentLinksError) {
        console.error('Error deleting guardian-bestie links from persistent accounts:', persistentLinksError);
      } else {
        console.log('✅ Deleted guardian-bestie links from persistent accounts');
      }
      
      // Delete events
      const { data: persistentEvents } = await supabaseAdmin
        .from('events')
        .select('id')
        .in('created_by', persistentAccountIds);
      
      const persistentEventIds = persistentEvents?.map(e => e.id) || [];
      
      if (persistentEventIds.length > 0) {
        await supabaseAdmin.from('event_attendees').delete().in('event_id', persistentEventIds);
        await supabaseAdmin.from('event_dates').delete().in('event_id', persistentEventIds);
      }
      
      const { error: persistentEventsError } = await supabaseAdmin
        .from('events')
        .delete()
        .in('created_by', persistentAccountIds);
      
      if (persistentEventsError) {
        console.error('Error deleting events from persistent accounts:', persistentEventsError);
      } else {
        console.log('✅ Deleted events from persistent accounts');
      }
      
      // Delete albums
      const { data: persistentAlbums } = await supabaseAdmin
        .from('albums')
        .select('id')
        .in('created_by', persistentAccountIds);
      
      const persistentAlbumIds = persistentAlbums?.map(a => a.id) || [];
      
      if (persistentAlbumIds.length > 0) {
        await supabaseAdmin.from('album_images').delete().in('album_id', persistentAlbumIds);
      }
      
      const { error: persistentAlbumsError } = await supabaseAdmin
        .from('albums')
        .delete()
        .in('created_by', persistentAccountIds);
      
      if (persistentAlbumsError) {
        console.error('Error deleting albums from persistent accounts:', persistentAlbumsError);
      } else {
        console.log('✅ Deleted albums from persistent accounts');
      }
      
      console.log('✅ Completed cleaning data from persistent test accounts');
    }
    
    // === PATTERN-BASED NOTIFICATION CLEANUP (Always runs) ===
    console.log('🧹 Deleting notifications by message patterns...');
    
    const notificationPatterns = [
      ...namePatterns, 
      'Badge Test',
      'Thread Test User',
      'Admin Test User',
      'Reply Test User',
      '@send.bestdayministries.org'  // Catch Resend email notifications
    ];
    
    let notifDeletedTotal = 0;
    
    for (const pattern of notificationPatterns) {
      const { error: patternNotifError, count } = await supabaseAdmin
        .from('notifications')
        .delete({ count: 'exact' })
        .ilike('message', `%${pattern}%`);
      
      if (patternNotifError) {
        console.error(`❌ Error deleting notifications with pattern ${pattern}:`, patternNotifError);
      } else if (count && count > 0) {
        console.log(`✅ Deleted ${count} notifications with pattern: ${pattern}`);
        notifDeletedTotal += count;
      }
    }
    console.log(`✅ Total notifications deleted by patterns: ${notifDeletedTotal}`);
    
    // Also delete by notification type for test contact forms
    const { error: typeNotifError, count: typeCount } = await supabaseAdmin
      .from('notifications')
      .delete({ count: 'exact' })
      .or('type.eq.contact_form_submission,type.eq.contact_form_reply');
    
    if (typeNotifError) {
      console.error('❌ Error deleting contact form notifications:', typeNotifError);
    } else if (typeCount && typeCount > 0) {
      console.log(`✅ Deleted ${typeCount} contact form notifications`);
    }
    
    // === STRATEGY 2: Clean data FROM users being deleted ===
    
    // 1. Delete notifications for test users being deleted
    if (testUserIds.length > 0) {
        console.log('🧹 Deleting notifications...');
        const { error: notificationsError } = await supabaseAdmin
          .from('notifications')
          .delete()
          .in('user_id', testUserIds);
        
        if (notificationsError) {
          console.error('Error deleting notifications:', notificationsError);
        } else {
          console.log('✅ Deleted notifications owned by test users');
        }
        
        // CRITICAL FIX: Delete notifications ABOUT test data sent TO real admin users
        console.log('🧹 Deleting notifications about test data...');
        
        // Get all contact form submissions from test users to find related notifications
        const { data: testSubmissions } = await supabaseAdmin
          .from('contact_form_submissions')
          .select('id')
          .or(
            testUserIds.length > 0 
              ? `user_id.in.(${testUserIds.join(',')}),${namePatterns.map(p => `name.ilike.%${p}%`).join(',')}`
              : namePatterns.map(p => `name.ilike.%${p}%`).join(',')
          );
        
        if (testSubmissions && testSubmissions.length > 0) {
          const submissionIds = testSubmissions.map(s => s.id);
          
          // Delete notifications about these submissions (sent to ANY user, including admins)
          const { error: submissionNotifError } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('type', 'contact_form_submission')
            .in('metadata->submission_id', submissionIds);
          
          if (submissionNotifError) {
            console.error('Error deleting notifications about test submissions:', submissionNotifError);
          } else {
            console.log('✅ Deleted notifications about test contact form submissions');
          }
        }
        
        // 2. Delete notification preferences
        console.log('🧹 Deleting notification preferences...');
        const { error: preferencesError } = await supabaseAdmin
          .from('notification_preferences')
          .delete()
          .in('user_id', testUserIds);
        
        if (preferencesError) {
          console.error('Error deleting notification preferences:', preferencesError);
        } else {
          console.log('✅ Deleted notification preferences');
        }
      }
      
      // 3. Delete email notification logs for test users
      console.log('🧹 Deleting email notification logs...');
      if (testUserIds.length > 0) {
        const { error: emailLogsError } = await supabaseAdmin
          .from('email_notifications_log')
          .delete()
          .in('user_id', testUserIds);
        
        if (emailLogsError) {
          console.error('Error deleting email notification logs:', emailLogsError);
        } else {
          console.log('✅ Deleted email notification logs');
        }
      }
      
      // 4. Delete contact form replies (must be before submissions due to FK)
      console.log('🧹 Deleting contact form replies...');
      if (testUserIds.length > 0) {
        const { error: repliesError } = await supabaseAdmin
          .from('contact_form_replies')
          .delete()
          .in('sender_id', testUserIds);
        
        if (repliesError) {
          console.error('Error deleting contact form replies:', repliesError);
        } else {
          console.log('✅ Deleted contact form replies by user');
        }
      }
      
      // ENHANCED: Delete replies by email/name patterns (catches more test data)
      const testEmailPatterns = [
        'test@%',
        '%@test.com',
        '%@send.bestdayministries.org',  // Resend email IDs
        'emailtest-%',
        'accepttest%',
        'contenttest%',
        'visualtest%',
        'Test%User%',
        'E2E%User%',
        '%Anonymous%Test%',
        '%Authenticated%Test%',
        '%Badge%Test%',
        '%Thread%Test%',
        '%Admin%Test%',
        '%Test User',  // Catches "Thread Test User", "Admin Test User", etc
        'Badge Test%',
        'Reply Test%'
      ];
      
      for (const pattern of testEmailPatterns) {
        const { error: replyPatternError } = await supabaseAdmin
          .from('contact_form_replies')
          .delete()
          .or(`sender_email.like.${pattern},sender_name.like.${pattern}`);
        
        if (replyPatternError) {
          console.error(`Error deleting replies with pattern ${pattern}:`, replyPatternError);
        }
      }
      
      // 5. Delete contact form submissions
      console.log('🧹 Deleting contact form submissions...');
      
      // NOTE: contact_form_submissions table has NO user_id column
      // Delete by email/name patterns only
      
      // Delete by email/name patterns with detailed logging
      console.log(`🧹 Deleting contact form submissions by ${testEmailPatterns.length} patterns...`);
      let totalDeleted = 0;
      
      for (const pattern of testEmailPatterns) {
        const { error: submissionsError, count } = await supabaseAdmin
          .from('contact_form_submissions')
          .delete({ count: 'exact' })
          .or(`email.like.${pattern},name.like.${pattern}`);
        
        if (submissionsError) {
          console.error(`❌ Error deleting contact form submissions with pattern ${pattern}:`, submissionsError);
        } else if (count && count > 0) {
          console.log(`✅ Deleted ${count} submissions with pattern: ${pattern}`);
          totalDeleted += count;
        }
      }
      console.log(`✅ Total contact form submissions deleted by patterns: ${totalDeleted}`);
      
      // CRITICAL FIX: Also delete contact form submissions by EMAIL pattern (for email tests)
      console.log('🧹 Deleting contact form submissions by email-specific patterns...');
      let emailDeletedTotal = 0;
      
      const emailPatterns = [
        'test-%@example.com', 
        'test-reply-%@example.com', 
        'test-admin-%@example.com', 
        'test-thread-%@example.com',
        '%@send.bestdayministries.org',  // Resend test email IDs
        'accepttest%@example.com',
        'contenttest%@example.com',
        'visualtest%@example.com'
      ];
      
      for (const pattern of emailPatterns) {
        const { error: emailSubmissionsError, count } = await supabaseAdmin
          .from('contact_form_submissions')
          .delete({ count: 'exact' })
          .ilike('email', pattern);
        
        if (emailSubmissionsError) {
          console.error(`❌ Error deleting submissions with email pattern ${pattern}:`, emailSubmissionsError);
        } else if (count && count > 0) {
          console.log(`✅ Deleted ${count} submissions with email pattern: ${pattern}`);
          emailDeletedTotal += count;
        }
      }
      console.log(`✅ Total email pattern submissions deleted: ${emailDeletedTotal}`);
      
      // 6. Delete discussion comments by test users
      console.log('🧹 Deleting discussion comments...');
      if (testUserIds.length > 0) {
        const { error: commentsError } = await supabaseAdmin
          .from('discussion_comments')
          .delete()
          .in('author_id', testUserIds);
        
        if (commentsError) {
          console.error('Error deleting discussion comments:', commentsError);
        } else {
          console.log('✅ Deleted discussion comments by user');
        }
      }
      
      // 7. Delete discussion posts by test users
      console.log('🧹 Deleting discussion posts...');
      if (testUserIds.length > 0) {
        const { error: postsError } = await supabaseAdmin
          .from('discussion_posts')
          .delete()
          .in('author_id', testUserIds);
        
        if (postsError) {
          console.error('Error deleting discussion posts:', postsError);
        } else {
          console.log('✅ Deleted discussion posts by user');
        }
      }
      
      // Also delete posts by title pattern for E2E tests
      for (const pattern of namePatterns) {
        const { error: postPatternError } = await supabaseAdmin
          .from('discussion_posts')
          .delete()
          .ilike('title', `%${pattern}%`);
        
        if (postPatternError) {
          console.error(`Error deleting posts with pattern ${pattern}:`, postPatternError);
        } else {
          console.log(`✅ Deleted posts with pattern: ${pattern}`);
        }
      }
      
      // 8. Skip moderation queue (table doesn't exist in this project)
      // The moderation system uses different tables
      
      // 9. Delete featured bestie hearts
      if (testUserIds.length > 0) {
        console.log('🧹 Deleting featured bestie hearts...');
        const { error: heartsError } = await supabaseAdmin
          .from('featured_bestie_hearts')
          .delete()
          .in('user_id', testUserIds);
        
        if (heartsError) {
          console.error('Error deleting featured bestie hearts:', heartsError);
        } else {
          console.log('✅ Deleted featured bestie hearts');
        }
      }
      
      // 10. Delete featured besties for test users OR by name pattern
      console.log('🧹 Deleting featured besties...');
      if (testUserIds.length > 0) {
        const { error: featuredBestiesError } = await supabaseAdmin
          .from('featured_besties')
          .delete()
          .in('bestie_id', testUserIds);
        
        if (featuredBestiesError) {
          console.error('Error deleting featured besties:', featuredBestiesError);
        } else {
          console.log('✅ Deleted featured besties by user');
        }
      }
      
      // Also delete by name pattern for E2E tests
      for (const pattern of namePatterns) {
        const { error: bestiePatternError } = await supabaseAdmin
          .from('featured_besties')
          .delete()
          .ilike('bestie_name', `%${pattern}%`);
        
        if (bestiePatternError) {
          console.error(`Error deleting featured besties with pattern ${pattern}:`, bestiePatternError);
        } else {
          console.log(`✅ Deleted featured besties with pattern: ${pattern}`);
        }
      }
      
      // 11. Get vendor IDs before deleting vendor records
      if (testUserIds.length > 0) {
        const { data: vendorRecords } = await supabaseAdmin
          .from('vendors')
          .select('id')
          .in('user_id', testUserIds);
        
        const vendorIds = vendorRecords?.map(v => v.id) || [];
        
        if (vendorIds.length > 0) {
          console.log(`Found ${vendorIds.length} vendor records to clean up`);
          
          // 11a. Delete vendor bestie assets
          console.log('🧹 Deleting vendor bestie assets...');
          const { error: assetsError } = await supabaseAdmin
            .from('vendor_bestie_assets')
            .delete()
            .in('vendor_id', vendorIds);
          
          if (assetsError) {
            console.error('Error deleting vendor bestie assets:', assetsError);
          } else {
            console.log('✅ Deleted vendor bestie assets');
          }
          
          // 11b. Delete vendor bestie requests
          console.log('🧹 Deleting vendor bestie requests...');
          const { error: requestsError } = await supabaseAdmin
            .from('vendor_bestie_requests')
            .delete()
            .in('vendor_id', vendorIds);
          
          if (requestsError) {
            console.error('Error deleting vendor bestie requests:', requestsError);
          } else {
            console.log('✅ Deleted vendor bestie requests');
          }
          
          // 11c. PRIORITY 2 FIX: Delete order_items BEFORE products to avoid FK violations
          console.log('🧹 Deleting order items...');
          const { data: orderRecords } = await supabaseAdmin
            .from('orders')
            .select('id')
            .in('user_id', testUserIds);
          
          const orderIds = orderRecords?.map(o => o.id) || [];
          
          if (orderIds.length > 0) {
            const { error: orderItemsError } = await supabaseAdmin
              .from('order_items')
              .delete()
              .in('order_id', orderIds);
            
            if (orderItemsError) {
              console.error('Error deleting order items:', orderItemsError);
            } else {
              console.log('✅ Deleted order items');
            }
          }
          
          // Now delete products (after order_items)
          console.log('🧹 Deleting products...');
          const { error: productsError } = await supabaseAdmin
            .from('products')
            .delete()
            .in('vendor_id', vendorIds);
          
          if (productsError) {
            console.error('Error deleting products:', productsError);
          } else {
            console.log('✅ Deleted products');
          }
          
          // 11d. Delete vendors
          console.log('🧹 Deleting vendors...');
          const { error: vendorsError } = await supabaseAdmin
            .from('vendors')
            .delete()
            .in('id', vendorIds);
          
          if (vendorsError) {
            console.error('Error deleting vendors:', vendorsError);
          } else {
            console.log('✅ Deleted vendors');
          }
        }
      }
      
      // 12. Also delete vendors by name pattern (with proper FK cleanup)
      for (const pattern of namePatterns) {
        // First, find all vendors matching this pattern
        const { data: patternVendors, error: findVendorsError } = await supabaseAdmin
          .from('vendors')
          .select('id')
          .ilike('business_name', `%${pattern}%`);
        
        if (findVendorsError) {
          console.error(`Error finding vendors with pattern ${pattern}:`, findVendorsError);
          continue;
        }
        
        if (patternVendors && patternVendors.length > 0) {
          const patternVendorIds = patternVendors.map(v => v.id);
          
          // Find all products for these vendors
          const { data: patternProducts } = await supabaseAdmin
            .from('products')
            .select('id')
            .in('vendor_id', patternVendorIds);
          
          if (patternProducts && patternProducts.length > 0) {
            const patternProductIds = patternProducts.map(p => p.id);
            
            // Delete order_items first
            const { error: orderItemsError } = await supabaseAdmin
              .from('order_items')
              .delete()
              .in('product_id', patternProductIds);
            
            if (orderItemsError) {
              console.error(`Error deleting order_items for pattern ${pattern}:`, orderItemsError);
            } else {
              console.log(`✅ Deleted order_items for vendor pattern: ${pattern}`);
            }
            
            // Now delete products
            const { error: productsError } = await supabaseAdmin
              .from('products')
              .delete()
              .in('id', patternProductIds);
            
            if (productsError) {
              console.error(`Error deleting products for pattern ${pattern}:`, productsError);
            } else {
              console.log(`✅ Deleted products for vendor pattern: ${pattern}`);
            }
          }
          
          // Finally delete the vendors
          const { error: vendorPatternError } = await supabaseAdmin
            .from('vendors')
            .delete()
            .in('id', patternVendorIds);
          
          if (vendorPatternError) {
            console.error(`Error deleting vendors with pattern ${pattern}:`, vendorPatternError);
          } else {
            console.log(`✅ Deleted vendors with pattern: ${pattern}`);
          }
        }
      }
      
      // 13. Delete sponsorships
      console.log('🧹 Deleting sponsorships...');
      if (testUserIds.length > 0) {
        const { error: sponsorshipsError } = await supabaseAdmin
          .from('sponsorships')
          .delete()
          .or(`sponsor_id.in.(${testUserIds.join(',')}),bestie_id.in.(${testUserIds.join(',')})`);
        
        if (sponsorshipsError) {
          console.error('Error deleting sponsorships:', sponsorshipsError);
        } else {
          console.log('✅ Deleted sponsorships');
        }
      }
      
      // 14. Delete sponsor_besties records (CRITICAL - blocks user deletion and shows in carousel)
      console.log('🧹 Deleting sponsor_besties records...');
      if (testUserIds.length > 0) {
        // Delete where test users are besties OR any other user reference
        const { error: sponsorBestiesError } = await supabaseAdmin
          .from('sponsor_besties')
          .delete()
          .in('bestie_id', testUserIds);
        
        if (sponsorBestiesError) {
          console.error('Error deleting sponsor_besties:', sponsorBestiesError);
        } else {
          console.log('✅ Deleted sponsor_besties records by user');
        }
        
        // Also clean up any sponsor_bestie_requests
        const { error: requestsError } = await supabaseAdmin
          .from('sponsor_bestie_requests')
          .delete()
          .in('bestie_id', testUserIds);
        
        if (requestsError) {
          console.error('Error deleting sponsor_bestie_requests:', requestsError);
        } else {
          console.log('✅ Deleted sponsor_bestie_requests');
        }
      }
      
      // CRITICAL: Also delete sponsor_besties by name pattern (test data may not have user_id)
      for (const pattern of namePatterns) {
        const { error: sponsorBestiePatternError } = await supabaseAdmin
          .from('sponsor_besties')
          .delete()
          .ilike('bestie_name', `%${pattern}%`);
        
        if (sponsorBestiePatternError) {
          console.error(`Error deleting sponsor_besties with pattern ${pattern}:`, sponsorBestiePatternError);
        } else {
          console.log(`✅ Deleted sponsor_besties with pattern: ${pattern}`);
        }
      }
      
      // 15. Delete guardian-bestie links
      console.log('🧹 Deleting guardian-bestie links...');
      if (testUserIds.length > 0) {
        const { error: linksError } = await supabaseAdmin
          .from('caregiver_bestie_links')
          .delete()
          .or(`caregiver_id.in.(${testUserIds.join(',')}),bestie_id.in.(${testUserIds.join(',')})`);
        
        if (linksError) {
          console.error('Error deleting guardian-bestie links:', linksError);
        } else {
          console.log('✅ Deleted guardian-bestie links');
        }
      }
      
      // 16. Delete events by test users OR name patterns
      console.log('🧹 Deleting events...');
      if (testUserIds.length > 0) {
        // First get event IDs to clean up related data
        const { data: eventRecords } = await supabaseAdmin
          .from('events')
          .select('id')
          .in('created_by', testUserIds);
        
        const eventIds = eventRecords?.map(e => e.id) || [];
        
        if (eventIds.length > 0) {
          // Delete event attendees
          await supabaseAdmin.from('event_attendees').delete().in('event_id', eventIds);
          // Delete event dates
          await supabaseAdmin.from('event_dates').delete().in('event_id', eventIds);
          console.log('✅ Deleted event-related data');
        }
        
        const { error: eventsError } = await supabaseAdmin
          .from('events')
          .delete()
          .in('created_by', testUserIds);
        
        if (eventsError) {
          console.error('Error deleting events:', eventsError);
        } else {
          console.log('✅ Deleted events by user');
        }
      }
      
      // Delete events by title pattern
      for (const pattern of namePatterns) {
        const { error: eventPatternError } = await supabaseAdmin
          .from('events')
          .delete()
          .ilike('title', `%${pattern}%`);
        
        if (eventPatternError) {
          console.error(`Error deleting events with pattern ${pattern}:`, eventPatternError);
        } else {
          console.log(`✅ Deleted events with pattern: ${pattern}`);
        }
      }
      
      // 17. Delete albums by test users OR name patterns
      console.log('🧹 Deleting albums...');
      if (testUserIds.length > 0) {
        // First get album IDs to clean up related data
        const { data: albumRecords } = await supabaseAdmin
          .from('albums')
          .select('id')
          .in('created_by', testUserIds);
        
        const albumIds = albumRecords?.map(a => a.id) || [];
        
        if (albumIds.length > 0) {
          // Delete album images
          await supabaseAdmin.from('album_images').delete().in('album_id', albumIds);
          console.log('✅ Deleted album images');
        }
        
        const { error: albumsError } = await supabaseAdmin
          .from('albums')
          .delete()
          .in('created_by', testUserIds);
        
        if (albumsError) {
          console.error('Error deleting albums:', albumsError);
        } else {
          console.log('✅ Deleted albums by user');
        }
      }
      
      // Delete albums by title pattern
      for (const pattern of namePatterns) {
        const { error: albumPatternError } = await supabaseAdmin
          .from('albums')
          .delete()
          .ilike('title', `%${pattern}%`);
        
        if (albumPatternError) {
          console.error(`Error deleting albums with pattern ${pattern}:`, albumPatternError);
        } else {
          console.log(`✅ Deleted albums with pattern: ${pattern}`);
        }
      }
      
      // 18. Delete newsletter subscribers (test emails)
      console.log('🧹 Deleting newsletter subscribers...');
      const newsletterPatterns = [
        'newsletter-test-%',
        'test-%@example.com',
        'sub1-%@example.com',
        'sub2-%@example.com',
        'active-%@example.com',
        'unsub-%@example.com',
        'unsubscribe-%@example.com'
      ];
      
      for (const pattern of newsletterPatterns) {
        const { error: subscriberError } = await supabaseAdmin
          .from('newsletter_subscribers')
          .delete()
          .like('email', pattern);
        
        if (subscriberError) {
          console.error(`Error deleting newsletter subscribers with pattern ${pattern}:`, subscriberError);
        }
      }
      console.log('✅ Deleted newsletter subscribers');
      
      // 19. Delete newsletter campaigns with test subjects
      console.log('🧹 Deleting newsletter campaigns...');
      const campaignPatterns = ['Test Campaign %', 'Test Email Campaign %', 'Production Campaign %', 'Filter Test %'];
      
      for (const pattern of campaignPatterns) {
        // First get campaign IDs to clean up analytics
        const { data: campaigns } = await supabaseAdmin
          .from('newsletter_campaigns')
          .select('id')
          .like('subject', pattern);
        
        const campaignIds = campaigns?.map(c => c.id) || [];
        
        if (campaignIds.length > 0) {
          // Delete analytics for these campaigns
          await supabaseAdmin
            .from('newsletter_analytics')
            .delete()
            .in('campaign_id', campaignIds);
          
          console.log(`✅ Deleted analytics for ${campaignIds.length} test campaigns`);
        }
        
        // Delete campaigns
        const { error: campaignError } = await supabaseAdmin
          .from('newsletter_campaigns')
          .delete()
          .like('subject', pattern);
        
        if (campaignError) {
          console.error(`Error deleting campaigns with pattern ${pattern}:`, campaignError);
        }
      }
      console.log('✅ Deleted newsletter campaigns');
      
      console.log('✅ Completed comprehensive pre-user deletion cleanup');
    
    // PRIORITY 2 FIX: Nullify foreign key references BEFORE deleting users
    if (testUserIds.length > 0) {
      console.log('🧹 Nullifying foreign key references...');
      
      // Get vendor IDs again (some may have been deleted in cleanup above)
      const { data: remainingVendors } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .in('user_id', testUserIds);
      
      const remainingVendorIds = remainingVendors?.map(v => v.id) || [];
      
      if (remainingVendorIds.length > 0) {
        // Nullify vendor featured_bestie_id references
        const { error: vendorNullifyError } = await supabaseAdmin
          .from('vendors')
          .update({ featured_bestie_id: null })
          .in('id', remainingVendorIds);

        if (vendorNullifyError) {
          console.error('Error nullifying vendor featured_bestie_id:', vendorNullifyError);
        } else {
          console.log('✅ Nullified vendor featured_bestie_id references');
        }
      }

      // Nullify sponsor_messages approved_by references
      const { error: messageNullifyError } = await supabaseAdmin
        .from('sponsor_messages')
        .update({ approved_by: null })
        .in('approved_by', testUserIds);

      if (messageNullifyError) {
        console.error('Error nullifying sponsor_messages approved_by:', messageNullifyError);
      } else {
        console.log('✅ Nullified sponsor_messages approved_by references');
      }
    }

    // Delete each test user (cascade will handle remaining related data)
    for (const user of testUsers) {
      console.log(`Deleting user: ${user.email}`);
      
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        user.id
      );

      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError);
      } else {
        console.log(`✅ Deleted user: ${user.email}`);
      }
    }

    // Clean up orphaned receipt settings from tests
    await supabaseAdmin
      .from('receipt_settings')
      .delete()
      .eq('organization_name', 'Test Organization');

    // Final sweep - catch any remaining test data by common patterns
    console.log('🧹 Final sweep for orphaned test data...');

    // Delete any remaining discussion posts with "Test" in title
    const { error: orphanedPostsError } = await supabaseAdmin
      .from('discussion_posts')
      .delete()
      .or('title.ilike.%Test%,title.ilike.%E2E%');
    
    if (orphanedPostsError) {
      console.error('Error deleting orphaned posts:', orphanedPostsError);
    } else {
      console.log('✅ Cleaned orphaned test posts');
    }

    // Delete any remaining contact submissions with test patterns
    const { error: orphanedSubmissionsError } = await supabaseAdmin
      .from('contact_form_submissions')
      .delete()
      .or('email.like.%test-%@%,name.ilike.%Test%,name.ilike.%E2E%,name.ilike.%Anonymous%Test%,name.ilike.%Authenticated%Test%');
    
    if (orphanedSubmissionsError) {
      console.error('Error deleting orphaned submissions:', orphanedSubmissionsError);
    } else {
      console.log('✅ Cleaned orphaned contact submissions');
    }
    
    // Delete orphaned contact form replies with test patterns
    const { error: orphanedRepliesError } = await supabaseAdmin
      .from('contact_form_replies')
      .delete()
      .or('sender_email.like.%test-%@%,sender_name.ilike.%Test%,sender_name.ilike.%E2E%,sender_name.ilike.%Anonymous%Test%');
    
    if (orphanedRepliesError) {
      console.error('Error deleting orphaned replies:', orphanedRepliesError);
    } else {
      console.log('✅ Cleaned orphaned contact form replies');
    }

    // Delete any remaining notifications about test content
    console.log('🧹 Deleting orphaned test notifications...');
    
    // Delete notifications with test patterns in title/message
    const { error: orphanedNotificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .or('title.ilike.%Test%,message.ilike.%Test%,title.ilike.%E2E%,message.ilike.%E2E%');
    
    if (orphanedNotificationsError) {
      console.error('Error deleting orphaned notifications:', orphanedNotificationsError);
    } else {
      console.log('✅ Cleaned orphaned test notifications');
    }
    
    // Delete contact form email notifications (from @send.bestdayministries.org test emails)
    const { error: emailNotifError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .or('message.ilike.%@send.bestdayministries.org%,type.eq.contact_form_submission,type.eq.contact_form_reply');
    
    if (emailNotifError) {
      console.error('Error deleting email test notifications:', emailNotifError);
    } else {
      console.log('✅ Cleaned email test notifications');
    }

    console.log('✅ ============================================');
    console.log('✅ UNIFIED TEST DATA CLEANUP - COMPLETE');
    console.log('✅ ============================================');
    console.log(`✅ Deleted users: ${testUsers.length}`);
    console.log(`✅ Persistent accounts cleaned: ${persistentAccountIds.length}`);
    console.log(`✅ Timestamp: ${new Date().toISOString()}`);
    console.log('✅ ============================================');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data cleaned up successfully',
        deletedUsers: testUsers.length,
        persistentAccountsCleaned: persistentAccountIds.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ ============================================');
    console.error('❌ ERROR IN TEST DATA CLEANUP');
    console.error('❌ ============================================');
    console.error('❌ Error:', error);
    console.error('❌ Message:', errorMessage);
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('❌ Timestamp:', new Date().toISOString());
    console.error('❌ ============================================');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});