-- Insert default Help Center content for Best Day Ever application

-- ============================================
-- FAQs - General Questions
-- ============================================

INSERT INTO public.help_faqs (question, answer, category, target_audience, display_order, is_active) VALUES
('What is Best Day Ever?', 'Best Day Ever is a community platform that connects besties (individuals with special needs), their caregivers (guardians), supporters, and local vendors. Our mission is to create meaningful connections, celebrate our community, and provide opportunities for growth and support.', 'general', 'all', 1, true),

('How do I create an account?', 'Click the "Sign Up" button in the top right corner. You''ll need to provide your email address, create a password, and choose your role (Supporter, Bestie, Guardian, or Vendor). After signing up, you can customize your profile with a display name and avatar.', 'general', 'all', 2, true),

('What are the different user roles?', 'There are five main roles: **Besties** - community members with special needs, **Guardians** - caregivers who support besties, **Supporters** - community members who want to help, **Vendors** - local businesses offering products/services, and **Admins** - platform administrators. Each role has different features and permissions.', 'general', 'all', 3, true),

('How do I change my profile settings?', 'Click on your profile picture in the top right corner, then select "Settings". Here you can update your display name, choose a new avatar, change your text-to-speech voice, update your password, and manage notification preferences.', 'general', 'all', 4, true),

('What is a Friend Code?', 'A Friend Code is a unique 3-emoji combination that helps you connect with others. Guardians use friend codes to link with their besties, and vendors use them to request connections. You can regenerate your friend code anytime in your profile settings.', 'general', 'all', 5, true);

-- ============================================
-- FAQs - For Guardians
-- ============================================

INSERT INTO public.help_faqs (question, answer, category, target_audience, display_order, is_active) VALUES
('How do I link with a bestie?', 'Go to "My Besties" and click "Add Link". Enter the bestie''s 3-emoji friend code, describe your relationship, and set approval preferences. Once linked, you can manage their posts, comments, featured profiles, and sponsor messages.', 'guardian', 'caregiver', 10, true),

('What are approval settings?', 'When linking with a bestie, you can require approval for posts, comments, featured profiles, and sponsor messages. This gives you control over what content your bestie shares publicly while encouraging their independence.', 'guardian', 'caregiver', 11, true),

('How do I approve content?', 'Click the "Approvals" button in the header (you''ll see a red badge if there''s content waiting). Review pending posts, comments, vendor connections, and messages. You can approve as-is, edit before approving, or reject with a reason.', 'guardian', 'caregiver', 12, true),

('Can I create a Featured Bestie profile?', 'Yes! Go to "My Besties", select your linked bestie, and click "Create Featured Profile". Upload a photo, record a voice message, write a description, and set display preferences. The profile will appear on the community page after approval.', 'guardian', 'caregiver', 13, true),

('How does sponsor messaging work?', 'When someone sponsors your linked bestie, they may receive thank-you messages. If message approval is required, you''ll review them in the Approvals section. You can edit messages, add photos, or send them as-is.', 'guardian', 'caregiver', 14, true);

-- ============================================
-- FAQs - For Besties
-- ============================================

INSERT INTO public.help_faqs (question, answer, category, target_audience, display_order, is_active) VALUES
('How do I share in Discussions?', 'Click "Discussions" in the navigation menu, then "Create Post". Add a title, description, and optionally photos, videos, or link to events. Your post may require guardian approval before appearing publicly, depending on your settings.', 'bestie', 'bestie', 20, true),

('How can I thank my sponsors?', 'Go to "Messages" to send audio or text messages to people who sponsor you. Record a voice message or type a thank-you note. Messages may require guardian approval before being sent.', 'bestie', 'bestie', 21, true),

('What is My Besties page?', 'The "My Besties" page shows people who sponsor you and sponsorships shared with you. You can view their messages, see funding progress, and send thank-you notes.', 'bestie', 'bestie', 22, true),

('Can I see who views my profile?', 'Featured bestie profiles show view counts but not individual viewers for privacy. You can see messages from sponsors and total funding progress if sponsorships are enabled.', 'bestie', 'bestie', 23, true),

('How do I change my friend code?', 'Go to Settings and click "Regenerate Friend Code". Your existing connections will remain - the code only affects new connection requests.', 'bestie', 'bestie', 24, true);

-- ============================================
-- FAQs - For Supporters
-- ============================================

