-- Alter profiles and rooms first
alter table public.profiles add column if not exists cover_banner_url text;
alter table public.profiles add column if not exists notification_prefs jsonb default '{}'::jsonb;

alter table public.rooms add column if not exists status text default 'active' check (status in ('active','completed','disputed','closed'));

-- 1. Create invites table
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade,
  brand_id uuid references public.profiles(id) on delete cascade,
  influencer_id uuid references public.profiles(id) on delete cascade,
  message text,
  status text default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  unique(card_id, influencer_id)
);

-- 2. Create follows table
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade,   -- influencer
  following_id uuid references public.profiles(id) on delete cascade,  -- brand
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

-- 3. Create influencer_lists table
create table if not exists public.influencer_lists (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- 4. Create influencer_list_items table
create table if not exists public.influencer_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.influencer_lists(id) on delete cascade,
  influencer_id uuid references public.profiles(id) on delete cascade,
  added_at timestamptz default now(),
  unique(list_id, influencer_id)
);

-- 5. Create portfolio_items table
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  owner_role text check (owner_role in ('influencer','brand')),
  title text,
  caption text,
  media_url text,
  media_type text check (media_type in ('image','video_url','embed')),
  platform text,
  post_url text,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 6. Create brand_campaigns table
create table if not exists public.brand_campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  cover_url text,
  description text,
  outcome_blurb text,
  influencer_ids uuid[],
  campaign_start date,
  campaign_end date,
  created_at timestamptz default now()
);

-- 7. Create reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete cascade,
  reviewed_id uuid references public.profiles(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text,
  tags text[],
  reply text,
  reply_at timestamptz,
  created_at timestamptz default now(),
  unique(room_id, reviewer_id)
);

-- 8. Create profile_views table
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete cascade,
  viewed_at timestamptz default now()
);

-- 9. Create saved_cards table
create table if not exists public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid references public.profiles(id) on delete cascade,
  card_id uuid references public.cards(id) on delete cascade,
  saved_at timestamptz default now(),
  unique(influencer_id, card_id)
);

-- 10. Create verification_requests table
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  role text,
  submitted_links text[],
  notes text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 11. Create milestones table
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  title text not null,
  due_date date,
  status text default 'pending' check (status in ('pending','in_progress','done')),
  created_by uuid references public.profiles(id) on delete cascade,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 12. Create disputes table
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  raised_by uuid references public.profiles(id) on delete cascade,
  reason text not null,
  description text,
  evidence_urls text[],
  status text default 'open' check (status in ('open','under_review','resolved','closed')),
  resolution text,
  admin_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 2. Configure Realtime & Publications
alter publication supabase_realtime add table public.milestones;
alter publication supabase_realtime add table public.disputes;

-- 3. Row Level Security (RLS)
alter table public.invites enable row level security;
alter table public.follows enable row level security;
alter table public.influencer_lists enable row level security;
alter table public.influencer_list_items enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.brand_campaigns enable row level security;
alter table public.reviews enable row level security;
alter table public.profile_views enable row level security;
alter table public.saved_cards enable row level security;
alter table public.verification_requests enable row level security;
alter table public.milestones enable row level security;
alter table public.disputes enable row level security;

-- Drop existing policies if any (to avoid conflicts)
drop policy if exists "Users can view relevant invites" on public.invites;
drop policy if exists "Brands can send invites" on public.invites;
drop policy if exists "Influencers or brands can update invites" on public.invites;
drop policy if exists "Brands can delete invites" on public.invites;

drop policy if exists "Follows are viewable by everyone" on public.follows;
drop policy if exists "Influencers can follow brands" on public.follows;
drop policy if exists "Influencers can unfollow brands" on public.follows;

drop policy if exists "Brands can view own lists" on public.influencer_lists;
drop policy if exists "Brands can create lists" on public.influencer_lists;
drop policy if exists "Brands can update own lists" on public.influencer_lists;
drop policy if exists "Brands can delete own lists" on public.influencer_lists;

