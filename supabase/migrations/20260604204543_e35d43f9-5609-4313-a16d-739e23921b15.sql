UPDATE public.featured_items
SET link_url = '/bike-rides/' || substring(link_url from length('/bike-ride/') + 1)
WHERE link_url LIKE '/bike-ride/%';