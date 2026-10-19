# Production Facts — 2026-10-18

Read-only snapshot of the LIVE backend, taken 2026-10-19 ~00:10 UTC (2026-10-18 evening Mountain Time). Aggregates only — no emails, names, user IDs, addresses or message text. Nothing was changed except adding this file.

## 1. Scheduled jobs (cron.job)
| jobid | jobname | schedule | active | target (secrets redacted) | last run (UTC) | last status |
|---|---|---|---|---|---|---|
| 1 | update-sticker-collections-daily | 0 7 * * * | true | functions/v1/update-sticker-collections | 2026-10-18 07:00 | succeeded |
| 5 | reconcile-donations-hourly | 0 * * * * | true | functions/v1/reconcile-donations-from-stripe | 2026-10-19 00:00 | succeeded |
| 8 | check-printify-status-job | */15 * * * * | true | functions/v1/check-printify-status | 2026-10-19 00:00 | succeeded |
| 10 | sync-donation-history-hourly | 0 * * * * | true | functions/v1/sync-donation-history | 2026-10-19 00:00 | succeeded |
| 12 | send-year-end-summaries-daily | 0 12 * * * | true | functions/v1/send-batch-year-end-summaries | 2026-10-18 12:00 | **failed** |
| 13 | send-daily-digest-emails | 0 14 * * * | true | functions/v1/send-digest-email | 2026-10-18 14:00 | succeeded |
| 14 | send-weekly-digest-emails | 0 14 * * 1 | true | functions/v1/send-digest-email | 2026-10-12 14:00 | succeeded |
| 15 | reconcile-marketplace-orders-job | */15 * * * * | true | functions/v1/reconcile-marketplace-orders | 2026-10-19 00:00 | succeeded |
| 16 | process-event-email-queue-job | */5 * * * * | true | functions/v1/process-event-email-queue | 2026-10-19 00:05 | succeeded |
| 17 | process-event-update-email-queue-job | */5 * * * * | true | functions/v1/process-event-update-email-queue | 2026-10-19 00:05 | succeeded |
| 18 | generate-wordle-word-daily | 5 7 * * * | true | functions/v1/generate-wordle-word-scheduled | 2026-10-18 07:05 | succeeded |
| 20 | generate-fortune-posts-daily | 0 6,7 * * * | true | functions/v1/generate-fortune-posts | 2026-10-18 07:00 | succeeded |
| 22 | sync-newsletter-analytics-hourly | 0 * * * * | true | functions/v1/sync-newsletter-analytics | 2026-10-19 00:00 | succeeded |
| 23 | reconcile-bike-pledges-hourly | 15 * * * * | true | functions/v1/reconcile-bike-pledges | 2026-10-18 23:15 | succeeded |
| 24 | retry-vendor-transfers-6hourly | 0 */6 * * * | true | functions/v1/retry-vendor-transfers | 2026-10-19 00:00 | succeeded |
| 25 | reconcile-sponsorships-hourly | 30 * * * * | true | functions/v1/reconcile-sponsorships-from-stripe | 2026-10-18 23:30 | succeeded |
| 26 | process-newsletter-queue-every-minute | */5 * * * * | true | functions/v1/process-newsletter-queue | 2026-10-19 00:05 | succeeded |

17 jobs, all active. Run status = most recent row in cron.job_run_details within the last 8 days ("succeeded" means the scheduler's HTTP request was queued, not that the function's own work succeeded). Note: job 26's name says "every-minute" but its schedule is every 5 minutes. Several `supabase/config.toml` `schedule =` entries (e.g. process-platform-payout, retry-vendor-order-notifications, award-time-trial-rewards, run-health-check, check-bike-pledge-cards, poll-aftership-status) have **no** matching live cron.job row.

## 2. Tables (265 public base tables, sorted by exact row count)
Counts are exact `count(*)`. "—" = column does not exist.

