-- Performance indexes for key tables

-- Notifications - frequently queried by user_id and is_read
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Discussion posts - frequently queried for moderated posts
CREATE INDEX IF NOT EXISTS idx_discussion_posts_moderated ON public.discussion_posts(is_moderated, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_author ON public.discussion_posts(author_id);

-- Discussion comments - frequently queried by post_id
CREATE INDEX IF NOT EXISTS idx_discussion_comments_post ON public.discussion_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_author ON public.discussion_comments(author_id);

-- Sponsorships - frequently queried by status and bestie
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON public.sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_bestie ON public.sponsorships(sponsor_bestie_id, status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor ON public.sponsorships(sponsor_id);

-- Orders - frequently queried by user and status  
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- Products - frequently queried by vendor and active status
CREATE INDEX IF NOT EXISTS idx_products_vendor_active ON public.products(vendor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Contact form submissions - frequently filtered by status
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_form_submissions(status, created_at DESC);

-- Albums - frequently queried by active status
CREATE INDEX IF NOT EXISTS idx_albums_active_public ON public.albums(is_active, is_public);

-- Profiles - frequently searched by display name
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Caregiver bestie links - frequently queried by both sides
CREATE INDEX IF NOT EXISTS idx_caregiver_links_bestie ON public.caregiver_bestie_links(bestie_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_links_caregiver ON public.caregiver_bestie_links(caregiver_id);