-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('bestie', 'caregiver', 'supporter', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  audio_notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create caregiver_bestie_links table (for linking parents to besties)
CREATE TABLE public.caregiver_bestie_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bestie_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(caregiver_id, bestie_id)
);

-- Create featured_besties table
CREATE TABLE public.featured_besties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestie_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  voice_note_url TEXT,
  description TEXT NOT NULL,
  featured_month DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create hearts table for featured besties
CREATE TABLE public.featured_bestie_hearts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  featured_bestie_id UUID NOT NULL REFERENCES public.featured_besties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(featured_bestie_id, user_id)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  max_attendees INTEGER,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create event_attendees table
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create sponsorships table
CREATE TABLE public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bestie_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2),
  frequency TEXT, -- 'one-time', 'monthly', 'yearly'
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create discussion_posts table
CREATE TABLE public.discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_moderated BOOLEAN DEFAULT FALSE,
  moderation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create discussion_comments table
CREATE TABLE public.discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_moderated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_bestie_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_besties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_bestie_hearts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (users can view all profiles, but only edit their own)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for caregiver_bestie_links
CREATE POLICY "Links viewable by caregiver or bestie"
  ON public.caregiver_bestie_links FOR SELECT
  USING (auth.uid() = caregiver_id OR auth.uid() = bestie_id);

CREATE POLICY "Caregivers can create links"
  ON public.caregiver_bestie_links FOR INSERT
  WITH CHECK (auth.uid() = caregiver_id);

CREATE POLICY "Caregivers can delete their links"
  ON public.caregiver_bestie_links FOR DELETE
  USING (auth.uid() = caregiver_id);

-- RLS Policies for featured_besties (viewable by all, manageable by admins)
CREATE POLICY "Featured besties viewable by everyone"
  ON public.featured_besties FOR SELECT
  USING (true);

-- RLS Policies for hearts
CREATE POLICY "Hearts viewable by everyone"
  ON public.featured_bestie_hearts FOR SELECT
  USING (true);

CREATE POLICY "Users can add hearts"
  ON public.featured_bestie_hearts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their hearts"
  ON public.featured_bestie_hearts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY "Events viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Event creators can update their events"
  ON public.events FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS Policies for event_attendees
CREATE POLICY "Attendees viewable by everyone"
  ON public.event_attendees FOR SELECT
  USING (true);

CREATE POLICY "Users can register for events"
  ON public.event_attendees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their registration"
  ON public.event_attendees FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sponsorships
CREATE POLICY "Sponsorships viewable by sponsor or bestie"
  ON public.sponsorships FOR SELECT
  USING (auth.uid() = sponsor_id OR auth.uid() = bestie_id);

CREATE POLICY "Users can create sponsorships"
  ON public.sponsorships FOR INSERT
  WITH CHECK (auth.uid() = sponsor_id);

-- RLS Policies for discussion posts
CREATE POLICY "Posts viewable by everyone"
  ON public.discussion_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.discussion_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts"
  ON public.discussion_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts"
  ON public.discussion_posts FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for comments
CREATE POLICY "Comments viewable by everyone"
  ON public.discussion_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.discussion_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments"
  ON public.discussion_comments FOR DELETE
  USING (auth.uid() = author_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.discussion_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'supporter')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();