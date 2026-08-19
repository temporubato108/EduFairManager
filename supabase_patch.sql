-- EduFair Manager - Database Patch Script
-- Run this in Supabase SQL Editor if you previously created tables with older definitions

-- 1. Fix participations table
alter table public.participations add column if not exists created_at timestamp with time zone default now();
update public.participations set created_at = scanned_at where created_at is null;

-- 2. Fix logs table
alter table public.logs add column if not exists operator_id uuid references public.teachers(id) on delete set null;
alter table public.logs add column if not exists action_type text;
alter table public.logs add column if not exists details text;
alter table public.logs alter column action drop not null;

-- 3. Fix settings table
alter table public.settings alter column value type text using value::text;

-- 4. Fix booths table to support custom typed operator name
alter table public.booths add column if not exists operator_name text;

-- 5. Fix RLS policies for Kiosk and public access
drop policy if exists "Allow authenticated operators to insert participations" on public.participations;
create policy "Allow insert participations" on public.participations for insert with check (true);

drop policy if exists "Allow public read access to participations" on public.participations;
create policy "Allow public read access to participations" on public.participations for select using (true);

drop policy if exists "Allow authenticated users to insert logs" on public.logs;
create policy "Allow insert logs" on public.logs for insert with check (true);