| Table | Rows | Newest created_at | Newest updated_at |
|---|---|---|---|
| page_visits | 89666 | — | — |
| marketplace_reconciliation_log | 25616 | 2026-10-19 00:00 | — |
| newsletter_analytics | 22578 | 2026-10-17 18:33 | — |
| test_runs | 17471 | 2026-10-18 23:13 | — |
| notifications | 12310 | 2026-10-17 22:54 | — |
| newsletter_emails_log | 12013 | 2026-10-16 12:56 | — |
| newsletter_email_queue | 10987 | 2026-10-03 03:12 | — |
| event_email_queue | 5260 | 2026-10-17 22:54 | — |
| coin_transactions | 4781 | 2026-10-18 23:55 | — |
| daily_scratch_cards | 2392 | 2026-10-18 23:55 | — |
| error_logs | 1665 | 2026-10-16 03:17 | — |
| newsletter_subscribers | 1615 | 2026-10-16 01:39 | — |
| user_stickers | 794 | — | — |
| email_audit_log | 763 | 2026-10-18 23:27 | — |
| automated_campaign_sends | 690 | 2026-10-16 12:56 | — |
| coloring_pages | 689 | 2026-01-25 00:46 | 2026-01-25 00:46 |
| joke_library | 680 | 2026-01-14 17:04 | — |
| wordle_valid_words | 675 | 2026-03-04 16:48 | — |
| tab_click_tracking | 640 | 2026-10-18 23:55 | — |
| album_images | 638 | 2026-07-09 18:58 | — |
| wordle_attempts | 517 | 2026-10-18 19:57 | 2026-10-18 19:58 |
| daily_fortunes | 466 | 2026-02-01 18:42 | — |
| daily_fortune_views | 461 | 2026-10-18 19:56 | — |
| mood_entries | 429 | 2026-10-18 19:58 | — |
| sponsorship_receipts | 414 | 2026-10-16 12:55 | — |
| user_joke_history | 409 | 2026-04-19 16:46 | — |
| donations | 388 | 2026-10-12 17:33 | 2026-10-12 17:35 |
| donation_stripe_transactions | 385 | 2026-10-15 18:01 | — |
| daily_engagement_completions | 345 | 2026-10-18 19:58 | — |
| profiles | 328 | 2026-10-18 21:51 | 2026-10-18 23:55 |
| product_views | 327 | — | — |
| user_roles | 327 | 2026-10-18 21:51 | — |
| memory_match_images | 289 | 2026-03-02 21:27 | — |
| terms_acceptance | 287 | — | — |
| contact_form_replies | 283 | 2026-10-18 23:27 | — |
| wordle_daily_words | 282 | 2026-10-18 07:05 | — |
| daily_fortune_posts | 260 | 2026-10-18 07:00 | — |
| notification_preferences | 225 | 2026-03-09 17:54 | 2026-10-18 13:14 |
| game_sessions | 195 | — | — |
| workout_locations | 193 | 2026-01-29 21:53 | 2026-01-29 21:53 |
| user_streaks | 192 | 2026-10-16 12:56 | 2026-10-18 23:55 |
| stickers | 187 | 2026-10-18 06:49 | — |
| contact_form_submissions | 175 | 2026-10-18 23:24 | — |
| donation_sync_status | 164 | — | — |
| sticker_admin_log | 156 | 2026-10-18 07:16 | — |
| stripe_webhook_logs | 152 | 2025-11-22 01:45 | — |
| fitness_avatar_celebration_images | 147 | 2026-02-07 07:12 | 2026-02-07 07:12 |
| avatar_emotion_images | 144 | 2026-02-07 06:24 | 2026-02-07 06:33 |
| newsletter_links | 128 | 2026-10-03 03:15 | — |
| recipe_ingredients | 121 | 2026-01-16 04:52 | 2026-01-16 04:53 |
| mood_responses | 120 | 2026-01-31 03:36 | — |
| receipt_generation_logs | 112 | 2026-09-20 19:10 | — |
| ai_gateway_usage_log | 110 | 2026-10-06 02:16 | — |
| discussion_comments | 108 | 2026-10-06 02:16 | — |
| beat_pad_sounds | 102 | 2026-01-13 06:29 | 2026-01-15 02:33 |
| email_notifications_log | 102 | — | — |
| workout_generated_images | 98 | 2026-10-18 07:11 | — |
| event_update_email_queue | 94 | 2026-01-23 23:44 | — |
| drink_ingredients | 89 | 2026-01-16 08:01 | 2026-01-16 08:01 |
| user_workout_logs | 86 | — | — |
| bike_ride_pledges | 81 | 2026-07-10 20:30 | — |
| fitness_avatars | 75 | 2026-02-07 07:23 | 2026-02-07 07:23 |
| discussion_posts | 69 | 2026-10-06 02:16 | 2026-10-06 02:16 |
| sponsorships | 67 | — | — |
| wordle_themes | 66 | 2026-01-17 18:33 | — |
| picture_password_notifications | 62 | 2026-10-07 21:05 | 2026-10-07 21:05 |
| help_faqs | 60 | 2026-01-13 01:47 | 2026-01-13 01:47 |
| memory_match_pack_ideas | 60 | 2026-02-05 23:44 | — |
| products | 57 | 2026-06-18 16:40 | 2026-10-15 16:05 |
| workout_activities | 55 | 2026-03-24 21:06 | 2026-03-24 21:06 |
| noj_confirmation_email_log | 54 | — | — |
| recipe_tools | 53 | 2026-01-16 05:03 | — |
| chore_completions | 50 | — | — |
| coin_rewards_settings | 50 | 2026-02-02 01:27 | 2026-02-03 16:22 |
| chores | 49 | 2026-02-03 15:05 | 2026-02-03 15:05 |
| password_reset_tokens | 48 | 2026-08-27 06:07 | — |
| coffee_shop_menu_items | 43 | 2026-10-18 22:10 | 2026-10-18 22:19 |
| avatars | 42 | 2025-10-01 07:58 | 2025-10-01 07:58 |
| shipping_calculation_log | 40 | 2026-02-17 18:00 | — |
| navigation_links | 39 | 2026-04-17 20:20 | 2026-10-18 22:50 |
| saved_jokes | 39 | 2026-03-09 22:01 | 2026-03-09 22:11 |
| user_colorings | 39 | 2026-04-11 02:15 | 2026-04-11 02:15 |
| events | 38 | 2026-10-17 22:54 | 2026-10-17 22:54 |
| cash_register_customers | 37 | 2026-01-16 06:48 | 2026-01-16 06:52 |
| app_settings | 36 | — | 2026-06-12 22:37 |
| videos | 36 | 2026-07-09 18:57 | 2026-07-09 18:57 |
| active_subscriptions_cache | 35 | 2026-08-31 18:02 | 2026-10-19 00:02 |
| fitness_avatar_templates | 34 | 2026-01-20 22:12 | 2026-01-20 23:01 |
| custom_drinks | 33 | 2026-07-22 20:08 | 2026-07-22 20:08 |
| prayer_request_likes | 33 | 2026-06-02 15:58 | — |
| custom_drink_likes | 32 | 2026-03-05 21:11 | — |
| health_check_results | 32 | — | — |
| user_streak_milestones | 32 | — | — |
| workout_image_likes | 28 | 2026-03-12 00:42 | — |
| app_configurations | 26 | 2026-02-01 22:57 | 2026-02-02 01:45 |
| reconciliation_changes | 26 | 2025-11-22 04:21 | — |
| workout_location_packs | 26 | 2026-01-29 21:52 | 2026-01-29 21:54 |
| albums | 25 | 2026-07-09 18:57 | 2026-07-09 18:57 |
| coffee_product_tiers | 24 | 2026-02-01 02:45 | 2026-02-01 03:29 |
| drink_vibes | 24 | 2025-12-23 23:08 | 2025-12-23 23:19 |
| joke_categories | 24 | 2026-01-14 18:09 | 2026-01-14 18:09 |
| order_items | 24 | 2026-07-16 18:53 | — |
| picture_password_attempts | 24 | — | — |
| user_fitness_avatars | 22 | — | — |
| orders | 21 | 2026-07-16 18:53 | 2026-07-16 21:00 |
| user_recipe_ingredients | 20 | — | 2026-06-14 04:00 |
| user_recipe_tools | 20 | — | 2026-06-14 04:00 |
| year_end_summary_sent | 20 | 2026-04-12 16:44 | — |
| vendor_team_members | 19 | 2026-10-18 21:51 | 2026-10-18 21:51 |
| bike_ride_scenic_photos | 18 | 2026-03-18 03:37 | — |
| newsletter_campaigns | 18 | 2026-10-03 02:08 | 2026-10-03 05:10 |
| saved_recipes | 18 | 2026-03-09 22:47 | 2026-03-09 22:47 |
| user_favorite_activities | 18 | 2026-03-18 21:06 | — |
| user_memory_match_packs | 18 | — | — |
| app_sound_effects | 17 | 2026-01-26 03:13 | 2026-01-26 03:33 |
| beat_pad_creations | 16 | 2026-07-22 20:17 | 2026-07-22 20:17 |
| beat_pad_likes | 16 | 2026-03-09 22:44 | — |
| content_announcements | 16 | 2026-03-02 21:32 | 2026-03-02 21:33 |
| daily_fortune_likes | 16 | 2026-04-20 13:38 | — |
| emotion_types | 16 | 2026-02-01 00:40 | — |
| mood_messages | 16 | 2026-01-30 17:41 | — |
| picture_passwords | 16 | 2026-06-06 17:44 | 2026-06-06 17:44 |
| product_color_images | 16 | 2025-12-31 05:26 | 2025-12-31 05:26 |
| sponsor_besties | 16 | 2026-04-09 17:35 | 2026-04-09 17:35 |
| vendors | 16 | 2026-10-18 21:51 | 2026-10-18 21:51 |
| event_likes | 15 | 2026-04-15 21:13 | — |
| footer_links | 15 | 2026-03-04 17:23 | — |
| wordle_user_stats | 15 | 2026-06-02 14:32 | 2026-10-18 19:58 |
| caregiver_bestie_links | 14 | 2026-08-24 01:52 | — |
| chore_wheel_spins | 14 | 2026-03-09 22:16 | — |
| homepage_sections | 14 | 2025-10-23 01:17 | 2026-06-04 20:53 |
| prayer_requests | 14 | 2026-06-18 14:29 | 2026-06-18 14:29 |
| album_comments | 13 | 2026-06-17 14:55 | 2026-06-17 14:55 |
| audio_clips | 13 | 2026-01-26 03:31 | 2026-01-26 03:31 |
| guardian_resources | 13 | 2026-01-20 18:13 | 2026-01-20 18:19 |
| memory_match_packs | 13 | 2026-03-02 20:29 | 2026-03-02 21:32 |
| rate_limits | 13 | 2026-10-18 21:51 | — |
| reconciliation_job_logs | 13 | 2025-11-25 01:28 | — |
| saved_shopping_tips | 13 | — | 2026-05-10 22:37 |
| tts_voices | 13 | 2025-10-09 04:05 | 2025-10-09 04:05 |
| help_tours | 12 | 2026-01-13 01:46 | 2026-01-13 01:46 |
| coloring_books | 11 | 2026-01-25 00:05 | 2026-01-25 00:05 |
| community_sections | 11 | 2026-01-23 16:30 | 2026-01-23 16:30 |
| help_guides | 11 | 2026-01-13 01:47 | 2026-01-13 01:47 |
| public_recipes | 11 | 2026-03-09 22:14 | 2026-03-09 22:44 |
| shopping_cart | 11 | 2026-08-05 04:58 | 2026-08-05 04:58 |
| content_like_email_queue | 10 | 2026-03-12 00:42 | — |
| currency_images | 10 | 2026-01-14 05:29 | 2026-01-14 05:29 |
| team_members | 10 | 2026-03-27 15:46 | 2026-03-27 15:46 |
| user_coloring_books | 10 | — | — |
| coloring_likes | 9 | 2026-01-25 16:11 | — |
| public_recipe_likes | 9 | 2026-03-09 22:44 | — |
| user_workout_location_packs | 9 | — | — |
| album_likes | 8 | 2026-03-09 22:12 | — |
| card_designs | 8 | 2026-01-15 03:03 | 2026-01-15 03:03 |
| cash_register_stores | 8 | 2026-01-26 18:37 | 2026-01-26 18:49 |
| coffee_products | 8 | 2026-01-31 22:21 | 2026-03-04 18:00 |
| community_features | 8 | 2025-10-10 14:46 | 2025-10-10 14:52 |
| joke_likes | 8 | 2026-03-09 22:11 | — |
| sponsor_message_reads | 8 | 2026-08-24 02:37 | — |
| sponsor_messages | 8 | 2026-01-15 17:53 | — |
| campaign_templates | 7 | 2026-01-03 01:07 | 2026-01-03 01:07 |
| sponsorship_email_queue | 7 | 2026-09-20 19:10 | — |
| support_page_sections | 7 | 2025-10-23 01:50 | 2025-10-23 01:50 |
| cash_register_user_stats | 6 | 2026-01-30 04:44 | 2026-02-22 15:06 |
| chore_badges | 6 | — | — |
| chore_streaks | 6 | 2026-02-02 23:45 | 2026-03-09 22:16 |
| coffee_shop_menu_categories | 6 | 2026-10-18 22:10 | 2026-10-18 22:10 |
| donation_history_cache | 6 | 2026-01-03 05:11 | 2026-01-03 08:00 |
| featured_items | 6 | 2026-06-04 20:59 | 2026-09-18 04:44 |
| sticker_collections | 6 | 2026-10-18 06:30 | 2026-10-18 06:30 |
| store_items | 6 | 2026-01-25 19:49 | 2026-01-25 20:02 |
| streak_milestones | 6 | 2026-01-30 17:41 | — |
| content_announcement_likes | 5 | 2026-03-02 06:54 | — |
| e2e_test_runs | 5 | 2026-05-14 04:44 | — |
| sponsor_page_sections | 5 | 2025-10-04 23:14 | 2025-10-04 23:14 |
| tour_completions | 5 | — | — |
| vendor_onboarding_progress | 5 | 2026-06-18 16:31 | 2026-06-18 16:53 |
| workout_categories | 5 | 2026-01-14 23:31 | 2026-01-14 23:31 |
| badge_earned_email_queue | 4 | 2026-02-02 23:45 | — |
| badges | 4 | 2025-12-28 21:14 | — |
| bike_ride_events | 4 | 2026-03-18 04:47 | 2026-04-02 20:20 |
| chore_daily_rewards | 4 | — | — |
| community_quick_links | 4 | 2025-10-03 03:00 | 2025-10-08 01:05 |
| daily_bar_icons | 4 | 2026-01-30 18:01 | 2026-02-01 23:50 |
| digest_emails_log | 4 | — | — |
| pet_types | 4 | 2025-10-09 04:52 | 2025-10-09 04:52 |
| user_badges | 4 | — | — |
| user_store_purchases | 4 | — | — |
| about_sections | 3 | 2025-10-07 23:42 | 2025-10-07 23:42 |
| daily_engagement_settings | 3 | 2026-01-30 20:15 | 2026-02-01 23:58 |
| family_organizations | 3 | 2025-10-03 02:47 | 2025-10-03 02:47 |
| footer_sections | 3 | 2025-10-03 22:20 | 2025-10-03 22:20 |
| joy_house_stores_content | 3 | — | 2026-01-16 06:32 |
| partners | 3 | 2025-10-09 03:11 | 2025-10-09 03:11 |
| vendor_story_media | 3 | 2026-01-22 02:16 | 2026-01-22 02:16 |
| avatar_compression_jobs | 2 | 2026-02-07 02:42 | — |
| cash_register_leaderboard_rewards | 2 | — | — |
| cash_register_time_trial_bests | 2 | — | 2026-01-29 00:44 |
| cash_register_time_trial_scores | 2 | 2026-01-29 00:44 | — |
| coffee_shop_menu_addons | 2 | 2026-01-05 01:41 | — |
| daily_fortune_comments | 2 | 2026-02-04 18:42 | 2026-02-04 18:42 |
| emotion_journal_entries | 2 | 2026-02-01 23:56 | 2026-02-01 23:56 |
| event_dates | 2 | 2026-01-23 22:59 | — |
| feed_reposts | 2 | 2026-02-15 19:52 | — |
| joy_house_store_images | 2 | 2026-01-16 06:50 | — |
| newsletter_templates | 2 | 2026-03-25 22:11 | 2026-03-25 22:11 |
| recipe_shopping_list | 2 | 2026-01-04 20:16 | 2026-01-04 20:16 |
| recipe_unmatched_items | 2 | — | — |
| user_cash_register_stores | 2 | — | — |
| user_permissions | 2 | — | — |
| user_pets | 2 | 2025-10-09 05:16 | 2025-10-09 05:18 |
| user_saved_fortunes | 2 | 2026-02-02 04:48 | — |
| ways_to_give | 2 | 2025-10-07 01:49 | 2025-10-07 01:49 |
| beat_pad_comments | 1 | 2026-03-08 20:00 | 2026-03-08 20:00 |
| card_templates | 1 | 2026-01-15 02:59 | 2026-01-15 02:59 |
| commission_settings | 1 | 2025-12-22 19:37 | 2025-12-22 20:00 |
| contact_form_settings | 1 | 2025-10-04 02:49 | 2025-10-14 03:47 |
| issue_reports | 1 | 2025-10-21 14:12 | 2025-10-21 14:12 |
| joy_house_store_locations | 1 | 2026-01-15 04:07 | 2026-01-16 07:03 |
| moderation_settings | 1 | — | 2025-10-06 05:03 |
| mood_weekly_summaries | 1 | 2026-02-11 04:11 | 2026-02-11 04:11 |
| receipt_settings | 1 | — | 2025-11-03 02:35 |
| saved_locations | 1 | 2025-10-07 14:01 | 2025-10-07 14:01 |
| user_app_preferences | 1 | 2026-01-23 05:51 | 2026-02-01 23:47 |
| user_joke_categories | 1 | — | — |
| year_end_summary_settings | 1 | — | 2025-10-06 06:23 |
| address_validation_log | 0 | — | — |
| ambassador_email_messages | 0 | — | — |
| ambassador_email_threads | 0 | — | — |
| ambassador_profiles | 0 | — | — |
| beat_pad_presets | 0 | — | — |
| card_likes | 0 | — | — |
| card_word_arts | 0 | — | — |
| cash_register_pack_items | 0 | — | — |
| cash_register_packs | 0 | — | — |
| change_logs | 0 | — | — |
| chore_badge_images | 0 | — | — |
| chore_celebration_images | 0 | — | — |
| chore_challenge_daily_completions | 0 | — | — |
| chore_challenge_gallery | 0 | — | — |
| chore_challenge_gallery_likes | 0 | — | — |
| chore_challenge_progress | 0 | — | — |
| chore_challenge_themes | 0 | — | — |
| event_attendees | 0 | — | — |
| featured_bestie_hearts | 0 | — | — |
| featured_besties | 0 | — | — |
| newsletter_automation_enrollments | 0 | — | — |
| newsletter_automation_logs | 0 | — | — |
| newsletter_automations | 0 | — | — |
| newsletter_drip_sequences | 0 | — | — |
| newsletter_drip_steps | 0 | — | — |
| shipping_rate_cache | 0 | — | — |
| sponsor_bestie_requests | 0 | — | — |
| sponsorship_shares | 0 | — | — |
| user_beat_pad_sounds | 0 | — | — |
| user_card_templates | 0 | — | — |
| user_cards | 0 | — | — |
| user_cash_register_packs | 0 | — | — |
| user_purchases | 0 | — | — |
| user_workout_goals | 0 | — | — |
| user_workout_locations | 0 | — | — |
| vendor_bestie_assets | 0 | — | — |
| vendor_bestie_requests | 0 | — | — |
| workout_videos | 0 | — | — |

