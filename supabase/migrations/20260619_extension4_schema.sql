-- ============================================================
-- Extension 4: Tour support, API keys, Webhooks, Storage usage
-- Migration: 20260619_extension4_schema.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Add tour_completed flag to profiles
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;

-- ──────────────────────────────────────────────────────────────
-- 2. API Keys
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                  text        NOT NULL,
  key_prefix            text        NOT NULL,
  key_hash              text        NOT NULL,
  scopes                text[]      NOT NULL,
  last_used_at          timestamptz,
  last_used_ip          inet,
  expires_at            timestamptz,
  is_active             boolean     DEFAULT true,
  rate_limit_per_minute integer     DEFAULT 60,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_prefix_idx  ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. Webhooks
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhooks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url               text        NOT NULL,
  secret            text        NOT NULL,
  events            text[]      NOT NULL,
  is_active         boolean     DEFAULT true,
  failure_count     integer     DEFAULT 0,
  last_triggered_at timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhooks_user_id_idx ON public.webhooks(user_id);

-- ──────────────────────────────────────────────────────────────
-- 4. Webhook Deliveries
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      uuid        NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event           text        NOT NULL,
  payload         jsonb       NOT NULL,
  response_status integer,
  response_body   text,
  duration_ms     integer,
  attempt         integer     DEFAULT 1,
  success         boolean,
  delivered_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx
  ON public.webhook_deliveries(webhook_id);

-- ──────────────────────────────────────────────────────────────
-- 5. User Storage Usage
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_storage_usage (
  user_id          uuid   PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatars_bytes    bigint DEFAULT 0,
  portfolio_bytes  bigint DEFAULT 0,
  attachments_bytes bigint DEFAULT 0,
  total_bytes      bigint GENERATED ALWAYS AS (avatars_bytes + portfolio_bytes + attachments_bytes) STORED,
  updated_at       timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 6. Row-Level Security
-- ──────────────────────────────────────────────────────────────

-- Enable RLS on all new tables
ALTER TABLE public.api_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage_usage  ENABLE ROW LEVEL SECURITY;

-- api_keys: users can only see / manage their own
CREATE POLICY "Users can view own api_keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- webhooks: users can only see / manage their own
CREATE POLICY "Users can view own webhooks"
  ON public.webhooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhooks"
  ON public.webhooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON public.webhooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON public.webhooks FOR DELETE
  USING (auth.uid() = user_id);

-- webhook_deliveries: users see deliveries for their own webhooks
CREATE POLICY "Users can view own webhook_deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (
    webhook_id IN (SELECT id FROM public.webhooks WHERE user_id = auth.uid())
  );

-- user_storage_usage: users can only see their own
CREATE POLICY "Users can view own storage"
  ON public.user_storage_usage FOR SELECT
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 7. Admin Policies (read-all for admin users)
-- ──────────────────────────────────────────────────────────────

CREATE POLICY "Admins can view all api_keys"
  ON public.api_keys FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view all webhooks"
  ON public.webhooks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view all webhook_deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view all storage"
  ON public.user_storage_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));
