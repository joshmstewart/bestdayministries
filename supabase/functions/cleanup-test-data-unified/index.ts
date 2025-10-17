import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('🧹 Starting unified test data cleanup...');
    
    const options: CleanupOptions = await req.json();

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
    const namePatterns = options.namePatterns || ['Test', 'E2E'];

    // PERSISTENT TEST ACCOUNTS - NEVER DELETE THESE
    // These are used for testing different user experiences and must remain
    const PERSISTENT_TEST_EMAILS = [
      'testbestie@example.com',
      'testguardian@example.com',
      'testsupporter@example.com'
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

    console.log(`Found ${testUsers.length} test users to clean up`);

    const testUserIds = testUsers.map(u => u.id);

    // COMPREHENSIVE CLEANUP: Delete all test-related records in correct order
    if (testUserIds.length > 0 || namePatterns.length > 0) {
      console.log('🧹 Starting comprehensive cleanup...');
      
      // 1. Delete notifications for test users
      if (testUserIds.length > 0) {
        console.log('🧹 Deleting notifications...');
        const { error: notificationsError } = await supabaseAdmin
          .from('notifications')
          .delete()
          .in('user_id', testUserIds);
        
        if (notificationsError) {
          console.error('Error deleting notifications:', notificationsError);
        } else {
          console.log('✅ Deleted notifications');
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
      if (testUserIds.length > 0) {
        console.log('🧹 Deleting email notification logs...');
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
      
      // Also delete replies by email pattern
      const testEmailPatterns = [
        'test@%',
        '%@test.com',
        'emailtest-%',
        'Test User%',
        'E2E User%'
      ];
      
      for (const pattern of testEmailPatterns) {
        await supabaseAdmin
          .from('contact_form_replies')
          .delete()
          .or(`sender_email.like.${pattern},sender_name.like.${pattern}`);
      }
      
      // 5. Delete contact form submissions
      console.log('🧹 Deleting contact form submissions...');
      for (const pattern of testEmailPatterns) {
        const { error: submissionsError } = await supabaseAdmin
          .from('contact_form_submissions')
          .delete()
          .or(`email.like.${pattern},name.like.${pattern}`);
        
        if (submissionsError) {
          console.error(`Error deleting contact form submissions with pattern ${pattern}:`, submissionsError);
        }
      }
      console.log('✅ Deleted contact form submissions');
      
      // 6. Delete discussion comments by test users OR by name pattern
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
      
      // 7. Delete discussion posts by test users OR by name pattern
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
      if (namePatterns.length > 0) {
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
      }
      
      // 8. Delete moderation queue items
      if (testUserIds.length > 0) {
        console.log('🧹 Deleting moderation queue items...');
        const { error: moderationError } = await supabaseAdmin
          .from('moderation_queue')
          .delete()
          .or(`author_id.in.(${testUserIds.join(',')}),reviewed_by.in.(${testUserIds.join(',')})`);
        
        if (moderationError) {
          console.error('Error deleting moderation queue:', moderationError);
        } else {
          console.log('✅ Deleted moderation queue items');
        }
      }
      
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
      if (namePatterns.length > 0) {
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
      
      // 12. Also delete vendors by name pattern
      if (namePatterns.length > 0) {
        for (const pattern of namePatterns) {
          const { error: vendorPatternError } = await supabaseAdmin
            .from('vendors')
            .delete()
            .ilike('business_name', `%${pattern}%`);
          
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
      
      // 14. Delete sponsor_besties records (CRITICAL - blocks user deletion)
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
          console.log('✅ Deleted sponsor_besties records');
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
      if (namePatterns.length > 0) {
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
      if (namePatterns.length > 0) {
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
      .or('email.like.%test-%@%,name.ilike.%Test%,name.ilike.%E2E%');
    
    if (orphanedSubmissionsError) {
      console.error('Error deleting orphaned submissions:', orphanedSubmissionsError);
    } else {
      console.log('✅ Cleaned orphaned contact submissions');
    }

    // Delete any remaining notifications about test content
    const { error: orphanedNotificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .or('title.ilike.%Test%,message.ilike.%Test%,title.ilike.%E2E%,message.ilike.%E2E%');
    
    if (orphanedNotificationsError) {
      console.error('Error deleting orphaned notifications:', orphanedNotificationsError);
    } else {
      console.log('✅ Cleaned orphaned test notifications');
    }

    console.log('✅ Unified test data cleanup complete!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data cleaned up successfully',
        deletedUsers: testUsers.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error cleaning up test data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});