INSERT INTO public.help_faqs (question, answer, category, target_audience, display_order, is_active) VALUES
('How do I sponsor a bestie?', 'Click "Sponsor" in the navigation menu to see available besties. Choose someone to support, select a one-time or monthly amount (minimum $10), and complete checkout. You can sponsor without creating an account!', 'supporter', 'supporter', 30, true),

('What happens after I sponsor?', 'You''ll receive a confirmation email with a tax receipt. If you created an account, visit "My Besties" to view your sponsorships, receive messages from besties, and manage your subscription through Stripe.', 'supporter', 'supporter', 31, true),

('Can I update my sponsorship amount?', 'Yes! For monthly sponsorships, go to "My Besties", click on the sponsorship, and select "Update Amount". You can change it anytime between $10-$500/month.', 'supporter', 'supporter', 32, true),

('How do I cancel a monthly sponsorship?', 'Go to "My Besties", click on the sponsorship, and select "Manage Subscription". This opens the Stripe portal where you can cancel, update payment methods, or view history. Cancellations take effect at the end of your billing period.', 'supporter', 'supporter', 33, true),

('What is the General Fund?', 'The General Fund supports the overall Best Day Ever mission. Donations help with operational costs, events, programs, and supporting multiple besties. Click "Support Us" to contribute to the General Fund.', 'supporter', 'supporter', 34, true),

('Are donations tax-deductible?', 'Yes! You''ll receive an automated tax receipt via email after each donation. At year-end, we send a summary of all your donations for tax filing purposes. Best Day Ever is a registered nonprofit organization.', 'supporter', 'supporter', 35, true);

-- ============================================
-- FAQs - For Vendors
-- ============================================

INSERT INTO public.help_faqs (question, answer, category, target_audience, display_order, is_active) VALUES
('How do I become a vendor?', 'Click "Become a Vendor" on the marketplace page. Complete the application with your business information. Admin will review your application, typically within 2-3 business days.', 'vendor', 'vendor', 40, true),

('What can I sell on the marketplace?', 'Official merchandise, handmade items, services, and products that align with our community values. Items should be appropriate for all ages and support our mission of inclusivity and celebration.', 'vendor', 'vendor', 41, true),

('How do I add products?', 'In your Vendor Dashboard, go to the Products tab and click "Add Product". Include clear photos, descriptions, pricing, inventory count, and categories. Products appear in the marketplace once approved.', 'vendor', 'vendor', 42, true),

('How does payment work?', 'Connect your Stripe account in Vendor Settings. When customers purchase your products, funds transfer to your account automatically after a 10% platform commission. You can view earnings and transaction history in your dashboard.', 'vendor', 'vendor', 43, true),

('How do I fulfill orders?', 'View orders in the Orders tab of your dashboard. When you ship an item, mark it as "Shipped" and add tracking information. Customers receive automatic notifications and can track their orders.', 'vendor', 'vendor', 44, true),

('Can I feature a bestie on my store?', 'Yes! Request a connection using the bestie''s 3-emoji friend code in your Vendor Dashboard. Once approved by their guardian, you can feature one bestie profile on your vendor page to show community support.', 'vendor', 'vendor', 45, true);

-- ============================================
-- GUIDES - Getting Started
-- ============================================

INSERT INTO public.help_guides (title, description, content, category, target_audience, icon, display_order, reading_time_minutes, is_active) VALUES
('Welcome to Best Day Ever', 'Learn the basics of our community platform', E'# Welcome to Best Day Ever! 🎉\n\nWelcome to our inclusive community platform! This guide will help you get started.\n\n## What Makes Us Special\n\nBest Day Ever is more than a platform - it''s a community celebrating individuals with special needs, their caregivers, and supporters who believe every day can be the best day ever.\n\n## Key Features\n\n### For Everyone\n- **Discussions** - Share stories, photos, and updates\n- **Events** - Discover and register for community events\n- **Gallery** - Browse photo albums from our community\n- **Support Us** - Make donations to support our mission\n\n### Role-Specific Features\n- **Guardians** - Manage bestie profiles, approve content, view sponsorships\n- **Besties** - Create posts, send messages to sponsors, participate in events\n- **Supporters** - Sponsor besties, receive updates, engage with content\n- **Vendors** - Sell products, feature besties, connect with the community\n\n## Getting Started\n\n1. **Complete Your Profile** - Add a display name and choose an avatar\n2. **Explore the Community** - Browse discussions and events\n3. **Make Connections** - Use friend codes to connect with others\n4. **Get Involved** - Share content, attend events, or offer support\n\n## Need Help?\n\nUse the Help icon (?) in the navigation bar to access FAQs, guides, and tutorials anytime. You can also contact us through the Support page.\n\nLet''s make every day the best day ever! 🌟', 'general', 'all', 'Sparkles', 1, 5, true),

