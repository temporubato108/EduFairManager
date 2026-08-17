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
