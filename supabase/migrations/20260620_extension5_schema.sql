-- Migration: Extension 5 Schema
-- Date: 2026-06-20 (Extension 5)

-- Enable PostGIS if available
create extension if not exists postgis;

-- 1. Lookups: location_cities
create table if not exists public.location_cities (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text not null,
  country text not null,
  country_code text not null,    -- "IN", "US", "GB"
  state_code text,               -- "MH", "CA"
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  population bigint,
  timezone text,
  search_vector tsvector generated always as (
    to_tsvector('english', city || ' ' || state || ' ' || country)
  ) stored,
  unique(city, state, country)
);

-- Enable RLS on cities
alter table public.location_cities enable row level security;

create policy "Cities are viewable by everyone" on public.location_cities
  for select using (true);

-- Indexes for location_cities
create index if not exists location_cities_search_idx on public.location_cities using gin(search_vector);
create index if not exists location_cities_coords_idx on public.location_cities using gist(
  point(longitude, latitude)
);

-- Pre-seed with top Indian and global cities
insert into public.location_cities (city, state, country, country_code, state_code, latitude, longitude, population, timezone) values
('Mumbai', 'Maharashtra', 'India', 'IN', 'MH', 18.9760, 72.8777, 12442373, 'Asia/Kolkata'),
('Delhi', 'Delhi', 'India', 'IN', 'DL', 28.6139, 77.2090, 11034555, 'Asia/Kolkata'),
('Bangalore', 'Karnataka', 'India', 'IN', 'KA', 12.9716, 77.5946, 8443675, 'Asia/Kolkata'),
('Hyderabad', 'Telangana', 'India', 'IN', 'TG', 17.3850, 78.4867, 6731790, 'Asia/Kolkata'),
('Ahmedabad', 'Gujarat', 'India', 'IN', 'GJ', 23.0225, 72.5714, 5577940, 'Asia/Kolkata'),
('Chennai', 'Tamil Nadu', 'India', 'IN', 'TN', 13.0827, 80.2707, 4646732, 'Asia/Kolkata'),
('Kolkata', 'West Bengal', 'India', 'IN', 'WB', 22.5726, 88.3639, 4496694, 'Asia/Kolkata'),
('Surat', 'Gujarat', 'India', 'IN', 'GJ', 21.1702, 72.8311, 4466826, 'Asia/Kolkata'),
('Pune', 'Maharashtra', 'India', 'IN', 'MH', 18.5204, 73.8567, 3124458, 'Asia/Kolkata'),
('Jaipur', 'Rajasthan', 'India', 'IN', 'RJ', 26.9124, 75.7873, 3046163, 'Asia/Kolkata'),
('Lucknow', 'Uttar Pradesh', 'India', 'IN', 'UP', 26.8467, 80.9462, 2817105, 'Asia/Kolkata'),
('Kanpur', 'Uttar Pradesh', 'India', 'IN', 'UP', 26.4499, 80.3319, 2765348, 'Asia/Kolkata'),
('Nagpur', 'Maharashtra', 'India', 'IN', 'MH', 21.1458, 79.0882, 2405665, 'Asia/Kolkata'),
('Indore', 'Madhya Pradesh', 'India', 'IN', 'MP', 22.7196, 75.8577, 1964086, 'Asia/Kolkata'),
('Thane', 'Maharashtra', 'India', 'IN', 'MH', 19.2183, 72.9781, 1841488, 'Asia/Kolkata'),
('Bhopal', 'Madhya Pradesh', 'India', 'IN', 'MP', 23.2599, 77.4126, 1798218, 'Asia/Kolkata'),
('Visakhapatnam', 'Andhra Pradesh', 'India', 'IN', 'AP', 17.6868, 83.2185, 1728128, 'Asia/Kolkata'),
('Pimpri-Chinchwad', 'Maharashtra', 'India', 'IN', 'MH', 18.6298, 73.7997, 1727692, 'Asia/Kolkata'),
('Patna', 'Bihar', 'India', 'IN', 'BR', 25.5941, 85.1376, 1684222, 'Asia/Kolkata'),
('Vadodara', 'Gujarat', 'India', 'IN', 'GJ', 22.3072, 73.1812, 1602742, 'Asia/Kolkata'),
('Ghaziabad', 'Uttar Pradesh', 'India', 'IN', 'UP', 28.6692, 77.4538, 1648643, 'Asia/Kolkata'),
('Ludhiana', 'Punjab', 'India', 'IN', 'PB', 30.9010, 75.8573, 1618879, 'Asia/Kolkata'),
('Coimbatore', 'Tamil Nadu', 'India', 'IN', 'TN', 11.0168, 76.9558, 1050721, 'Asia/Kolkata'),
('Agra', 'Uttar Pradesh', 'India', 'IN', 'UP', 27.1767, 78.0081, 1585704, 'Asia/Kolkata'),
('Madurai', 'Tamil Nadu', 'India', 'IN', 'TN', 9.9252, 78.1198, 1017865, 'Asia/Kolkata'),
('Nashik', 'Maharashtra', 'India', 'IN', 'MH', 19.9975, 73.7898, 1486053, 'Asia/Kolkata'),
('Faridabad', 'Haryana', 'India', 'IN', 'HR', 28.4089, 77.3178, 1414050, 'Asia/Kolkata'),
('Meerut', 'Uttar Pradesh', 'India', 'IN', 'UP', 28.9845, 77.7064, 1305429, 'Asia/Kolkata'),
('Rajkot', 'Gujarat', 'India', 'IN', 'GJ', 22.3039, 70.8022, 1286678, 'Asia/Kolkata'),
('Kalyan-Dombivli', 'Maharashtra', 'India', 'IN', 'MH', 19.2354, 73.1291, 1247327, 'Asia/Kolkata'),
('Vasai-Virar', 'Maharashtra', 'India', 'IN', 'MH', 19.3913, 72.8397, 1222390, 'Asia/Kolkata'),
('Varanasi', 'Uttar Pradesh', 'India', 'IN', 'UP', 25.3176, 82.9739, 1198491, 'Asia/Kolkata'),
('Srinagar', 'Jammu and Kashmir', 'India', 'IN', 'JK', 34.0837, 74.7973, 1180570, 'Asia/Kolkata'),
('Aurangabad', 'Maharashtra', 'India', 'IN', 'MH', 19.8762, 75.3433, 1175116, 'Asia/Kolkata'),
('Dhanbad', 'Jharkhand', 'India', 'IN', 'JH', 23.7957, 86.4304, 1162472, 'Asia/Kolkata'),
('Amritsar', 'Punjab', 'India', 'IN', 'PB', 31.6340, 74.8723, 1132383, 'Asia/Kolkata'),
('Navi Mumbai', 'Maharashtra', 'India', 'IN', 'MH', 19.0330, 73.0297, 1120547, 'Asia/Kolkata'),
('Allahabad', 'Uttar Pradesh', 'India', 'IN', 'UP', 25.4358, 81.8463, 1112507, 'Asia/Kolkata'),
('Ranchi', 'Jharkhand', 'India', 'IN', 'JH', 23.3441, 85.3096, 1073169, 'Asia/Kolkata'),
('Howrah', 'West Bengal', 'India', 'IN', 'WB', 22.5769, 88.3186, 1077075, 'Asia/Kolkata'),
('Dubai', 'Dubai', 'United Arab Emirates', 'AE', 'DU', 25.2048, 55.2708, 3331000, 'Asia/Dubai'),
('Singapore', 'Singapore', 'Singapore', 'SG', 'SG', 1.3521, 103.8198, 5637000, 'Asia/Singapore'),
('London', 'England', 'United Kingdom', 'GB', 'ENG', 51.5074, -0.1278, 8982000, 'Europe/London'),
('New York City', 'New York', 'United States', 'US', 'NY', 40.7128, -74.0060, 8336817, 'America/New_York'),
('Los Angeles', 'California', 'United States', 'US', 'CA', 34.0522, -118.2437, 3979576, 'America/Los_Angeles'),
('Tokyo', 'Tokyo', 'Japan', 'JP', 'TY', 35.6762, 139.6503, 13960000, 'Asia/Tokyo')
on conflict (city, state, country) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  population = excluded.population,
  timezone = excluded.timezone;