('Creating Your Profile', 'Customize your account and preferences', E'# Creating Your Profile\n\nYour profile is how you present yourself to the community. Let''s make it uniquely you!\n\n## Display Name\n\nYour display name appears on all your posts, comments, and interactions. Choose something that reflects your personality while being appropriate for our all-ages community.\n\n**To update:**\n1. Click your profile picture (top right)\n2. Select "Settings"\n3. Update "Display Name"\n4. Click "Update Profile"\n\n## Choosing an Avatar\n\nWe offer a variety of fun, inclusive avatars instead of photos to maintain privacy and create a welcoming environment.\n\n**To change your avatar:**\n1. Go to Settings\n2. Click "Choose Avatar"\n3. Browse available options\n4. Select your favorite and save\n\n## Text-to-Speech Voice\n\nMany posts include audio narration. Choose a voice you enjoy listening to!\n\n**Available voices:**\n- Austin, Batman, Marshal (male voices)\n- Cherry Twinkle (female voice)\n- Creature, Johnny Dynamite (character voices)\n- Grandma Muffin, Grandpa Werthers (elder voices)\n- Jerry B, Maverick (additional options)\n\n**To select:**\n1. Settings → Text-to-Speech Voice\n2. Try each voice with the preview button\n3. Save your favorite\n\n## Friend Code\n\nYour friend code is three emojis that others use to connect with you. It''s like a password for making connections!\n\n**Uses:**\n- Guardians link with besties\n- Vendors request connections\n- Sponsors share access\n\n**To regenerate:**\n1. Settings → Friend Code\n2. Click "Generate New Code"\n3. Share your new code as needed\n\n*Note: Regenerating doesn''t break existing connections.*\n\n## Notification Preferences\n\nCustomize which notifications you receive:\n\n1. Settings → Notifications\n2. Toggle email and in-app notifications\n3. Choose digest frequency (instant, daily, weekly)\n4. Save preferences\n\n## Privacy & Security\n\n- **Change Password:** Settings → Security → Change Password\n- **Review Sessions:** See active login sessions\n- **Two-Factor:** Coming soon!\n\nYour privacy and safety are our top priorities. Never share your password with anyone, including admins.', 'general', 'all', 'User', 2, 8, true);

-- ============================================
-- GUIDES - For Guardians
-- ============================================

INSERT INTO public.help_guides (title, description, content, category, target_audience, icon, display_order, reading_time_minutes, is_active) VALUES
('Guardian Guide: Linking with Besties', 'Learn how to create and manage bestie connections', E'# Guardian Guide: Linking with Besties\n\nAs a guardian, you support your bestie''s independence while ensuring their safety. Here''s how to create and manage connections.\n\n## Getting the Friend Code\n\nFirst, you''ll need your bestie''s 3-emoji friend code. They can find it in their Settings page. The code looks like: 🌟🌈🔥 (three emojis).\n\n## Creating a Link\n\n1. Click "My Besties" in the header\n2. Click "Add Link"\n3. Enter the 3-emoji friend code\n4. Describe your relationship (e.g., "Parent", "Sibling", "Caregiver")\n5. Configure approval settings\n6. Click "Create Link"\n\n## Approval Settings Explained\n\n### Post Approval\n- **Enabled:** You review all discussion posts before they''re public\n- **Disabled:** Posts appear immediately (you can still edit/delete)\n\n*Recommendation: Enable initially, disable as they gain experience*\n\n### Comment Approval\n- **Enabled:** You review comments before posting\n- **Disabled:** Comments post immediately\n\n*Recommendation: Usually safe to disable*\n\n### Message Approval\n- **Enabled:** You review sponsor messages before sending\n- **Disabled:** Messages send immediately\n\n*Recommendation: Keep enabled for safety*\n\n### Featured Posts\n- **Enabled:** Bestie can create featured profiles\n- **Disabled:** Only you can create featured profiles\n\n*Recommendation: Enable with post approval*\n\n## Managing Multiple Besties\n\nYou can link with multiple besties. Each has independent approval settings, so you can customize based on their needs and experience level.\n\n## Modifying Settings\n\n1. Go to "My Besties"\n2. Find the bestie''s card\n3. Click the settings icon\n4. Update approval preferences\n5. Save changes\n\n## Unlinking\n\nIf needed, you can remove a connection:\n\n1. "My Besties" → Select bestie\n2. Click "Unlink"\n3. Confirm the action\n\n*Note: Existing posts/profiles remain visible. Only future content is affected.*\n\n## Best Practices\n\n✅ Start with stricter approval settings\n✅ Gradually increase independence as they learn\n✅ Regular check-ins even with approvals disabled\n✅ Praise good choices and guide through mistakes\n✅ Focus on teaching, not just protecting\n\n❌ Don''t over-edit their authentic voice\n❌ Don''t reject without explaining why\n❌ Don''t make them feel controlled\n\nYour role is to guide, not control. The goal is their growth and independence! 🌱', 'guardian', 'caregiver', 'Users', 10, 10, true),

