-- 1. Create Tables

-- PROFILES (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('brand', 'influencer', 'admin')),
  display_name text not null,
  avatar_url text,
  bio text,
  website_url text,
  -- Brand-specific
  company_name text,
  industry text,
  -- Influencer-specific
  niche text[] default '{}',            -- e.g. ['fashion','fitness']
  follower_count integer,
  platforms text[] default '{}',        -- e.g. ['instagram','youtube']
  location text,
  -- Meta
  is_verified boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CARDS (Brand's collaboration posts)
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  category text not null,           -- maps to badge colors
  niche_tags text[] not null,       -- for influencer matching
  platform_requirements text[] default '{}',    -- required platforms
  min_followers integer default 0,
  budget_range text,                -- e.g. "₹5,000 – ₹20,000"
  deliverables text[] default '{}', -- e.g. ['1 reel','2 stories']
  timeline text,                    -- e.g. "7 days"
  cover_image_url text,
  status text default 'active' check (status in ('active','paused','closed','draft')),
  application_deadline timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- APPLICATIONS (Influencer applies to a Card)
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade not null,
  influencer_id uuid references public.profiles(id) on delete cascade not null,
  -- Step 1: pitch
  pitch_message text not null,
  -- Step 2: portfolio
  portfolio_links text[] default '{}',
  proposed_rate text,
  status text default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  brand_note text,                  -- brand's internal note on rejection/acceptance
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(card_id, influencer_id)
);

-- ROOMS (Chat rooms, created on acceptance)
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade unique not null,
  brand_id uuid references public.profiles(id) not null,
  influencer_id uuid references public.profiles(id) not null,
  card_id uuid references public.cards(id) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- MESSAGES (Chat messages in a Room)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text,
  attachment_url text,
  attachment_type text check (attachment_type in ('image','file')),             -- 'image'|'file'|null
  is_read boolean default false,
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,               -- 'new_card'|'application_accepted'|'application_rejected'|'new_message'|'new_application'
  title text not null,
  body text,
  reference_id uuid,               -- card_id, application_id, or room_id
  reference_type text,             -- 'card'|'application'|'room'
  is_read boolean default false,
  created_at timestamptz default now()
);

-- REPORTS (User-generated complaints)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) not null,
  reported_user_id uuid references public.profiles(id),
  card_id uuid,
  reason text not null,
  description text,
  status text default 'open' check (status in ('open','reviewed','resolved','dismissed')),
  admin_note text,
  created_at timestamptz default now()
);

-- PLATFORM SETTINGS (Admin-controlled)
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now()
);

-- 2. Configure Realtime & Publications
begin;
  -- Remove exists first if any, then add tables
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.applications;

-- 3. Auth trigger for public.profiles mapping
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  user_niche text[];
  user_platforms text[];
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'influencer');
  
  -- Parse arrays if passed as JSON array or text
  insert into public.profiles (
    id,
    role,
    display_name,
    avatar_url,
    bio,
    website_url,
    company_name,
    industry,
    niche,
    follower_count,
    platforms,
    location,
    is_verified,
    is_active
  )
  values (
    new.id,
    user_role,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'bio',
    new.raw_user_meta_data->>'website_url',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'industry',
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data->'niche')), '{}'),
    coalesce((new.raw_user_meta_data->>'follower_count')::integer, 0),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data->'platforms')), '{}'),
    new.raw_user_meta_data->>'location',
    false,
    true
  );
  return new;
exception
  when others then
    -- Fallback in case of parsing errors
    insert into public.profiles (id, role, display_name, is_verified, is_active)
    values (new.id, user_role, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'User'), false, true);
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Storage Buckets Creation
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('avatars', 'avatars', true, 5242880, array['image/*']),
  ('card-covers', 'card-covers', true, 10485760, array['image/*']),
  ('message-attachments', 'message-attachments', false, 20971520, null)
on conflict (id) do update set public = excluded.public;

-- 5. Row Level Security (RLS)

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.applications enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.platform_settings enable row level security;

-- PROFILES Policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- CARDS Policies
create policy "Anyone can view active/paused cards" on public.cards
  for select using (true);

create policy "Brands can insert their own cards" on public.cards
  for insert with check (
    auth.uid() = brand_id AND 
    (select role from public.profiles where id = auth.uid()) = 'brand'
  );

create policy "Brands can update their own cards" on public.cards
  for update using (auth.uid() = brand_id);

create policy "Brands can delete their own cards" on public.cards
  for delete using (auth.uid() = brand_id);

-- APPLICATIONS Policies
create policy "Users can view relevant applications" on public.applications
  for select using (
    auth.uid() = influencer_id OR 
    auth.uid() = (select brand_id from public.cards where id = card_id) OR
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Influencers can submit applications" on public.applications
  for insert with check (
    auth.uid() = influencer_id AND
    (select role from public.profiles where id = auth.uid()) = 'influencer'
  );

create policy "Users can update relevant applications" on public.applications
  for update using (
    auth.uid() = influencer_id OR 
    auth.uid() = (select brand_id from public.cards where id = card_id) OR
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Influencers can delete own application" on public.applications
  for delete using (auth.uid() = influencer_id);

-- ROOMS Policies
create policy "Participants can view rooms" on public.rooms
  for select using (
    auth.uid() = brand_id OR 
    auth.uid() = influencer_id OR
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Rooms can be created by brand participants" on public.rooms
  for insert with check (
    (auth.uid() = brand_id AND (select role from public.profiles where id = auth.uid()) = 'brand') OR
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- MESSAGES Policies
create policy "Participants can view room messages" on public.messages
  for select using (
    exists (
      select 1 from public.rooms 
      where id = room_id AND (brand_id = auth.uid() OR influencer_id = auth.uid())
    ) OR
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Participants can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id AND 
    exists (
      select 1 from public.rooms 
      where id = room_id AND (brand_id = auth.uid() OR influencer_id = auth.uid())
    )
  );

-- NOTIFICATIONS Policies
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- REPORTS Policies
create policy "Authenticated users can submit reports" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "Only admin can view reports" on public.reports
  for select using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Only admin can update reports" on public.reports
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- PLATFORM SETTINGS Policies
create policy "Settings are viewable by everyone" on public.platform_settings
  for select using (true);

create policy "Only admin can modify settings" on public.platform_settings
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- 6. Storage Security Policies

-- Avatars access
create policy "Avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users can upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Card covers access
create policy "Card covers are publicly readable" on storage.objects
  for select using (bucket_id = 'card-covers');

create policy "Brands can upload card covers" on storage.objects
  for insert with check (
    bucket_id = 'card-covers' AND
    (select role from public.profiles where id = auth.uid()) = 'brand'
  );

-- Message attachments access
create policy "Chat participants can view attachments" on storage.objects
  for select using (
    bucket_id = 'message-attachments' AND
    exists (
      select 1 from public.rooms
      where id::text = (storage.foldername(name))[1] AND
      (brand_id = auth.uid() OR influencer_id = auth.uid())
    )
  );

create policy "Chat participants can upload attachments" on storage.objects
  for insert with check (
    bucket_id = 'message-attachments' AND
    exists (
      select 1 from public.rooms
      where id::text = (storage.foldername(name))[1] AND
      (brand_id = auth.uid() OR influencer_id = auth.uid())
    )
  );