-- 2. Alter profiles table
alter table public.profiles add column if not exists location_country text;
alter table public.profiles add column if not exists location_state text;
alter table public.profiles add column if not exists location_city text;
alter table public.profiles add column if not exists location_area text;
alter table public.profiles add column if not exists location_coordinates point;
alter table public.profiles add column if not exists location_verified boolean default false;
alter table public.profiles add column if not exists location_display text;
alter table public.profiles add column if not exists location_timezone text;
alter table public.profiles add column if not exists location_updated_at timestamptz;

alter table public.profiles add column if not exists platform_data jsonb default '{}';

alter table public.profiles add column if not exists avg_rating numeric(3,2);
alter table public.profiles add column if not exists review_count integer default 0;
alter table public.profiles add column if not exists avg_communication numeric(3,2);
alter table public.profiles add column if not exists avg_quality numeric(3,2);
alter table public.profiles add column if not exists avg_timeliness numeric(3,2);
alter table public.profiles add column if not exists avg_professionalism numeric(3,2);
alter table public.profiles add column if not exists avg_value numeric(3,2);

alter table public.profiles add column if not exists content_since_year integer;
alter table public.profiles add column if not exists content_styles text[];
alter table public.profiles add column if not exists preferred_deal_types text[];
alter table public.profiles add column if not exists collaboration_notes text;
alter table public.profiles add column if not exists typical_timeline_days integer;
alter table public.profiles add column if not exists contact_preference text;