## 3. Users
- Total accounts (auth): **328** (profiles: 328)
- Role rows in user_roles: supporter 234, caregiver 44, bestie 35, admin 6, owner 5, vendor 2, moderator 1 (= 327 rows; note vendor access is normally a vendors-table status, not a role)

New signups per month:
| Month | Signups |
|---|---|
| 2025-11 | 43 |
| 2025-12 | 9 |
| 2026-01 | 26 |
| 2026-02 | 27 |
| 2026-03 | 11 |
| 2026-04 | 11 |
| 2026-05 | 27 |
| 2026-06 | 15 |
| 2026-07 | 10 |
| 2026-08 | 17 |
| 2026-09 | 5 |
| 2026-10 (partial) | 10 |

Last sign-in: ≤7 days 8 · 8–30 days 12 · 31–90 days 32 · 91–365 days 239 · >365 days 19 · never 18.

## 4. Feature usage
Rows/users counted by `created_at`. "Users" = distinct values of the first available user column (user_id, creator_id, author_id, created_by, sponsor_id, donor_id, guardian_id, caregiver_id, sender_id, bestie_id, vendor_id); "—" = no such column. "n/a" = table has no created_at. Last activity = newest created_at/updated_at. Tables are mapped to areas by name pattern.

### Giving: donations
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| donations | 388 | 1 | 6 | 382 | 1 | 4 | 47 | donor_id | 2026-10-12 17:35 |
| donation_stripe_transactions | 385 | 12 | 46 | 385 | 5 | 7 | 26 | donor_id | 2026-10-15 18:01 |
| donation_sync_status | 164 | n/a | n/a | n/a | — | — | — | — | — |
| donation_history_cache | 6 | 0 | 0 | 6 | 0 | 0 | 1 | user_id | 2026-01-03 08:00 |

