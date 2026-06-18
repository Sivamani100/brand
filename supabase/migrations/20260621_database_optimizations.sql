-- Database Optimizations Migration
-- Date: 2026-06-21

-- =========================================================================
-- 1. Create Performance Indexes for frequently queried Foreign Keys
-- =========================================================================
CREATE INDEX IF NOT EXISTS rooms_brand_id_idx ON public.rooms (brand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS rooms_influencer_id_idx ON public.rooms (influencer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS rooms_card_id_idx ON public.rooms (card_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages (sender_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS milestones_room_id_idx ON public.milestones (room_id);
CREATE INDEX IF NOT EXISTS milestones_created_by_idx ON public.milestones (created_by);
CREATE INDEX IF NOT EXISTS disputes_room_id_idx ON public.disputes (room_id);
CREATE INDEX IF NOT EXISTS disputes_raised_by_idx ON public.disputes (raised_by);
CREATE INDEX IF NOT EXISTS verification_requests_user_id_idx ON public.verification_requests (user_id);
CREATE INDEX IF NOT EXISTS verification_requests_reviewed_by_idx ON public.verification_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS portfolio_items_owner_id_idx ON public.portfolio_items (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS reviews_reviewed_id_idx ON public.reviews (reviewed_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS reviews_reviewer_id_idx ON public.reviews (reviewer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS reports_reported_user_id_idx ON public.reports (reported_user_id);
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON public.reports (reporter_id);

-- Additional unindexed foreign keys identified by the Supabase Linter
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS brand_campaigns_brand_id_idx ON public.brand_campaigns(brand_id);
CREATE INDEX IF NOT EXISTS broadcast_emails_created_by_idx ON public.broadcast_emails(created_by);
CREATE INDEX IF NOT EXISTS saved_cards_card_id_idx ON public.saved_cards(card_id);
CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_to_idx ON public.support_tickets(assigned_to);

-- =========================================================================
-- 2. Sort column optimizations to prevent in-memory scans
-- =========================================================================
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON public.applications (created_at DESC);
CREATE INDEX IF NOT EXISTS verification_requests_created_idx ON public.verification_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_created_idx ON public.reports (created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_created_idx ON public.support_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS disputes_created_idx ON public.disputes (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON public.notifications (user_id, created_at DESC);

-- =========================================================================
-- 3. Soft Delete Partial Indexes
-- =========================================================================
CREATE INDEX IF NOT EXISTS cards_active_created_at_idx ON public.cards (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS applications_active_created_at_idx ON public.applications (created_at DESC) WHERE deleted_at IS NULL;


-- =========================================================================
-- 4. RLS Policy Optimizations using (select auth.uid()) / (select auth.role()) subquery caching
-- This converts direct function calls evaluated once-per-row into InitPlans evaluated once-per-query.
-- =========================================================================

-- PROFILES
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- CARDS
DROP POLICY IF EXISTS "Brands can insert their own cards" ON public.cards;
CREATE POLICY "Brands can insert their own cards" ON public.cards
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = brand_id AND 
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'brand'
  );

DROP POLICY IF EXISTS "Brands can update their own cards" ON public.cards;
CREATE POLICY "Brands can update their own cards" ON public.cards
  FOR UPDATE USING ((SELECT auth.uid()) = brand_id);

DROP POLICY IF EXISTS "Brands can delete their own cards" ON public.cards;
CREATE POLICY "Brands can delete their own cards" ON public.cards
  FOR DELETE USING ((SELECT auth.uid()) = brand_id);

DROP POLICY IF EXISTS "Anyone can view active cards" ON public.cards;
CREATE POLICY "Anyone can view active cards" ON public.cards
  FOR SELECT USING (
    (deleted_at IS NULL AND status = 'active') 
    OR ((SELECT auth.uid()) = brand_id)
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  );

-- APPLICATIONS
DROP POLICY IF EXISTS "Influencers can submit applications" ON public.applications;
CREATE POLICY "Influencers can submit applications" ON public.applications
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = influencer_id AND
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'influencer'
  );

DROP POLICY IF EXISTS "Users can update relevant applications" ON public.applications;
CREATE POLICY "Users can update relevant applications" ON public.applications
  FOR UPDATE USING (
    (SELECT auth.uid()) = influencer_id OR 
    (SELECT auth.uid()) = (SELECT brand_id FROM public.cards WHERE id = card_id) OR
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "Influencers can delete own application" ON public.applications;
CREATE POLICY "Influencers can delete own application" ON public.applications
  FOR DELETE USING ((SELECT auth.uid()) = influencer_id);

DROP POLICY IF EXISTS "Users can view relevant applications" ON public.applications;
CREATE POLICY "Users can view relevant applications" ON public.applications
  FOR SELECT USING (
    (deleted_at IS NULL AND ((SELECT auth.uid()) = influencer_id OR EXISTS (
      SELECT 1 FROM public.cards WHERE id = card_id AND brand_id = (SELECT auth.uid())
    )))
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  );

-- ROOMS
DROP POLICY IF EXISTS "Rooms can be created by brand participants" ON public.rooms;
CREATE POLICY "Rooms can be created by brand participants" ON public.rooms
  FOR INSERT WITH CHECK (
    ((SELECT auth.uid()) = brand_id AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'brand') OR
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "Participants can view rooms" ON public.rooms;
CREATE POLICY "Participants can view rooms" ON public.rooms
  FOR SELECT USING (
    (deleted_at IS NULL AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  );

-- MESSAGES
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = sender_id AND 
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT USING (
    (deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    ))
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  );

-- Drop redundant duplicate policy on messages
DROP POLICY IF EXISTS "Participants can view room messages" ON public.messages;

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- REPORTS
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users can submit reports" ON public.reports
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);

DROP POLICY IF EXISTS "Only admin can view reports" ON public.reports;
CREATE POLICY "Only admin can view reports" ON public.reports
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Only admin can update reports" ON public.reports;
CREATE POLICY "Only admin can update reports" ON public.reports
  FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- PLATFORM SETTINGS
DROP POLICY IF EXISTS "Only admin can modify settings" ON public.platform_settings;
CREATE POLICY "Only admin can modify settings" ON public.platform_settings
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- INFLUENCER LISTS
DROP POLICY IF EXISTS "Brands can view own lists" ON public.influencer_lists;
CREATE POLICY "Brands can view own lists" ON public.influencer_lists
  FOR SELECT USING ((SELECT auth.uid()) = brand_id);

DROP POLICY IF EXISTS "Brands can create lists" ON public.influencer_lists;
CREATE POLICY "Brands can create lists" ON public.influencer_lists
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = brand_id AND 
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'brand'
  );

DROP POLICY IF EXISTS "Brands can update own lists" ON public.influencer_lists;
CREATE POLICY "Brands can update own lists" ON public.influencer_lists
  FOR UPDATE USING ((SELECT auth.uid()) = brand_id);

DROP POLICY IF EXISTS "Brands can delete own lists" ON public.influencer_lists;
CREATE POLICY "Brands can delete own lists" ON public.influencer_lists
  FOR DELETE USING ((SELECT auth.uid()) = brand_id);

-- INFLUENCER LIST ITEMS
DROP POLICY IF EXISTS "Brands can view own list items" ON public.influencer_list_items;
CREATE POLICY "Brands can view own list items" ON public.influencer_list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.influencer_lists 
      WHERE id = list_id AND brand_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Brands can insert own list items" ON public.influencer_list_items;
CREATE POLICY "Brands can insert own list items" ON public.influencer_list_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.influencer_lists 
      WHERE id = list_id AND brand_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Brands can delete own list items" ON public.influencer_list_items;
CREATE POLICY "Brands can delete own list items" ON public.influencer_list_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.influencer_lists 
      WHERE id = list_id AND brand_id = (SELECT auth.uid())
    )
  );

-- PORTFOLIO ITEMS
DROP POLICY IF EXISTS "Users can update own portfolio items" ON public.portfolio_items;
CREATE POLICY "Users can update own portfolio items" ON public.portfolio_items
  FOR UPDATE USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Users can insert own portfolio items" ON public.portfolio_items;
CREATE POLICY "Users can insert own portfolio items" ON public.portfolio_items
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Users can delete own portfolio items" ON public.portfolio_items;
CREATE POLICY "Users can delete own portfolio items" ON public.portfolio_items
  FOR DELETE USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Portfolio items are viewable by everyone" ON public.portfolio_items;
CREATE POLICY "Portfolio items are viewable by everyone" ON public.portfolio_items
  FOR SELECT USING (
    deleted_at IS NULL OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  );

-- REVIEWS
DROP POLICY IF EXISTS "Participants can write reviews" ON public.reviews;
CREATE POLICY "Participants can write reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = reviewer_id AND 
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Reviewed party can reply to reviews" ON public.reviews;
CREATE POLICY "Reviewed party can reply to reviews" ON public.reviews
  FOR UPDATE USING ((SELECT auth.uid()) = reviewed_id);

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (
    deleted_at IS NULL OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  );

-- PROFILE VIEWS
DROP POLICY IF EXISTS "Users can view own profile views" ON public.profile_views;
CREATE POLICY "Users can view own profile views" ON public.profile_views
  FOR SELECT USING (
    (SELECT auth.uid()) = profile_id OR 
    ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
  );

DROP POLICY IF EXISTS "Anyone can register a profile view" ON public.profile_views;
CREATE POLICY "Anyone can register a profile view" ON public.profile_views
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = viewer_id OR viewer_id IS NULL);

-- SAVED CARDS
DROP POLICY IF EXISTS "Influencers can view own saved cards" ON public.saved_cards;
CREATE POLICY "Influencers can view own saved cards" ON public.saved_cards
  FOR SELECT USING ((SELECT auth.uid()) = influencer_id);

DROP POLICY IF EXISTS "Influencers can save cards" ON public.saved_cards;
CREATE POLICY "Influencers can save cards" ON public.saved_cards
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = influencer_id AND 
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'influencer'
  );

DROP POLICY IF EXISTS "Influencers can unsave cards" ON public.saved_cards;
CREATE POLICY "Influencers can unsave cards" ON public.saved_cards
  FOR DELETE USING ((SELECT auth.uid()) = influencer_id);

-- VERIFICATION REQUESTS
DROP POLICY IF EXISTS "Users can view own verification requests" ON public.verification_requests;
CREATE POLICY "Users can view own verification requests" ON public.verification_requests
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id OR 
    ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
  );

DROP POLICY IF EXISTS "Users can submit verification request" ON public.verification_requests;
CREATE POLICY "Users can submit verification request" ON public.verification_requests
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests" ON public.verification_requests
  FOR UPDATE USING (((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'));

-- MILESTONES
DROP POLICY IF EXISTS "Participants can view milestones" ON public.milestones;
CREATE POLICY "Participants can view milestones" ON public.milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    ) OR
    ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
  );

DROP POLICY IF EXISTS "Participants can create milestones" ON public.milestones;
CREATE POLICY "Participants can create milestones" ON public.milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Participants can update milestones" ON public.milestones;
CREATE POLICY "Participants can update milestones" ON public.milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Participants can delete milestones" ON public.milestones;
CREATE POLICY "Participants can delete milestones" ON public.milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    )
  );

-- DISPUTES
DROP POLICY IF EXISTS "Participants or admin can view disputes" ON public.disputes;
CREATE POLICY "Participants or admin can view disputes" ON public.disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    ) OR
    ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
  );