alter table public.profiles add column if not exists Brand_score integer default 0;
alter table public.profiles add column if not exists score_breakdown jsonb;
alter table public.profiles add column if not exists availability_status text default 'available' check (availability_status in ('available','busy','on_break'));
alter table public.profiles add column if not exists availability_until date;
alter table public.profiles add column if not exists availability_note text;
alter table public.profiles add column if not exists trending_score integer default 0;

-- Index on coordinates
create index if not exists profiles_location_idx on public.profiles using gist(location_coordinates);

-- 3. Alter cards table
alter table public.cards add column if not exists location_requirement text check (location_requirement in ('none','preferred','required')) default 'none';
alter table public.cards add column if not exists location_countries text[];
alter table public.cards add column if not exists location_states text[];
alter table public.cards add column if not exists location_cities text[];
alter table public.cards add column if not exists location_radius_km integer;
alter table public.cards add column if not exists location_coordinates point;

-- 4. Alter reviews table
alter table public.reviews add column if not exists communication_rating integer check (communication_rating between 1 and 5);
alter table public.reviews add column if not exists quality_rating integer check (quality_rating between 1 and 5);
alter table public.reviews add column if not exists timeliness_rating integer check (timeliness_rating between 1 and 5);
alter table public.reviews add column if not exists professionalism_rating integer check (professionalism_rating between 1 and 5);
alter table public.reviews add column if not exists value_rating integer check (value_rating between 1 and 5);

-- 5. Helper Function: profile completeness percentage
create or replace function public.profile_completeness_pct(profile_id uuid)
returns integer as $$
declare
  p public.profiles%rowtype;
  score integer := 0;
begin
  select * into p from public.profiles where id = profile_id;
  if p.avatar_url is not null and p.avatar_url != '' then score := score + 10; end if;
  if p.bio is not null and length(p.bio) > 10 then score := score + 10; end if;
  if p.location_city is not null and p.location_city != '' then score := score + 15; end if;
  if p.platform_data is not null and p.platform_data != '{}'::jsonb then score := score + 20; end if;
  if (p.platform_data->>'instagram')::jsonb->>'audience' is not null 
     or (p.platform_data->>'youtube')::jsonb->>'audience' is not null 
     or (p.platform_data->>'tiktok')::jsonb->>'audience' is not null then 
    score := score + 15; 
  end if;
  if (select count(*) from public.portfolio_items where owner_id = profile_id) >= 3 then score := score + 15; end if;
  if p.niche is not null and cardinality(p.niche) > 0 then score := score + 10; end if;
  if p.typical_timeline_days is not null then score := score + 5; end if;
  return score;
