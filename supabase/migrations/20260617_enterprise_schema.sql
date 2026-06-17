-- Migration for Extension 2: Enterprise-Grade Systems
-- Date: 2026-06-17

-- 1. Alter profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checklist_progress JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS acceptance_rate DOUBLE PRECISION DEFAULT 0.0;

-- 2. Alter cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS preferred_location TEXT;

-- 3. Add search vector columns and triggers
ALTER TABLE cards ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION cards_trigger_search_vector() RETURNS trigger AS $$
BEGIN
  new.search_vector :=
    to_tsvector('english', coalesce(new.title,'') || ' ' || coalesce(new.description,'') || ' ' || coalesce(array_to_string(new.niche_tags,' '),''));
  RETURN new;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION profiles_trigger_search_vector() RETURNS trigger AS $$
BEGIN
  new.search_vector :=
    to_tsvector('english', coalesce(new.display_name,'') || ' ' || coalesce(new.bio,'') || ' ' || coalesce(new.company_name,'') || ' ' || coalesce(array_to_string(new.niche,' '),''));
  RETURN new;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvectorupdate_cards ON cards;
CREATE TRIGGER tsvectorupdate_cards BEFORE INSERT OR UPDATE ON cards
FOR EACH ROW EXECUTE FUNCTION cards_trigger_search_vector();

DROP TRIGGER IF EXISTS tsvectorupdate_profiles ON profiles;
CREATE TRIGGER tsvectorupdate_profiles BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION profiles_trigger_search_vector();

CREATE INDEX IF NOT EXISTS cards_search_idx ON cards USING gin(search_vector);
CREATE INDEX IF NOT EXISTS profiles_search_idx ON profiles USING gin(search_vector);

-- 4. Create new tables
-- moderation_queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,  -- 'card'|'review'|'message'|'bio'|'portfolio'
  content_id UUID NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  flag_reason TEXT NOT NULL,
  flag_source TEXT,            -- 'auto'|'user_report'|'admin'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','removed','warned')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  variables TEXT[],
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- broadcast_emails
CREATE TABLE IF NOT EXISTS broadcast_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  target_user_ids UUID[],
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- feature_flags
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  enabled_for_roles TEXT[],
  enabled_for_user_ids UUID[],
  description TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- saved_searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_type TEXT CHECK (search_type IN ('influencers','cards','brands')),
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS Policies
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- moderation_queue policies
CREATE POLICY "moderation_queue_admin" ON moderation_queue
  FOR ALL USING (exists (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "moderation_queue_author" ON moderation_queue
  FOR SELECT USING (author_id = auth.uid());
CREATE POLICY "moderation_queue_insert" ON moderation_queue
  FOR INSERT WITH CHECK (true);

-- email_templates policies
CREATE POLICY "email_templates_admin" ON email_templates
  FOR ALL USING (exists (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "email_templates_select" ON email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- broadcast_emails policies
CREATE POLICY "broadcast_emails_admin" ON broadcast_emails
  FOR ALL USING (exists (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- feature_flags policies
CREATE POLICY "feature_flags_admin" ON feature_flags
  FOR ALL USING (exists (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "feature_flags_select" ON feature_flags
  FOR SELECT USING (true);

-- audit_logs policies
CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR SELECT USING (exists (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- push_subscriptions policies
CREATE POLICY "push_subscriptions_owner" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- saved_searches policies
CREATE POLICY "saved_searches_owner" ON saved_searches
  FOR ALL USING (user_id = auth.uid());

-- 6. Performance Query Indexes
CREATE INDEX IF NOT EXISTS cards_brand_id_idx ON cards(brand_id);
CREATE INDEX IF NOT EXISTS cards_status_idx ON cards(status);
CREATE INDEX IF NOT EXISTS cards_created_at_idx ON cards(created_at DESC);
CREATE INDEX IF NOT EXISTS applications_card_id_idx ON applications(card_id);
CREATE INDEX IF NOT EXISTS applications_influencer_id_idx ON applications(influencer_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
CREATE INDEX IF NOT EXISTS messages_room_id_created_idx ON messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_user_id_unread_idx ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profile_views_profile_id_idx ON profile_views(profile_id, viewed_at DESC);

-- 7. Insert default templates and flags if empty
INSERT INTO email_templates (name, subject, html_body, variables)
VALUES 
  ('welcome_brand', 'Welcome to Brand! 🚀', '<p>Hi {{user_name}}, welcome to Brand. Let us build campaigns together!</p>', ARRAY['user_name']),
  ('welcome_influencer', 'Welcome Creator! 🎨', '<p>Hi {{user_name}}, welcome to Brand. Your next collab is waiting!</p>', ARRAY['user_name'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO feature_flags (key, enabled, description)
VALUES 
  ('ai_pitch_assist', true, 'Enable Claude AI assistant for pitches and descriptions'),
  ('direct_invite', true, 'Allow brands to directly invite influencers from directories'),
  ('maintenance_mode', false, 'Lock out non-admin users for system maintenance')
ON CONFLICT (key) DO NOTHING;

-- Populate search vectors for existing records
UPDATE cards SET title = title;
UPDATE profiles SET display_name = display_name;