### Giving: sponsorships
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| sponsorship_receipts | 414 | 3 | 11 | 404 | 1 | 5 | 61 | user_id | 2026-10-16 12:55 |
| sponsorships | 67 | n/a | n/a | n/a | — | — | — | — | — |
| year_end_summary_sent | 20 | 0 | 0 | 20 | 0 | 0 | 19 | user_id | 2026-04-12 16:44 |
| sponsor_besties | 16 | 0 | 0 | 2 | 0 | 0 | 1 | created_by | 2026-04-09 17:35 |
| sponsor_message_reads | 8 | 0 | 8 | 8 | 0 | 2 | 2 | sponsor_id | 2026-08-24 02:37 |
| sponsor_messages | 8 | 0 | 0 | 8 | 0 | 0 | 2 | bestie_id | 2026-01-15 17:53 |
| sponsorship_email_queue | 7 | 2 | 2 | 7 | 2 | 2 | 7 | user_id | 2026-09-20 19:10 |
| sponsor_page_sections | 5 | 0 | 0 | 0 | — | — | — | — | 2025-10-04 23:14 |
| year_end_summary_settings | 1 | n/a | n/a | n/a | — | — | — | — | 2025-10-06 06:23 |
| sponsor_bestie_requests | 0 | 0 | 0 | 0 | 0 | 0 | 0 | sponsor_id | — |
| sponsorship_shares | 0 | 0 | 0 | 0 | 0 | 0 | 0 | bestie_id | — |

### Giving: bike pledges
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| bike_ride_pledges | 81 | 0 | 0 | 81 | — | — | — | — | 2026-07-10 20:30 |
| bike_ride_scenic_photos | 18 | 0 | 0 | 18 | — | — | — | — | 2026-03-18 03:37 |
| bike_ride_events | 4 | 0 | 0 | 4 | 0 | 0 | 2 | created_by | 2026-04-02 20:20 |

### Giving: Night of Joy
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| noj_confirmation_email_log | 54 | n/a | n/a | n/a | — | — | — | — | — |

### Receipts
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| receipt_generation_logs | 112 | 2 | 2 | 112 | — | — | — | — | 2026-09-20 19:10 |
| receipt_settings | 1 | n/a | n/a | n/a | — | — | — | — | 2025-11-03 02:35 |

### Store/marketplace/vendors/orders
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| marketplace_reconciliation_log | 25616 | 2879 | 8633 | 25616 | — | — | — | — | 2026-10-19 00:00 |
| product_views | 327 | n/a | n/a | n/a | — | — | — | — | — |
| stripe_webhook_logs | 152 | 0 | 0 | 152 | — | — | — | — | 2025-11-22 01:45 |
| products | 57 | 0 | 0 | 57 | 0 | 0 | 8 | vendor_id | 2026-10-15 16:05 |
| shipping_calculation_log | 40 | 0 | 0 | 40 | 0 | 0 | 1 | user_id | 2026-02-17 18:00 |
| order_items | 24 | 0 | 0 | 24 | 0 | 0 | 3 | vendor_id | 2026-07-16 18:53 |
| orders | 21 | 0 | 0 | 21 | 0 | 0 | 4 | user_id | 2026-07-16 21:00 |
| vendor_team_members | 19 | 1 | 1 | 19 | 1 | 1 | 14 | user_id | 2026-10-18 21:51 |
| product_color_images | 16 | 0 | 0 | 16 | — | — | — | — | 2025-12-31 05:26 |
| vendors | 16 | 1 | 1 | 14 | 1 | 1 | 11 | user_id | 2026-10-18 21:51 |
| shopping_cart | 11 | 0 | 4 | 11 | 0 | 1 | 6 | user_id | 2026-08-05 04:58 |
| vendor_onboarding_progress | 5 | 0 | 0 | 5 | 0 | 0 | 5 | vendor_id | 2026-06-18 16:53 |
| joy_house_stores_content | 3 | n/a | n/a | n/a | — | — | — | — | 2026-01-16 06:32 |
| vendor_story_media | 3 | 0 | 0 | 3 | 0 | 0 | 1 | vendor_id | 2026-01-22 02:16 |
| joy_house_store_images | 2 | 0 | 0 | 2 | — | — | — | — | 2026-01-16 06:50 |
| commission_settings | 1 | 0 | 0 | 1 | 0 | 0 | 0 | created_by | 2025-12-22 20:00 |
| joy_house_store_locations | 1 | 0 | 0 | 1 | — | — | — | — | 2026-01-16 07:03 |
| shipping_rate_cache | 0 | 0 | 0 | 0 | — | — | — | — | — |
| vendor_bestie_assets | 0 | 0 | 0 | 0 | 0 | 0 | 0 | bestie_id | — |
| vendor_bestie_requests | 0 | 0 | 0 | 0 | 0 | 0 | 0 | bestie_id | — |