end;
$$ language plpgsql security definer;

-- 6. Helper Function: calculate and update profile Brand_score
create or replace function public.update_profile_score(profile_id uuid)
returns integer as $$
declare
  p public.profiles%rowtype;
  completeness integer := 0;
  authenticity_score integer := 5; -- default
  rating_score integer := 0;
  completion_rate_score integer := 20; -- default/max
  response_time_score integer := 15; -- default/max
  total_score integer := 0;
  breakdown jsonb;
begin
  select * into p from public.profiles where id = profile_id;
  if p.role != 'influencer' then
    return 0;
  end if;

  -- A. Completeness (max 20 points, scaled from completeness percentage)
  completeness := round(public.profile_completeness_pct(profile_id) / 5.0)::integer;

  -- B. Verified status (max 10 points)
  if p.is_verified = true then
    authenticity_score := 10;
  else
    authenticity_score := 5;
  end if;

  -- C. Reviews (max 25 points)
  -- formula: LEAST(25, ROUND(COALESCE(avg_rating, 0) * review_count))
  rating_score := least(25, round(coalesce(p.avg_rating, 0) * coalesce(p.review_count, 0)))::integer;

  -- D. Collab Completion Rate (max 20 points)
  -- Defaulting to 20 for simplicity. Can expand based on active/completed rooms count.
  completion_rate_score := 20;

  -- E. Response Time (max 15 points)
  -- Defaulting to 12. If average reply latency is low, can be higher.
  response_time_score := 12;

  total_score := completeness + authenticity_score + rating_score + completion_rate_score + response_time_score;
  if total_score > 100 then
    total_score := 100;
  end if;

  breakdown := jsonb_build_object(
    'completeness', completeness,
    'verified', authenticity_score,
    'reviews', rating_score,
    'completion_rate', completion_rate_score,
    'response_time', response_time_score,
    'authenticity', 5 -- platform authenticity base
  );

  update public.profiles set
    Brand_score = total_score,
    score_breakdown = breakdown
  where id = profile_id;

  return total_score;
end;
$$ language plpgsql security definer;

-- 7. Trigger on profiles updates to recompute score
create or replace function public.trigger_update_profile_score()
returns trigger as $$
begin
  -- Avoid infinite recursion: only proceed if the score columns themselves didn't change
  if (tg_op = 'UPDATE' and (
      new.Brand_score is distinct from old.Brand_score or
      new.score_breakdown is distinct from old.score_breakdown
     )) then
    return new;
  end if;
  
  perform public.update_profile_score(new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists after_profile_update_score on public.profiles;
create trigger after_profile_update_score
after insert or update on public.profiles
for each row
execute function public.trigger_update_profile_score();

-- 8. Trigger on reviews to recompute ratings and scores
create or replace function public.update_profile_ratings()
returns trigger as $$
begin
  update public.profiles set
    avg_rating = (
      select avg((coalesce(communication_rating, rating) + coalesce(quality_rating, rating) + coalesce(timeliness_rating, rating) + coalesce(professionalism_rating, rating) + coalesce(value_rating, rating)) / 5.0)
      from public.reviews where reviewed_id = new.reviewed_id
    ),
    review_count = (select count(*) from public.reviews where reviewed_id = new.reviewed_id),
    avg_communication = (select avg(communication_rating) from public.reviews where reviewed_id = new.reviewed_id),
    avg_quality = (select avg(quality_rating) from public.reviews where reviewed_id = new.reviewed_id),
    avg_timeliness = (select avg(timeliness_rating) from public.reviews where reviewed_id = new.reviewed_id),
    avg_professionalism = (select avg(professionalism_rating) from public.reviews where reviewed_id = new.reviewed_id),
    avg_value = (select avg(value_rating) from public.reviews where reviewed_id = new.reviewed_id)
  where id = new.reviewed_id;

  -- Recompute the profile score since reviews updated!
  perform public.update_profile_score(new.reviewed_id);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists after_review_insert on public.reviews;
create trigger after_review_insert
after insert or update on public.reviews
for each row execute function public.update_profile_ratings();