('Approving Content', 'Review and approve bestie posts, comments, and messages', E'# Approving Content\n\nThe Approvals hub is where you review content from linked besties. It''s designed to be quick and efficient while maintaining safety.\n\n## Accessing Approvals\n\nClick "Approvals" in the header. You''ll see a red badge with the count of pending items.\n\n## Four Approval Types\n\n### 1. Posts\nDiscussion posts waiting for review.\n\n**Actions:**\n- **Approve** - Post becomes public immediately\n- **Reject** - Provide a reason why (educate, don''t just block)\n- **Delete** - Remove entirely (use sparingly)\n\n**What to check:**\n- Appropriate language and content\n- No personal information (addresses, phone numbers)\n- Photos are appropriate\n- Tone is respectful\n\n### 2. Comments\nReplies to discussion posts.\n\n**Actions:**\n- **Approve** - Comment appears\n- **Reject** - Give feedback\n\n**What to check:**\n- Respectful communication\n- On-topic to the discussion\n- No bullying or negativity\n\n### 3. Vendor Connections\nVendors requesting to feature your bestie.\n\n**Actions:**\n- **Approve** - Vendor can feature them\n- **Reject** - Connection denied\n\n**What to check:**\n- Vendor is legitimate\n- Products/services are appropriate\n- Your bestie is comfortable\n\n### 4. Messages\nThank-you messages to sponsors.\n\n**Actions:**\n- **Approve As-Is** - Send unchanged\n- **Edit & Approve** - Modify before sending\n- **Reject** - Provide feedback\n\n**Edit options:**\n- Change subject line\n- Modify message text\n- Add or replace photo\n- Crop existing photo\n\n**What to check:**\n- Appropriate tone\n- Gratitude is expressed\n- No requests for more money\n- Photo is appropriate\n\n## Editing Messages\n\nWhen you choose "Edit & Approve":\n\n1. Dialog opens with current content\n2. Edit subject and/or message\n3. Click "Add Image" to include a photo\n4. Use aspect ratio buttons to resize\n5. Preview final version\n6. Click "Approve & Send"\n\nThe message shows it''s "From Guardian" so sponsors know it was reviewed.\n\n## Rejection Best Practices\n\n**Good rejections are educational:**\n\n❌ "This isn''t appropriate"\n✅ "Let''s not include our address - just say ''the neighborhood''. Safety first!"\n\n❌ "No"\n✅ "This photo is too dark to see your smile! Can you retake in better light?"\n\n❌ "Don''t say that"\n✅ "''Thank you so much'' sounds more polite than ''thanks''. Let''s try again!"\n\n**Remember:**\n- Explain the "why"\n- Be encouraging\n- Offer specific solutions\n- Praise what they did well\n\n## Batch Approvals\n\nReviewing multiple items:\n\n1. Review each item individually\n2. Make decisions thoughtfully\n3. Don''t rush - quality matters\n4. Look for learning opportunities\n\n## Notification Settings\n\nControl how you''re notified:\n\n1. Settings → Notifications\n2. Toggle "Pending Approval" alerts\n3. Choose email and/or in-app\n4. Set digest frequency\n\n## Auto-Approval\n\nOnce your bestie consistently posts appropriate content, consider disabling some approval requirements to grant more independence. You can always view and moderate after posting.', 'guardian', 'caregiver', 'CheckCircle', 11, 12, true);

