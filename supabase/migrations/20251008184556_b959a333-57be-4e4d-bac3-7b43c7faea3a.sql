
-- Update the Community Page Tour to be a comprehensive Welcome Tour
UPDATE help_tours 
SET 
  title = 'Welcome to Best Day Ministries',
  description = 'Take a guided tour of your community homepage and discover all the ways to connect, share, and grow with our community',
  category = 'getting-started',
  duration_minutes = 5,
  steps = '[
    {
      "target": "[data-tour-target=\"welcome-section\"]",
      "content": "Welcome! This is your personalized community hub where you can stay connected with everything happening at Best Day Ministries.",
      "title": "Welcome Home!",
      "placement": "bottom",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"navigation-bar\"]",
      "content": "Use the navigation bar to explore different areas: Discussions, Events, Gallery, Marketplace, and more. You can always find your way around from here.",
      "title": "Navigation Bar",
      "placement": "bottom",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"featured-item\"]",
      "content": "Stay informed with featured announcements, upcoming events, and important updates. These rotate automatically, or use the arrows to browse.",
      "title": "Featured Updates",
      "placement": "bottom",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"latest-discussion\"]",
      "content": "See the latest posts from community members. Join conversations, share your thoughts, and stay connected with what matters most.",
      "title": "Latest Discussions",
      "placement": "top",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"upcoming-events\"]",
      "content": "Never miss an event! View upcoming activities, RSVP, and get location details. Click any event to learn more or add it to your calendar.",
      "title": "Upcoming Events",
      "placement": "top",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"quick-links\"]",
      "content": "Quick access to important pages and features. These shortcuts help you navigate to frequently used areas with just one click.",
      "title": "Quick Links",
      "placement": "top",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"featured-bestie\"]",
      "content": "Meet our featured Besties! Learn about their stories, see their funding progress, and discover how you can support them.",
      "title": "Featured Besties",
      "placement": "top",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"sponsor-bestie\"]",
      "content": "Make a direct impact by sponsoring a Bestie. Choose your support level and see exactly how your contribution helps.",
      "title": "Sponsor a Bestie",
      "placement": "top",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"latest-album\"]",
      "content": "Browse our latest photo memories! View albums from recent events and activities. Click any image to see the full gallery.",
      "title": "Latest Album",
      "placement": "top",
      "disableBeacon": true
    },
    {
      "target": "[data-tour-target=\"our-family\"]",
      "content": "Discover our partner organizations and family connections. These organizations work together to support our community.",
      "title": "Our Family Organizations",
      "placement": "top",
      "disableBeacon": true
    },
    {
      "target": "footer",
      "content": "Find helpful links, contact information, and access the Help Center for guides, tours, and FAQs anytime you need assistance.",
      "title": "Help & Support",
      "placement": "top",
      "disableBeacon": true
    }
  ]'::jsonb,
  required_route = '/community',
  visible_to_roles = ARRAY['supporter'::user_role, 'bestie'::user_role, 'caregiver'::user_role, 'admin'::user_role, 'owner'::user_role]
WHERE id = 'ef72d05a-f871-472d-9b3b-0e76f347bd0a';