### Printify
No matching tables.


### Newsletter/email
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| newsletter_analytics | 22578 | 2786 | 11330 | 22578 | — | — | — | — | 2026-10-17 18:33 |
| newsletter_emails_log | 12013 | 1359 | 5546 | 12013 | — | — | — | — | 2026-10-16 12:56 |
| newsletter_email_queue | 10987 | 1338 | 5457 | 10987 | — | — | — | — | 2026-10-03 03:12 |
| newsletter_subscribers | 1615 | 12 | 119 | 1606 | 7 | 15 | 230 | user_id | 2026-10-16 01:39 |
| email_audit_log | 763 | 40 | 120 | 763 | — | — | — | — | 2026-10-18 23:27 |
| automated_campaign_sends | 690 | 20 | 50 | 675 | — | — | — | — | 2026-10-16 12:56 |
| newsletter_links | 128 | 8 | 18 | 128 | — | — | — | — | 2026-10-03 03:15 |
| email_notifications_log | 102 | n/a | n/a | n/a | — | — | — | — | — |
| newsletter_campaigns | 18 | 1 | 4 | 18 | 1 | 1 | 2 | created_by | 2026-10-03 05:10 |
| campaign_templates | 7 | 0 | 0 | 2 | 0 | 0 | 0 | created_by | 2026-01-03 01:07 |
| digest_emails_log | 4 | n/a | n/a | n/a | — | — | — | — | — |
| newsletter_templates | 2 | 0 | 0 | 2 | 0 | 0 | 1 | created_by | 2026-03-25 22:11 |
| ambassador_email_messages | 0 | 0 | 0 | 0 | — | — | — | — | — |
| ambassador_email_threads | 0 | 0 | 0 | 0 | — | — | — | — | — |
| ambassador_profiles | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| newsletter_automation_enrollments | 0 | n/a | n/a | n/a | — | — | — | — | — |
| newsletter_automation_logs | 0 | 0 | 0 | 0 | — | — | — | — | — |
| newsletter_automations | 0 | 0 | 0 | 0 | 0 | 0 | 0 | created_by | — |
| newsletter_drip_sequences | 0 | 0 | 0 | 0 | 0 | 0 | 0 | created_by | — |
| newsletter_drip_steps | 0 | 0 | 0 | 0 | — | — | — | — | — |

### Contact form
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| contact_form_replies | 283 | 23 | 77 | 279 | 2 | 3 | 3 | sender_id | 2026-10-18 23:27 |
| contact_form_submissions | 175 | 18 | 47 | 170 | — | — | — | — | 2026-10-18 23:24 |
| contact_form_settings | 1 | 0 | 0 | 0 | — | — | — | — | 2025-10-14 03:47 |

### Discussions
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| discussion_comments | 108 | 2 | 19 | 105 | 1 | 4 | 12 | author_id | 2026-10-06 02:16 |
| discussion_posts | 69 | 2 | 13 | 64 | 1 | 1 | 2 | author_id | 2026-10-06 02:16 |

### Prayer
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| prayer_request_likes | 33 | 0 | 0 | 33 | 0 | 0 | 11 | user_id | 2026-06-02 15:58 |
| prayer_requests | 14 | 0 | 0 | 14 | 0 | 0 | 5 | user_id | 2026-06-18 14:29 |

### Events
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| event_email_queue | 5260 | 884 | 1771 | 5260 | 221 | 222 | 227 | user_id | 2026-10-17 22:54 |
| event_update_email_queue | 94 | 0 | 0 | 94 | 0 | 0 | 94 | user_id | 2026-01-23 23:44 |
| events | 38 | 4 | 7 | 36 | 1 | 1 | 1 | created_by | 2026-10-17 22:54 |
| event_likes | 15 | 0 | 0 | 15 | 0 | 0 | 4 | user_id | 2026-04-15 21:13 |
| event_dates | 2 | 0 | 0 | 2 | — | — | — | — | 2026-01-23 22:59 |
| event_attendees | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |

### Albums
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| album_images | 638 | 0 | 0 | 553 | — | — | — | — | 2026-07-09 18:58 |
| albums | 25 | 0 | 0 | 19 | 0 | 0 | 1 | created_by | 2026-07-09 18:57 |
| album_comments | 13 | 0 | 0 | 13 | 0 | 0 | 9 | author_id | 2026-06-17 14:55 |
| album_likes | 8 | 0 | 0 | 8 | 0 | 0 | 4 | user_id | 2026-03-09 22:12 |

### Notifications
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| notifications | 12310 | 1268 | 2577 | 11199 | 320 | 321 | 323 | user_id | 2026-10-17 22:54 |
| notification_preferences | 225 | 0 | 0 | 222 | 0 | 0 | 222 | user_id | 2026-10-18 13:14 |

### Community feed/announcements
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| content_announcements | 16 | 0 | 0 | 16 | 0 | 0 | 1 | created_by | 2026-03-02 21:33 |
| community_sections | 11 | 0 | 0 | 2 | — | — | — | — | 2026-01-23 16:30 |
| community_features | 8 | 0 | 0 | 0 | 0 | 0 | 0 | created_by | 2025-10-10 14:52 |
| featured_items | 6 | 0 | 0 | 5 | 0 | 0 | 2 | created_by | 2026-09-18 04:44 |
| content_announcement_likes | 5 | 0 | 0 | 5 | 0 | 0 | 3 | user_id | 2026-03-02 06:54 |
| community_quick_links | 4 | 0 | 0 | 0 | 0 | 0 | 0 | created_by | 2025-10-08 01:05 |
| feed_reposts | 2 | 0 | 0 | 2 | — | — | — | — | 2026-02-15 19:52 |
| featured_bestie_hearts | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| featured_besties | 0 | 0 | 0 | 0 | 0 | 0 | 0 | bestie_id | — |

### Caregiver/guardian links
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| caregiver_bestie_links | 14 | 0 | 1 | 8 | 0 | 1 | 8 | caregiver_id | 2026-08-24 01:52 |
| guardian_resources | 13 | 0 | 0 | 13 | 0 | 0 | 0 | created_by | 2026-01-20 18:19 |

### Bestie/picture password
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| picture_password_notifications | 62 | 3 | 12 | 62 | 3 | 8 | 51 | user_id | 2026-10-07 21:05 |
| picture_password_attempts | 24 | n/a | n/a | n/a | — | — | — | — | — |
| picture_passwords | 16 | 0 | 0 | 16 | 0 | 0 | 16 | user_id | 2026-06-06 17:44 |

### Wordle/Daily Five
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| wordle_valid_words | 675 | 0 | 0 | 675 | — | — | — | — | 2026-03-04 16:48 |
| wordle_attempts | 517 | 30 | 89 | 517 | 2 | 4 | 21 | user_id | 2026-10-18 19:58 |
| wordle_daily_words | 282 | 30 | 90 | 282 | — | — | — | — | 2026-10-18 07:05 |
| wordle_themes | 66 | 0 | 0 | 66 | — | — | — | — | 2026-01-17 18:33 |
| wordle_user_stats | 15 | 0 | 0 | 15 | 0 | 0 | 15 | user_id | 2026-10-18 19:58 |

### Stickers
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| daily_scratch_cards | 2392 | 140 | 431 | 2389 | 29 | 59 | 285 | user_id | 2026-10-18 23:55 |
| user_stickers | 794 | n/a | n/a | n/a | — | — | — | — | — |
| stickers | 187 | 30 | 30 | 177 | — | — | — | — | 2026-10-18 06:49 |
| sticker_admin_log | 156 | 156 | 156 | 156 | — | — | — | — | 2026-10-18 07:16 |
| sticker_collections | 6 | 1 | 1 | 5 | — | — | — | — | 2026-10-18 06:30 |