-- ============================================
-- GUIDES - For Supporters
-- ============================================

INSERT INTO public.help_guides (title, description, content, category, target_audience, icon, display_order, reading_time_minutes, is_active) VALUES
('How to Sponsor a Bestie', 'Step-by-step guide to supporting community members', E'# How to Sponsor a Bestie\n\nSponsoring a bestie is a meaningful way to support individuals with special needs in our community. Every contribution makes a difference!\n\n## Why Sponsor?\n\n- **Direct Support** - Funds help with activities, resources, and opportunities\n- **Connection** - Receive personal thank-you messages and updates\n- **Community Impact** - Show that our besties are valued and celebrated\n- **Tax Benefits** - All donations are tax-deductible\n\n## Finding a Bestie to Sponsor\n\n1. Click "Sponsor" in the navigation menu\n2. Browse featured besties in the carousel\n3. Read their stories and interests\n4. Click on profiles to see more details\n5. Listen to their voice messages\n6. Check funding progress bars\n\n**Tip:** Fully funded besties still welcome one-time contributions!\n\n## Sponsorship Options\n\n### One-Time Sponsorship\n- Single donation of any amount ($10 minimum)\n- Perfect for celebrating milestones\n- Great if you''re trying out sponsorship\n- No ongoing commitment\n\n### Monthly Sponsorship\n- Recurring monthly donation ($10-$500)\n- Predictable support for planning\n- Strongest community impact\n- Easy to modify or cancel\n- Counts toward funding goals\n\n## The Sponsorship Process\n\n1. **Choose Amount**\n   - Enter amount ($10 minimum)\n   - Default is $25/month\n   - Consider covering Stripe fees (optional)\n\n2. **Select Frequency**\n   - One-time or Monthly\n   - Monthly sponsorships are highlighted\n\n3. **Enter Email**\n   - Auto-filled if logged in\n   - Can sponsor as a guest\n   - Email used for receipts and updates\n\n4. **Complete Checkout**\n   - Secure payment via Stripe\n   - Save payment method for future\n   - Receive immediate confirmation\n\n5. **Get Receipt**\n   - Emailed instantly\n   - Tax-deductible receipt\n   - Unique receipt number\n\n## Guest Sponsorship\n\nNo account required! If you sponsor as a guest:\n\n- Use any email address\n- Receive all receipts and updates\n- If you later create account with same email, sponsorships auto-link\n- Access full features by creating account\n\n## After Sponsoring\n\n### Immediate Benefits\n- Tax receipt via email\n- Access to "My Besties" page\n- See all your sponsorships\n- Receive bestie messages\n- View funding progress\n\n### Managing Your Sponsorship\n\n**To update monthly amount:**\n1. Go to "My Besties"\n2. Click on sponsorship\n3. Select "Update Amount"\n4. Enter new amount ($10-$500)\n5. Confirm changes\n\n**To manage subscription:**\n1. "My Besties" → Select sponsorship\n2. Click "Manage Subscription"\n3. Opens Stripe portal\n4. Update payment method, cancel, or view history\n\n**To cancel:**\n- Cancellation takes effect end of billing period\n- You''re not charged again\n- Still have access until period ends\n- Can reactivate anytime\n\n## Receiving Messages\n\nBesties may send thank-you messages:\n\n- View in "My Besties"\n- Messages include text and/or audio\n- Sometimes include photos\n- All messages guardian-approved\n- Marked as read when you open\n\n**You cannot reply directly** - messages are one-way gratitude expressions.\n\n## Sharing Your Sponsorship\n\nYou can share view-only access:\n\n1. "My Besties" → Select sponsorship\n2. Click "Share View"\n3. Enter friend''s 3-emoji code\n4. They see sponsorship (read-only)\n\n## Tax Information\n\n- All donations are tax-deductible\n- Instant receipt after each payment\n- Year-end summary sent in January\n- Includes total giving and itemized list\n- EIN included for tax filing\n\n## Multiple Sponsorships\n\nYou can sponsor multiple besties! Each has independent messaging and management. Your "My Besties" page shows all sponsorships in one place.\n\n## Questions?\n\nContact us through the Support page or email receipts@bestdayever.org with your receipt number.', 'supporter', 'supporter', 'Heart', 20, 15, true);