drop policy if exists "Brands can view own list items" on public.influencer_list_items;
drop policy if exists "Brands can insert own list items" on public.influencer_list_items;
drop policy if exists "Brands can delete own list items" on public.influencer_list_items;

drop policy if exists "Portfolio items are viewable by everyone" on public.portfolio_items;
drop policy if exists "Users can insert own portfolio items" on public.portfolio_items;
drop policy if exists "Users can update own portfolio items" on public.portfolio_items;
drop policy if exists "Users can delete own portfolio items" on public.portfolio_items;

drop policy if exists "Brand campaigns are viewable by everyone" on public.brand_campaigns;
drop policy if exists "Brands can insert own campaigns" on public.brand_campaigns;
drop policy if exists "Brands can update own campaigns" on public.brand_campaigns;
drop policy if exists "Brands can delete own campaigns" on public.brand_campaigns;

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
drop policy if exists "Participants can write reviews" on public.reviews;
drop policy if exists "Reviewed party can reply to reviews" on public.reviews;

drop policy if exists "Users can view own profile views" on public.profile_views;
drop policy if exists "Anyone can register a profile view" on public.profile_views;

drop policy if exists "Influencers can view own saved cards" on public.saved_cards;
drop policy if exists "Influencers can save cards" on public.saved_cards;
drop policy if exists "Influencers can unsave cards" on public.saved_cards;

drop policy if exists "Users can view own verification requests" on public.verification_requests;
drop policy if exists "Users can submit verification request" on public.verification_requests;
drop policy if exists "Admins can update verification requests" on public.verification_requests;

drop policy if exists "Participants can view milestones" on public.milestones;
drop policy if exists "Participants can create milestones" on public.milestones;
drop policy if exists "Participants can update milestones" on public.milestones;
drop policy if exists "Participants can delete milestones" on public.milestones;

drop policy if exists "Participants or admin can view disputes" on public.disputes;
drop policy if exists "Participants can raise disputes" on public.disputes;
drop policy if exists "Only admin can update disputes" on public.disputes;

-- Create policies

-- Invites
create policy "Users can view relevant invites" on public.invites
  for select using (auth.uid() = brand_id or auth.uid() = influencer_id);
create policy "Brands can send invites" on public.invites
  for insert with check (auth.uid() = brand_id and (select role from public.profiles where id = auth.uid()) = 'brand');
create policy "Influencers or brands can update invites" on public.invites
  for update using (auth.uid() = brand_id or auth.uid() = influencer_id);
create policy "Brands can delete invites" on public.invites
  for delete using (auth.uid() = brand_id);

-- Follows
create policy "Follows are viewable by everyone" on public.follows
  for select using (true);
create policy "Influencers can follow brands" on public.follows
  for insert with check (auth.uid() = follower_id and (select role from public.profiles where id = auth.uid()) = 'influencer');
create policy "Influencers can unfollow brands" on public.follows
  for delete using (auth.uid() = follower_id);

-- Influencer Lists
create policy "Brands can view own lists" on public.influencer_lists
  for select using (auth.uid() = brand_id);
create policy "Brands can create lists" on public.influencer_lists
  for insert with check (auth.uid() = brand_id and (select role from public.profiles where id = auth.uid()) = 'brand');
create policy "Brands can update own lists" on public.influencer_lists
  for update using (auth.uid() = brand_id);
create policy "Brands can delete own lists" on public.influencer_lists
  for delete using (auth.uid() = brand_id);

-- Influencer List Items
create policy "Brands can view own list items" on public.influencer_list_items
  for select using (exists (select 1 from public.influencer_lists where id = list_id and brand_id = auth.uid()));
create policy "Brands can insert own list items" on public.influencer_list_items
  for insert with check (exists (select 1 from public.influencer_lists where id = list_id and brand_id = auth.uid()));