### Memory match
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| memory_match_images | 289 | 0 | 0 | 289 | — | — | — | — | 2026-03-02 21:27 |
| memory_match_pack_ideas | 60 | 0 | 0 | 60 | — | — | — | — | 2026-02-05 23:44 |
| memory_match_packs | 13 | 0 | 0 | 13 | — | — | — | — | 2026-03-02 21:32 |

### Beat pad
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| beat_pad_sounds | 102 | 0 | 0 | 102 | — | — | — | — | 2026-01-15 02:33 |
| beat_pad_creations | 16 | 0 | 1 | 16 | 0 | 1 | 5 | creator_id | 2026-07-22 20:17 |
| beat_pad_likes | 16 | 0 | 0 | 16 | 0 | 0 | 4 | user_id | 2026-03-09 22:44 |
| beat_pad_comments | 1 | 0 | 0 | 1 | 0 | 0 | 1 | author_id | 2026-03-08 20:00 |
| beat_pad_presets | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |

### Cash register
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| cash_register_customers | 37 | 0 | 0 | 37 | — | — | — | — | 2026-01-16 06:52 |
| cash_register_stores | 8 | 0 | 0 | 8 | — | — | — | — | 2026-01-26 18:49 |
| cash_register_user_stats | 6 | 0 | 0 | 6 | 0 | 0 | 6 | user_id | 2026-02-22 15:06 |
| cash_register_leaderboard_rewards | 2 | n/a | n/a | n/a | — | — | — | — | — |
| cash_register_time_trial_bests | 2 | n/a | n/a | n/a | — | — | — | — | 2026-01-29 00:44 |
| cash_register_time_trial_scores | 2 | 0 | 0 | 2 | 0 | 0 | 2 | user_id | 2026-01-29 00:44 |
| cash_register_pack_items | 0 | 0 | 0 | 0 | — | — | — | — | — |
| cash_register_packs | 0 | 0 | 0 | 0 | — | — | — | — | — |

### Coloring
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| coloring_pages | 689 | 0 | 0 | 689 | 0 | 0 | 1 | created_by | 2026-01-25 00:46 |
| coloring_books | 11 | 0 | 0 | 11 | 0 | 0 | 0 | created_by | 2026-01-25 00:05 |
| coloring_likes | 9 | 0 | 0 | 9 | 0 | 0 | 2 | user_id | 2026-01-25 16:11 |

### Cards
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| card_designs | 8 | 0 | 0 | 8 | 0 | 0 | 0 | created_by | 2026-01-15 03:03 |
| card_templates | 1 | 0 | 0 | 1 | 0 | 0 | 0 | created_by | 2026-01-15 02:59 |
| card_likes | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| card_word_arts | 0 | 0 | 0 | 0 | 0 | 0 | 0 | created_by | — |

### Chores
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| chore_completions | 50 | n/a | n/a | n/a | — | — | — | — | — |
| chores | 49 | 0 | 0 | 49 | 0 | 0 | 9 | created_by | 2026-02-03 15:05 |
| chore_wheel_spins | 14 | 0 | 0 | 14 | 0 | 0 | 4 | user_id | 2026-03-09 22:16 |
| chore_badges | 6 | n/a | n/a | n/a | — | — | — | — | — |
| chore_streaks | 6 | 0 | 0 | 6 | 0 | 0 | 6 | user_id | 2026-03-09 22:16 |
| chore_daily_rewards | 4 | n/a | n/a | n/a | — | — | — | — | — |
| chore_badge_images | 0 | 0 | 0 | 0 | — | — | — | — | — |
| chore_celebration_images | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| chore_challenge_daily_completions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| chore_challenge_gallery | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| chore_challenge_gallery_likes | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| chore_challenge_progress | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| chore_challenge_themes | 0 | 0 | 0 | 0 | — | — | — | — | — |

### Workouts/fitness
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| workout_locations | 193 | 0 | 0 | 193 | — | — | — | — | 2026-01-29 21:53 |
| fitness_avatar_celebration_images | 147 | 0 | 0 | 147 | — | — | — | — | 2026-02-07 07:12 |
| workout_generated_images | 98 | 1 | 1 | 98 | 1 | 1 | 3 | user_id | 2026-10-18 07:11 |
| user_workout_logs | 86 | n/a | n/a | n/a | — | — | — | — | — |
| fitness_avatars | 75 | 0 | 0 | 75 | — | — | — | — | 2026-02-07 07:23 |
| workout_activities | 55 | 0 | 0 | 55 | 0 | 0 | 2 | user_id | 2026-03-24 21:06 |
| fitness_avatar_templates | 34 | 0 | 0 | 34 | — | — | — | — | 2026-01-20 23:01 |
| workout_image_likes | 28 | 0 | 0 | 28 | 0 | 0 | 4 | user_id | 2026-03-12 00:42 |
| workout_location_packs | 26 | 0 | 0 | 26 | — | — | — | — | 2026-01-29 21:54 |
| user_fitness_avatars | 22 | n/a | n/a | n/a | — | — | — | — | — |
| user_workout_location_packs | 9 | n/a | n/a | n/a | — | — | — | — | — |
| workout_categories | 5 | 0 | 0 | 5 | — | — | — | — | 2026-01-14 23:31 |
| user_workout_goals | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| user_workout_locations | 0 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | — |
| workout_videos | 0 | 0 | 0 | 0 | 0 | 0 | 0 | created_by | — |

### Recipes
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| recipe_ingredients | 121 | 0 | 0 | 121 | — | — | — | — | 2026-01-16 04:53 |
| recipe_tools | 53 | 0 | 0 | 53 | — | — | — | — | 2026-01-16 05:03 |
| user_recipe_ingredients | 20 | n/a | n/a | n/a | — | — | — | — | 2026-06-14 04:00 |
| user_recipe_tools | 20 | n/a | n/a | n/a | — | — | — | — | 2026-06-14 04:00 |
| saved_recipes | 18 | 0 | 0 | 18 | 0 | 0 | 6 | user_id | 2026-03-09 22:47 |
| public_recipes | 11 | 0 | 0 | 11 | 0 | 0 | 5 | creator_id | 2026-03-09 22:44 |
| public_recipe_likes | 9 | 0 | 0 | 9 | 0 | 0 | 3 | user_id | 2026-03-09 22:44 |
| recipe_shopping_list | 2 | 0 | 0 | 2 | 0 | 0 | 2 | user_id | 2026-01-04 20:16 |
| recipe_unmatched_items | 2 | n/a | n/a | n/a | — | — | — | — | — |

### Jokes
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| joke_library | 680 | 0 | 0 | 680 | — | — | — | — | 2026-01-14 17:04 |
| user_joke_history | 409 | 0 | 0 | 409 | 0 | 0 | 12 | user_id | 2026-04-19 16:46 |
| saved_jokes | 39 | 0 | 0 | 39 | 0 | 0 | 3 | user_id | 2026-03-09 22:11 |
| joke_categories | 24 | 0 | 0 | 24 | — | — | — | — | 2026-01-14 18:09 |
| joke_likes | 8 | 0 | 0 | 8 | 0 | 0 | 4 | user_id | 2026-03-09 22:11 |
| user_joke_categories | 1 | n/a | n/a | n/a | — | — | — | — | — |