-- ============================================
-- TOURS - Interactive Walkthroughs
-- ============================================

INSERT INTO public.help_tours (title, description, category, target_audience, icon, display_order, duration_minutes, steps, is_active) VALUES
('Community Page Tour', 'Explore the main community hub', 'general', 'all', 'Compass', 1, 3, 
'[
  {
    "target": "body",
    "title": "Welcome to the Community! 👋",
    "content": "Let me show you around the community page. Click Next to continue.",
    "disableBeacon": true
  },
  {
    "target": ".featured-bestie-section",
    "title": "Featured Bestie",
    "content": "This is our featured bestie of the moment! You can see their photo, listen to their voice message, and learn about their interests. Click the heart to show support!",
    "placement": "bottom"
  },
  {
    "target": ".discussions-preview",
    "title": "Latest Discussions",
    "content": "Check out recent posts from our community. Click ''View All'' to see the full discussion board and join the conversation!",
    "placement": "top"
  },
  {
    "target": ".events-preview",
    "title": "Upcoming Events",
    "content": "See what events are coming up! From social gatherings to workshops, there''s always something happening. Click an event to learn more and register.",
    "placement": "top"
  },
  {
    "target": ".quick-links-section",
    "title": "Quick Links",
    "content": "These shortcuts help you navigate to popular pages quickly. Perfect for finding what you need fast!",
    "placement": "top"
  }
]'::jsonb, true),

('Creating a Post', 'Learn how to share in discussions', 'bestie', 'bestie', 'MessageSquare', 2, 2,
'[
  {
    "target": "body",
    "title": "Share Your Story! ✨",
    "content": "Let me show you how to create a discussion post. Click Next to start.",
    "disableBeacon": true
  },
  {
    "target": ".create-post-button",
    "title": "Create Post Button",
    "content": "Click this button anytime you want to share something with the community. It''s that easy!",
    "placement": "bottom"
  },
  {
    "target": ".post-title-input",
    "title": "Post Title",
    "content": "Give your post a catchy title! Make it clear and interesting so people want to read more.",
    "placement": "bottom"
  },
  {
    "target": ".post-content-input",
    "title": "Post Content",
    "content": "Share your story, thoughts, or updates here. You can write as much or as little as you want. Be yourself!",
    "placement": "top"
  },
  {
    "target": ".post-media-upload",
    "title": "Add Media",
    "content": "Want to include photos or videos? Click here to upload from your device. Images make posts more engaging!",
    "placement": "left"
  },
  {
    "target": ".post-category-select",
    "title": "Choose Category",
    "content": "Pick a category that fits your post. This helps others find content they''re interested in.",
    "placement": "top"
  },
  {
    "target": ".post-submit-button",
    "title": "Publish Your Post",
    "content": "When you''re ready, click here! If approval is required, your guardian will review it first. Otherwise, it posts immediately.",
    "placement": "top"
  }
]'::jsonb, true),

('Vendor Dashboard Tour', 'Navigate your vendor dashboard', 'vendor', 'vendor', 'Store', 3, 4,
'[
  {
    "target": "body",
    "title": "Welcome to Your Dashboard! 🏪",
    "content": "Let me give you a tour of your vendor dashboard. This is your business command center!",
    "disableBeacon": true
  },
  {
    "target": ".dashboard-stats",
    "title": "Business Stats",
    "content": "See your active products, monthly sales, and pending orders at a glance. These update in real-time!",
    "placement": "bottom"
  },
  {
    "target": ".products-tab",
    "title": "Products Tab",
    "content": "Manage your product catalog here. Add new items, update prices, adjust inventory, and toggle visibility.",
    "placement": "right"
  },
  {
    "target": ".orders-tab",
    "title": "Orders Tab",
    "content": "View and fulfill customer orders. Mark items as shipped, add tracking numbers, and manage delivery status.",
    "placement": "right"
  },
  {
    "target": ".earnings-tab",
    "title": "Earnings Tab",
    "content": "Track your revenue! See total earnings, platform fees, and payout information. Connect Stripe here for automatic payments.",
    "placement": "right"
  },
  {
    "target": ".settings-tab",
    "title": "Settings Tab",
    "content": "Update your business profile, connect with besties using friend codes, and manage your Stripe account.",
    "placement": "right"
  }
]'::jsonb, true);