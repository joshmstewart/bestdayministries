-- Create Guardian Tour for caregivers
INSERT INTO public.help_tours (
  id,
  title,
  description,
  category,
  icon,
  duration_minutes,
  required_route,
  visible_to_roles,
  steps,
  display_order,
  is_active
) VALUES (
  '1a2b3c4d-e5f6-4789-a012-345678901234',
  'Guardian Dashboard Guide',
  'Learn how to manage your linked besties, approve their content, and oversee sponsorships as a guardian',
  'getting-started',
  'Users',
  8,
  '/guardian-links',
  ARRAY['caregiver']::user_role[],
  '[
    {
      "target": "[data-tour-target=\"bestie-links\"]",
      "title": "Welcome, Guardian!",
      "content": "As a guardian, you have powerful tools to support and protect your linked besties. Let''s explore your dashboard!",
      "disableBeacon": true,
      "placement": "center"
    },
    {
      "target": "[data-tour-target=\"add-bestie-link\"]",
      "title": "Link a Bestie",
      "content": "Start by linking a bestie using their unique 3-emoji friend code. This creates a secure connection that lets you manage their content and settings.",
      "placement": "bottom"
    },
    {
      "target": "[data-tour-target=\"linked-besties-list\"]",
      "title": "Your Linked Besties",
      "content": "See all your linked besties here. Each card shows their profile, relationship to you, and gives you access to manage their approval settings and featured posts.",
      "placement": "top"
    },
    {
      "target": "[data-tour-target=\"sponsorships\"]",
      "title": "Sponsorships",
      "content": "If you sponsor any besties, you''ll see them here. You can view their progress, send messages, manage your subscription, and share access with other besties.",
      "placement": "top"
    },
    {
      "target": "a[href=\"/guardian-approvals\"]",
      "title": "Approval Center",
      "content": "The Approvals button in the header takes you to your approval hub where you can review posts, comments, vendor requests, and messages from your linked besties.",
      "placement": "bottom"
    },
    {
      "target": "[data-tour-target=\"approvals-header\"]",
      "title": "Pending Approvals",
      "content": "This is your approval center. All content from your linked besties that requires your review will appear here.",
      "placement": "bottom"
    },
    {
      "target": "[data-tour-target=\"approval-tabs-list\"]",
      "title": "Approval Categories",
      "content": "Content is organized into four categories: Posts (discussion posts), Comments (on posts), Vendor Links (vendor partnership requests), and Messages (messages to sponsors).",
      "placement": "bottom"
    },
    {
      "target": "[data-tour-target=\"posts-tab\"]",
      "title": "Post Approvals",
      "content": "Review discussion posts from your besties. You can approve them to make them public, or reject them if needed. Red badges show how many items need review.",
      "placement": "bottom"
    },
    {
      "target": "[data-tour-target=\"comments-tab\"]",
      "title": "Comment Approvals",
      "content": "Review comments your besties want to post on community discussions. Audio comments are supported too!",
      "placement": "bottom"
    },
    {
      "target": "[data-tour-target=\"vendors-tab\"]",
      "title": "Vendor Link Approvals",
      "content": "When vendors want to feature your bestie in their store, you''ll review and approve those requests here to protect your bestie.",
      "placement": "bottom"
    },
    {
      "target": "[data-tour-target=\"messages-tab\"]",
      "title": "Message Approvals",
      "content": "Review messages your besties want to send to their sponsors. You can approve as-is, edit before approving, or reject messages.",
      "placement": "bottom"
    },
    {
      "target": "footer",
      "title": "Guardian Tour Complete!",
      "content": "You now know how to manage your linked besties, review their content, and keep them safe. Click around to explore more features!",
      "placement": "top"
    }
  ]'::jsonb,
  2,
  true
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  duration_minutes = EXCLUDED.duration_minutes,
  required_route = EXCLUDED.required_route,
  visible_to_roles = EXCLUDED.visible_to_roles,
  steps = EXCLUDED.steps,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();