### Fortunes
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| daily_fortunes | 466 | 0 | 0 | 466 | — | — | — | — | 2026-02-01 18:42 |
| daily_fortune_views | 461 | 30 | 91 | 461 | 4 | 7 | 19 | user_id | 2026-10-18 19:56 |
| daily_fortune_posts | 260 | 30 | 89 | 260 | — | — | — | — | 2026-10-18 07:00 |
| daily_fortune_likes | 16 | 0 | 0 | 16 | 0 | 0 | 5 | user_id | 2026-04-20 13:38 |
| daily_fortune_comments | 2 | 0 | 0 | 2 | 0 | 0 | 1 | user_id | 2026-02-04 18:42 |
| user_saved_fortunes | 2 | 0 | 0 | 2 | 0 | 0 | 2 | user_id | 2026-02-02 04:48 |

### Drinks
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| drink_ingredients | 89 | 0 | 0 | 89 | — | — | — | — | 2026-01-16 08:01 |
| custom_drinks | 33 | 0 | 3 | 33 | 0 | 1 | 8 | creator_id | 2026-07-22 20:08 |
| custom_drink_likes | 32 | 0 | 0 | 32 | 0 | 0 | 4 | user_id | 2026-03-05 21:11 |
| drink_vibes | 24 | 0 | 0 | 24 | — | — | — | — | 2025-12-23 23:19 |

### Pets
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| pet_types | 4 | 0 | 0 | 0 | — | — | — | — | 2025-10-09 04:52 |
| user_pets | 2 | 0 | 0 | 0 | 0 | 0 | 0 | user_id | 2025-10-09 05:18 |

### Emotion journal/mood
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| mood_entries | 429 | 29 | 88 | 429 | 2 | 4 | 14 | user_id | 2026-10-18 19:58 |
| avatar_emotion_images | 144 | 0 | 0 | 144 | — | — | — | — | 2026-02-07 06:33 |
| mood_responses | 120 | 0 | 0 | 120 | — | — | — | — | 2026-01-31 03:36 |
| emotion_types | 16 | 0 | 0 | 16 | — | — | — | — | 2026-02-01 00:40 |
| mood_messages | 16 | 0 | 0 | 16 | — | — | — | — | 2026-01-30 17:41 |
| emotion_journal_entries | 2 | 0 | 0 | 2 | 0 | 0 | 1 | user_id | 2026-02-01 23:56 |
| mood_weekly_summaries | 1 | 0 | 0 | 1 | 0 | 0 | 1 | user_id | 2026-02-11 04:11 |

### Coins/store/rewards
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| coin_transactions | 4781 | 283 | 846 | 4749 | 32 | 62 | 202 | user_id | 2026-10-18 23:55 |
| daily_engagement_completions | 345 | 24 | 70 | 345 | 2 | 4 | 10 | user_id | 2026-10-18 19:58 |
| user_streaks | 192 | 9 | 28 | 192 | 9 | 28 | 192 | user_id | 2026-10-18 23:55 |
| coin_rewards_settings | 50 | 0 | 0 | 50 | — | — | — | — | 2026-02-03 16:22 |
| user_streak_milestones | 32 | n/a | n/a | n/a | — | — | — | — | — |
| store_items | 6 | 0 | 0 | 1 | — | — | — | — | 2026-01-25 20:02 |
| streak_milestones | 6 | 0 | 0 | 6 | — | — | — | — | 2026-01-30 17:41 |
| badge_earned_email_queue | 4 | 0 | 0 | 4 | — | — | — | — | 2026-02-02 23:45 |
| badges | 4 | 0 | 0 | 1 | — | — | — | — | 2025-12-28 21:14 |
| user_badges | 4 | n/a | n/a | n/a | — | — | — | — | — |
| user_store_purchases | 4 | n/a | n/a | n/a | — | — | — | — | — |
| daily_engagement_settings | 3 | 0 | 0 | 3 | — | — | — | — | 2026-02-01 23:58 |

### Videos/audio
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| videos | 36 | 0 | 0 | 34 | 0 | 0 | 2 | created_by | 2026-07-09 18:57 |
| audio_clips | 13 | 0 | 0 | 13 | 0 | 0 | 1 | created_by | 2026-01-26 03:31 |

### Coffee shop
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| coffee_shop_menu_items | 43 | 9 | 9 | 43 | — | — | — | — | 2026-10-18 22:19 |
| coffee_product_tiers | 24 | 0 | 0 | 24 | — | — | — | — | 2026-02-01 03:29 |
| coffee_products | 8 | 0 | 0 | 8 | — | — | — | — | 2026-03-04 18:00 |
| coffee_shop_menu_categories | 6 | 1 | 1 | 6 | — | — | — | — | 2026-10-18 22:10 |
| coffee_shop_menu_addons | 2 | 0 | 0 | 2 | — | — | — | — | 2026-01-05 01:41 |

### Avatars
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| avatars | 42 | 0 | 0 | 0 | — | — | — | — | 2025-10-01 07:58 |
| avatar_compression_jobs | 2 | 0 | 0 | 2 | 0 | 0 | 1 | created_by | 2026-02-07 02:42 |

### Admin/ops/testing/logs
| Table | Total | 30d rows | 90d rows | 365d rows | 30d users | 90d users | 365d users | User column | Last activity |
|---|---|---|---|---|---|---|---|---|---|
| page_visits | 89666 | n/a | n/a | n/a | — | — | — | — | — |
| test_runs | 17471 | 868 | 2573 | 16812 | — | — | — | — | 2026-10-18 23:13 |
| error_logs | 1665 | 9 | 62 | 1593 | 0 | 0 | 0 | user_id | 2026-10-16 03:17 |
| ai_gateway_usage_log | 110 | 2 | 24 | 110 | 1 | 4 | 10 | user_id | 2026-10-06 02:16 |
| help_faqs | 60 | 0 | 0 | 33 | 0 | 0 | 0 | created_by | 2026-01-13 01:47 |
| app_settings | 36 | n/a | n/a | n/a | — | — | — | — | 2026-06-12 22:37 |
| health_check_results | 32 | n/a | n/a | n/a | — | — | — | — | — |
| app_configurations | 26 | 0 | 0 | 26 | — | — | — | — | 2026-02-02 01:45 |
| reconciliation_changes | 26 | 0 | 0 | 26 | — | — | — | — | 2025-11-22 04:21 |
| rate_limits | 13 | 1 | 1 | 7 | 1 | 1 | 2 | user_id | 2026-10-18 21:51 |
| reconciliation_job_logs | 13 | 0 | 0 | 13 | — | — | — | — | 2025-11-25 01:28 |
| help_tours | 12 | 0 | 0 | 8 | 0 | 0 | 0 | created_by | 2026-01-13 01:46 |
| help_guides | 11 | 0 | 0 | 6 | 0 | 0 | 0 | created_by | 2026-01-13 01:47 |
| e2e_test_runs | 5 | 0 | 0 | 5 | 0 | 0 | 1 | vendor_id | 2026-05-14 04:44 |
| issue_reports | 1 | 0 | 0 | 1 | 0 | 0 | 0 | user_id | 2025-10-21 14:12 |
| moderation_settings | 1 | n/a | n/a | n/a | — | — | — | — | 2025-10-06 05:03 |
| change_logs | 0 | 0 | 0 | 0 | — | — | — | — | — |

### Other tables (not mapped to a feature area)
about_sections (3), active_subscriptions_cache (35), address_validation_log (0), app_sound_effects (17), content_like_email_queue (10), currency_images (10), daily_bar_icons (4), family_organizations (3), footer_links (15), footer_sections (3), game_sessions (195), homepage_sections (14), navigation_links (39), partners (3), password_reset_tokens (48), profiles (328), saved_locations (1), saved_shopping_tips (13), support_page_sections (7), tab_click_tracking (640), team_members (10), terms_acceptance (287), tour_completions (5), tts_voices (13), user_app_preferences (1), user_beat_pad_sounds (0), user_card_templates (0), user_cards (0), user_cash_register_packs (0), user_cash_register_stores (2), user_coloring_books (10), user_colorings (39), user_favorite_activities (18), user_memory_match_packs (18), user_permissions (2), user_purchases (0), user_roles (327), ways_to_give (2)

