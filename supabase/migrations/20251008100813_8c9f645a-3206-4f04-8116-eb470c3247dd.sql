-- Update Community Page Tour with correct targets
UPDATE public.help_tours 
SET steps = '[
  {
    "target": "body",
    "title": "Welcome to the Community! 👋",
    "content": "Let me show you around the community page. Click Next to continue.",
    "placement": "center",
    "disableBeacon": true
  },
  {
    "target": "h1",
    "title": "Community Hub",
    "content": "This is your main community hub where you can see featured content, discussions, and events!",
    "placement": "bottom"
  },
  {
    "target": ".grid.grid-cols-1.lg\\:grid-cols-2",
    "title": "Latest Activity",
    "content": "Check out recent discussions and upcoming events. Click on any card to see more details!",
    "placement": "top"
  }
]'::jsonb,
duration_minutes = 2
WHERE title = 'Community Page Tour';