DROP POLICY IF EXISTS "Participants can raise disputes" ON public.disputes;
CREATE POLICY "Participants can raise disputes" ON public.disputes
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = raised_by AND 
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id AND (brand_id = (SELECT auth.uid()) OR influencer_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Only admin can update disputes" ON public.disputes;
CREATE POLICY "Only admin can update disputes" ON public.disputes
  FOR UPDATE USING (((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'));

-- FOLLOWS
DROP POLICY IF EXISTS "Influencers can follow brands" ON public.follows;
CREATE POLICY "Influencers can follow brands" ON public.follows
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = follower_id AND 
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'influencer'
  );

DROP POLICY IF EXISTS "Influencers can unfollow brands" ON public.follows;
CREATE POLICY "Influencers can unfollow brands" ON public.follows
  FOR DELETE USING ((SELECT auth.uid()) = follower_id);

-- BRAND CAMPAIGNS
DROP POLICY IF EXISTS "Brands can insert own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can insert own campaigns" ON public.brand_campaigns
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = brand_id AND 
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'brand'
  );

DROP POLICY IF EXISTS "Brands can update own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can update own campaigns" ON public.brand_campaigns
  FOR UPDATE USING ((SELECT auth.uid()) = brand_id);

DROP POLICY IF EXISTS "Brands can delete own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can delete own campaigns" ON public.brand_campaigns
  FOR DELETE USING ((SELECT auth.uid()) = brand_id);


-- =========================================================================
-- 5. Additional Secondary Tables RLS Optimizations
-- =========================================================================

-- INVITES
DROP POLICY IF EXISTS "Users can view relevant invites" ON public.invites;
CREATE POLICY "Users can view relevant invites" ON public.invites
  FOR SELECT USING (((SELECT auth.uid()) = brand_id) OR ((SELECT auth.uid()) = influencer_id));

DROP POLICY IF EXISTS "Brands can send invites" ON public.invites;
CREATE POLICY "Brands can send invites" ON public.invites
  FOR INSERT WITH CHECK (
    ((SELECT auth.uid()) = brand_id) AND 
    ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'brand'::text)
  );

DROP POLICY IF EXISTS "Influencers or brands can update invites" ON public.invites;
CREATE POLICY "Influencers or brands can update invites" ON public.invites
  FOR UPDATE USING (((SELECT auth.uid()) = brand_id) OR ((SELECT auth.uid()) = influencer_id));

DROP POLICY IF EXISTS "Brands can delete invites" ON public.invites;
CREATE POLICY "Brands can delete invites" ON public.invites
  FOR DELETE USING ((SELECT auth.uid()) = brand_id);

-- MODERATION QUEUE
DROP POLICY IF EXISTS "moderation_queue_admin" ON public.moderation_queue;
CREATE POLICY "moderation_queue_admin" ON public.moderation_queue
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

DROP POLICY IF EXISTS "moderation_queue_author" ON public.moderation_queue;
CREATE POLICY "moderation_queue_author" ON public.moderation_queue
  FOR SELECT USING (author_id = (SELECT auth.uid()));

-- EMAIL TEMPLATES
DROP POLICY IF EXISTS "email_templates_admin" ON public.email_templates;
CREATE POLICY "email_templates_admin" ON public.email_templates
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

DROP POLICY IF EXISTS "email_templates_select" ON public.email_templates;
CREATE POLICY "email_templates_select" ON public.email_templates
  FOR SELECT USING ((SELECT auth.role()) = 'authenticated'::text);

-- BROADCAST EMAILS
DROP POLICY IF EXISTS "broadcast_emails_admin" ON public.broadcast_emails;
CREATE POLICY "broadcast_emails_admin" ON public.broadcast_emails
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

-- FEATURE FLAGS
DROP POLICY IF EXISTS "feature_flags_admin" ON public.feature_flags;
CREATE POLICY "feature_flags_admin" ON public.feature_flags
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

-- AUDIT LOGS
DROP POLICY IF EXISTS "audit_logs_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_admin" ON public.audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

-- PUSH SUBSCRIPTIONS
DROP POLICY IF EXISTS "push_subscriptions_owner" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_owner" ON public.push_subscriptions
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- SAVED SEARCHES
DROP POLICY IF EXISTS "saved_searches_owner" ON public.saved_searches;
CREATE POLICY "saved_searches_owner" ON public.saved_searches
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- API USAGE
DROP POLICY IF EXISTS "api_usage_admin" ON public.api_usage;
CREATE POLICY "api_usage_admin" ON public.api_usage
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

DROP POLICY IF EXISTS "api_usage_user" ON public.api_usage;
CREATE POLICY "api_usage_user" ON public.api_usage
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- LOGIN HISTORY
DROP POLICY IF EXISTS "login_history_admin" ON public.login_history;
CREATE POLICY "login_history_admin" ON public.login_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

DROP POLICY IF EXISTS "login_history_owner" ON public.login_history;
CREATE POLICY "login_history_owner" ON public.login_history
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- SUPPORT TICKETS
DROP POLICY IF EXISTS "support_tickets_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_admin" ON public.support_tickets
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

DROP POLICY IF EXISTS "support_tickets_owner" ON public.support_tickets;
CREATE POLICY "support_tickets_owner" ON public.support_tickets
  FOR SELECT USING (
    (user_id = (SELECT auth.uid())) OR 
    (email = (SELECT email FROM public.profiles WHERE id = (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets;
CREATE POLICY "support_tickets_update" ON public.support_tickets
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- TICKET MESSAGES
DROP POLICY IF EXISTS "ticket_messages_admin" ON public.ticket_messages;
CREATE POLICY "ticket_messages_admin" ON public.ticket_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

DROP POLICY IF EXISTS "ticket_messages_owner" ON public.ticket_messages;
CREATE POLICY "ticket_messages_owner" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (
        user_id = (SELECT auth.uid()) OR 
        email = (SELECT email FROM public.profiles WHERE id = (SELECT auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "ticket_messages_insert" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    (sender_id = (SELECT auth.uid())) AND 
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (
        user_id = (SELECT auth.uid()) OR 
        email = (SELECT email FROM public.profiles WHERE id = (SELECT auth.uid()))
      )
    )
  );

-- DATA EXPORT REQUESTS
DROP POLICY IF EXISTS "data_export_admin" ON public.data_export_requests;
CREATE POLICY "data_export_admin" ON public.data_export_requests
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));

DROP POLICY IF EXISTS "data_export_owner" ON public.data_export_requests;
CREATE POLICY "data_export_owner" ON public.data_export_requests
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "data_export_insert" ON public.data_export_requests;
CREATE POLICY "data_export_insert" ON public.data_export_requests
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- RATE LIMITS
DROP POLICY IF EXISTS "rate_limits_admin" ON public.rate_limits;
CREATE POLICY "rate_limits_admin" ON public.rate_limits
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'::text));
