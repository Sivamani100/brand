-- Migration for Extension 3: Full Production Hardening
-- Date: 2026-06-18

-- 1. Soft Deletes Support
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Admin 2FA Columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_last_used TIMESTAMPTZ;

-- 3. Token Consumption & API Usage Tracking
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_usage_user_created_idx ON public.api_usage(user_id, created_at DESC);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_admin" ON public.api_usage
  FOR SELECT USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "api_usage_user" ON public.api_usage
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "api_usage_insert" ON public.api_usage
  FOR INSERT WITH CHECK (true);

-- 4. Login History & Suspicious Login Detection
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address INET,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('mobile','desktop','tablet')),
  browser TEXT,
  os TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_history_user_idx ON public.login_history(user_id, created_at DESC);
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_history_admin" ON public.login_history
  FOR SELECT USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "login_history_owner" ON public.login_history
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "login_history_insert" ON public.login_history
  FOR INSERT WITH CHECK (true);

-- 5. Support Ticket System
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'account','card','application','chat','billing','bug','safety','appeal','other'
  )),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  attachments TEXT[],
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_review','waiting_user','resolved','closed')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_type TEXT CHECK (sender_type IN ('user','admin','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generate Ticket Number Sequence
CREATE SEQUENCE IF NOT EXISTS public.ticket_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_ticket_number ON public.support_tickets;
CREATE TRIGGER trigger_generate_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON public.ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_admin" ON public.support_tickets
  FOR ALL USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "support_tickets_owner" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "support_tickets_insert" ON public.support_tickets
  FOR INSERT WITH CHECK (true);
CREATE POLICY "support_tickets_update" ON public.support_tickets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ticket_messages_admin" ON public.ticket_messages
  FOR ALL USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "ticket_messages_owner" ON public.ticket_messages
  FOR SELECT USING (exists (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_id AND (user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
  ));
CREATE POLICY "ticket_messages_insert" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND exists (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
  );

-- 6. GDPR Data Export Requests
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_export_admin" ON public.data_export_requests
  FOR ALL USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "data_export_owner" ON public.data_export_requests
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "data_export_insert" ON public.data_export_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 7. SQL-Fallback Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_admin" ON public.rate_limits
  FOR ALL USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "rate_limits_insert" ON public.rate_limits
  FOR INSERT WITH CHECK (true);
CREATE POLICY "rate_limits_update" ON public.rate_limits
  FOR UPDATE USING (true);
CREATE POLICY "rate_limits_select" ON public.rate_limits
  FOR SELECT USING (true);

-- 8. Soft Delete Filtration in RLS Policies
-- We modify SELECT policies for existing tables to filter out deleted_at IS NOT NULL records for non-admins.
-- (Admins can still view soft-deleted records for auditing).

-- Cards
DROP POLICY IF EXISTS "Anyone can view active cards" ON public.cards;
CREATE POLICY "Anyone can view active cards" ON public.cards
  FOR SELECT USING (
    (deleted_at IS NULL AND status = 'active') 
    OR (auth.uid() = brand_id)
    OR (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Applications
DROP POLICY IF EXISTS "Users can view relevant applications" ON public.applications;
CREATE POLICY "Users can view relevant applications" ON public.applications
  FOR SELECT USING (
    (deleted_at IS NULL AND (auth.uid() = influencer_id OR exists (
      SELECT 1 FROM public.cards WHERE id = card_id AND brand_id = auth.uid()
    )))
    OR (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT USING (
    (deleted_at IS NULL AND exists (
      SELECT 1 FROM public.rooms WHERE id = room_id AND (brand_id = auth.uid() or influencer_id = auth.uid())
    ))
    OR (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Rooms
DROP POLICY IF EXISTS "Participants can view rooms" ON public.rooms;
CREATE POLICY "Participants can view rooms" ON public.rooms
  FOR SELECT USING (
    (deleted_at IS NULL AND (brand_id = auth.uid() OR influencer_id = auth.uid()))
    OR (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (deleted_at IS NULL OR (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')));

-- Portfolio Items
DROP POLICY IF EXISTS "Portfolio items are viewable by everyone" ON public.portfolio_items;
CREATE POLICY "Portfolio items are viewable by everyone" ON public.portfolio_items
  FOR SELECT USING (deleted_at IS NULL OR (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')));

-- 9. Realtime Publication Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