create policy "Brands can delete own list items" on public.influencer_list_items
  for delete using (exists (select 1 from public.influencer_lists where id = list_id and brand_id = auth.uid()));

-- Portfolio Items
create policy "Portfolio items are viewable by everyone" on public.portfolio_items
  for select using (true);
create policy "Users can insert own portfolio items" on public.portfolio_items
  for insert with check (auth.uid() = owner_id);
create policy "Users can update own portfolio items" on public.portfolio_items
  for update using (auth.uid() = owner_id);
create policy "Users can delete own portfolio items" on public.portfolio_items
  for delete using (auth.uid() = owner_id);

-- Brand Campaigns
create policy "Brand campaigns are viewable by everyone" on public.brand_campaigns
  for select using (true);
create policy "Brands can insert own campaigns" on public.brand_campaigns
  for insert with check (auth.uid() = brand_id and (select role from public.profiles where id = auth.uid()) = 'brand');
create policy "Brands can update own campaigns" on public.brand_campaigns
  for update using (auth.uid() = brand_id);
create policy "Brands can delete own campaigns" on public.brand_campaigns
  for delete using (auth.uid() = brand_id);

-- Reviews
create policy "Reviews are viewable by everyone" on public.reviews
  for select using (true);
create policy "Participants can write reviews" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id and
    exists (
      select 1 from public.rooms where id = room_id and (brand_id = auth.uid() or influencer_id = auth.uid())
    )
  );
create policy "Reviewed party can reply to reviews" on public.reviews
  for update using (auth.uid() = reviewed_id);

-- Profile Views
create policy "Users can view own profile views" on public.profile_views
  for select using (auth.uid() = profile_id or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Anyone can register a profile view" on public.profile_views
  for insert with check (auth.uid() = viewer_id or viewer_id is null);

-- Saved Cards
create policy "Influencers can view own saved cards" on public.saved_cards
  for select using (auth.uid() = influencer_id);
create policy "Influencers can save cards" on public.saved_cards
  for insert with check (auth.uid() = influencer_id and (select role from public.profiles where id = auth.uid()) = 'influencer');
create policy "Influencers can unsave cards" on public.saved_cards
  for delete using (auth.uid() = influencer_id);

-- Verification Requests
create policy "Users can view own verification requests" on public.verification_requests
  for select using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Users can submit verification request" on public.verification_requests
  for insert with check (auth.uid() = user_id);
create policy "Admins can update verification requests" on public.verification_requests
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Milestones
create policy "Participants can view milestones" on public.milestones
  for select using (
    exists (
      select 1 from public.rooms where id = room_id and (brand_id = auth.uid() or influencer_id = auth.uid())
    ) or (select role from public.profiles where id = auth.uid()) = 'admin'
  );
create policy "Participants can create milestones" on public.milestones
  for insert with check (
    exists (
      select 1 from public.rooms where id = room_id and (brand_id = auth.uid() or influencer_id = auth.uid())
    )
  );
create policy "Participants can update milestones" on public.milestones
  for update using (
    exists (
      select 1 from public.rooms where id = room_id and (brand_id = auth.uid() or influencer_id = auth.uid())
    )
  );
create policy "Participants can delete milestones" on public.milestones
  for delete using (
    exists (
      select 1 from public.rooms where id = room_id and (brand_id = auth.uid() or influencer_id = auth.uid())
    )
  );

-- Disputes
create policy "Participants or admin can view disputes" on public.disputes
  for select using (
    exists (
      select 1 from public.rooms where id = room_id and (brand_id = auth.uid() or influencer_id = auth.uid())
    ) or (select role from public.profiles where id = auth.uid()) = 'admin'
  );
create policy "Participants can raise disputes" on public.disputes
  for insert with check (
    auth.uid() = raised_by and
    exists (
      select 1 from public.rooms where id = room_id and (brand_id = auth.uid() or influencer_id = auth.uid())
    )
  );
create policy "Only admin can update disputes" on public.disputes
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