## 5. Money (aggregates, USD as stored — full amounts incl. covered fees)

### Donations by month (created_at)
| Month | Mode | All rows | All amount | Completed/active | Completed/active amount |
|---|---|---|---|---|---|
| 2025-11 | live | 25 | $5782.06 | 23 | $5222.06 |
| 2025-12 | live | 37 | $5595.00 | 31 | $4630.00 |
| 2026-01 | live | 23 | $6445.00 | 18 | $6040.00 |
| 2026-02 | live | 37 | $4315.00 | 30 | $3520.00 |
| 2026-03 | live | 23 | $2449.80 | 16 | $1979.80 |
| 2026-03 | test | 6 | $560.00 | 3 | $400.00 |
| 2026-04 | live | 79 | $10290.00 | 69 | $9185.00 |
| 2026-05 | live | 71 | $12472.00 | 64 | $9967.00 |
| 2026-06 | live | 66 | $12261.00 | 61 | $11866.00 |
| 2026-07 | live | 5 | $365.00 | 3 | $225.00 |
| 2026-07 | test | 2 | $15.00 | 0 | $0.00 |
| 2026-08 | live | 2 | $120.00 | 2 | $120.00 |
| 2026-09 | live | 3 | $320.00 | 3 | $320.00 |
| 2026-10 | live | 1 | $1000.00 | 1 | $1000.00 |

### Sponsorships started per month (started_at)
| Month | Mode | Count | Amount |
|---|---|---|---|
| 2025-11 | live | 19 | $904.50 |
| 2025-12 | live | 6 | $181.80 |
| 2026-01 | live | 6 | $224.52 |
| 2026-02 | live | 4 | $335.72 |
| 2026-03 | live | 1 | $20.91 |
| 2026-04 | live | 6 | $185.72 |
| 2026-05 | live | 1 | $103.30 |
| 2026-06 | live | 1 | $30.00 |
| 2026-07 | live | 3 | $566.30 |
| 2026-07 | test | 1 | $10.00 |
| 2026-08 | live | 2 | $46.06 |
| 2026-09 | live | 2 | $40.61 |
| 2026-10 | live | 1 | $10.61 |

### Sponsorships by current status (all time)
| Mode | Frequency | Status | Count | Amount |
|---|---|---|---|---|
| live | monthly | active | 48 | $1815.90 |
| live | monthly | cancelled | 5 | $101.70 |
| live | one-time | active | 7 | $880.04 |
| live | one-time | completed | 4 | $438.94 |
| test | monthly | active | 3 | $60.00 |

**Active recurring (monthly) sponsorships: 48 live ($1,815.90/mo), 3 test.**

### Marketplace orders by month (created_at)
| Month | Mode | All orders | All amount | Non-pending/non-cancelled | Amount |
|---|---|---|---|---|---|
| 2025-12 | live | 1 | $9.62 | 1 | $9.62 |
| 2025-12 | test | 1 | $25.47 | 1 | $25.47 |
| 2026-01 | live | 11 | $223.81 | 2 | $20.61 |
| 2026-04 | live | 1 | $40.19 | 0 | $0.00 |
| 2026-05 | live | 3 | $122.73 | 1 | $40.91 |
| 2026-05 | test | 3 | $26.00 | 0 | $0.00 |
| 2026-07 | live | 1 | $38.38 | 0 | $0.00 |

No orders recorded Feb–Mar, Jun, Aug–Oct 2026. Bike pledges and Night of Joy amounts: see row counts in section 4 (no single amount column comparable to the above; not totalled).

## 6. Edge functions
- 231 function folders exist in the codebase.
- Invocation counts: **could not be measured** — the log analytics source returned zero rows for every source/window tried (1, 7 and 90 days), so no per-function counts or zero-invocation list can be stated from logs.
- Indirect evidence: the 16 functions targeted by cron jobs in section 1 ran within the last day/week per cron.job_run_details.

## 7. Storage
| Bucket | Visibility | Objects | Total size |
|---|---|---|---|
| album-images | public | 738 | 1166 MB |
| app-assets | public | 2333 | 2480 MB |
| audio-clips | public | 148 | 3.1 MB |
| avatar-celebration-images | public | 174 | 223 MB |
| avatars | public | 1 | 607 kB |
| badge-images | public | 0 | 0 |
| beat-pad-audio | public | 4 | 12 MB |
| contact-reply-attachments | private | 6 | 12 kB |
| currency-images | public | 10 | 61 MB |
| daily-bar-icons | public | 5 | 17 MB |
| discussion-images | public | 12 | 12 MB |
| drink-images | public | 92 | 62 MB |
| event-audio | public | 1 | 210 kB |
| event-images | public | 56 | 64 MB |
| featured-bestie-audio | private | 2 | 152 kB |
| featured-bestie-images | public | 33 | 48 MB |
| game-assets | public | 632 | 680 MB |
| guardian-resources | public | 2 | 153 kB |
| joy-house-stores | public | 9 | 15 MB |
| newsletter-images | public | 0 | 0 |
| prayer-images | public | 3 | 23 MB |
| profile-avatars | public | 0 | 0 |
| recipe-images | public | 175 | 128 MB |
| sticker-images | public | 378 | 406 MB |
| videos | public | 53 | 1858 MB |
| workout-images | public | 114 | 153 MB |

Total ≈ 7.4 GB across 26 buckets (videos + app-assets + album-images ≈ 74%).

## 8. Database linter (213 findings, 7 types)
| Severity | Type | Count |
|---|---|---|
| ERROR | Security Definer View | 1 |
| WARN | Signed-in users can execute SECURITY DEFINER function | 103 |
| WARN | Public (anon) can execute SECURITY DEFINER function | 101 |
| WARN | Function search_path mutable | 4 |
| WARN | Extension in public schema | 1 |
| WARN | Leaked password protection disabled | 1 |
| INFO | RLS enabled, no policy | 2 |

## 9. Drift (live vs supabase/migrations [758 files] + drizzle/migrations [10 files])
Method: name search of each live object in the combined migration text.
- **Cron jobs not in migrations: 11 of 17** — reconcile-donations-hourly, send-daily-digest-emails, send-weekly-digest-emails, reconcile-marketplace-orders-job, process-event-email-queue-job, process-event-update-email-queue-job, generate-wordle-word-daily, sync-newsletter-analytics-hourly, reconcile-bike-pledges-hourly, reconcile-sponsorships-hourly, process-newsletter-queue-every-minute (created via direct SQL).
- **Reverse drift:** config.toml declares schedules for functions that have no live cron job (see section 1).
- **Public RLS policies not found by name: 7 of 774** — 6 on sponsor_bestie_requests, 1 on moderation_settings.
- Public functions (112): all found in migrations.
- Storage buckets (26): all names found in migrations.
- Storage policies (109): all names found in migrations.

## Could not measure
- Edge function invocation counts / zero-invocation list — log analytics returned no rows.
- Cron failure reason for job 12 — only status checked; message not read to avoid exposing content.
- Cron history older than 8 days — the run-history table is too large to scan without timing out.
- Drift is name-based: an object with a matching name but altered definition would not be flagged.
- Per-user activity for tables without a user column, and any activity that isn't logged as rows.
