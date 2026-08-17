-- EduFair Manager - Supabase Database Schema SQL
-- Target Database: PostgreSQL (Supabase)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 0. TRIGGERS & UTILITY FUNCTIONS
-- ==========================================

-- Function to update updated_at timestamp automatically
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ==========================================
-- 1. TABLES CREATION
-- ==========================================

-- 1.1. TEACHERS (Profiles linking to auth.users)
create table public.teachers (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  name text not null,
  role text not null default 'operator' check (role in ('admin', 'operator')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 1.2. EVENTS (Event entities)
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  date date not null,
  status text default 'ready' not null check (status in ('ready', 'progress', 'end')),
  allow_double_participation boolean default false not null,
  is_template boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 1.3. BOOTHS (Booth entities)
create table public.booths (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  name text not null,
  description text,
  operator_id uuid references public.teachers(id) on delete set null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 1.4. STUDENTS (Student entities)
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  student_number text not null, -- e.g., "60123"
  name text not null,
  qr_code text not null, -- unique per event token
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  
  -- Constraints: Unique student number and qr code per event
  constraint unique_student_number_per_event unique (event_id, student_number),
  constraint unique_qr_code_per_event unique (event_id, qr_code)
);

-- 1.5. PARTICIPATIONS (Scanning records)
create table public.participations (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  booth_id uuid references public.booths(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  scanned_by uuid references public.teachers(id) on delete set null,
  scanned_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone -- For soft delete/cancel scan
);

-- 1.6. LOGS (System log audit trail)
create table public.logs (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete set null,
  user_id uuid references public.teachers(id) on delete set null,
  action text not null, -- e.g., 'SCAN_SUCCESS', 'SCAN_CANCEL', 'IMPORT_STUDENTS'
  details jsonb,
  created_at timestamp with time zone default now() not null
);

-- 1.7. SETTINGS (Global and Event specific configurations)
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now() not null
);

-- ==========================================
-- 2. INDEX OPTIMIZATIONS
-- ==========================================

-- Optimize student query by qr_code and student_number
create index idx_students_qr_code on public.students(qr_code) where deleted_at is null;
create index idx_students_event_number on public.students(event_id, student_number) where deleted_at is null;

-- Optimize booth lookup per event
create index idx_booths_event on public.booths(event_id) where deleted_at is null;

-- Optimize participation queries (For double-scan prevention and real-time dashboard)
create index idx_participations_duplicate_check on public.participations(booth_id, student_id) where deleted_at is null;
create index idx_participations_event on public.participations(event_id) where deleted_at is null;
create index idx_participations_student on public.participations(student_id) where deleted_at is null;

-- Optimize log lookup
create index idx_logs_created_at on public.logs(created_at desc);

-- ==========================================
-- 3. TIMESTAMP TRIGGERS BINDING
-- ==========================================
create trigger trigger_update_teachers_timestamp before update on public.teachers for each row execute procedure public.handle_updated_at();
create trigger trigger_update_events_timestamp before update on public.events for each row execute procedure public.handle_updated_at();
create trigger trigger_update_booths_timestamp before update on public.booths for each row execute procedure public.handle_updated_at();
create trigger trigger_update_students_timestamp before update on public.students for each row execute procedure public.handle_updated_at();
create trigger trigger_update_settings_timestamp before update on public.settings for each row execute procedure public.handle_updated_at();

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
alter table public.teachers enable row level security;
alter table public.events enable row level security;
alter table public.booths enable row level security;
alter table public.students enable row level security;
alter table public.participations enable row level security;
alter table public.logs enable row level security;
alter table public.settings enable row level security;

-- Helper security definer function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.teachers
    where id = auth.uid() and role = 'admin' and deleted_at is null
  );
end;
$$ language plpgsql security definer;

-- 4.1. TEACHERS POLICIES
create policy "Allow authenticated users to read teacher profiles"
  on public.teachers for select
  using (auth.role() = 'authenticated');

create policy "Allow admins to manage teacher profiles"
  on public.teachers for all
  using (public.is_admin());

create policy "Allow teachers to update their own profile"
  on public.teachers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4.2. EVENTS POLICIES
create policy "Allow public read access to active events"
  on public.events for select
  using (deleted_at is null);

create policy "Allow admins to manage events"
  on public.events for all
  using (public.is_admin());

-- 4.3. BOOTHS POLICIES
create policy "Allow public read access to active booths"
  on public.booths for select
  using (deleted_at is null);

create policy "Allow admins to manage booths"
  on public.booths for all
  using (public.is_admin());

-- 4.4. STUDENTS POLICIES
create policy "Allow authenticated users to view all students"
  on public.students for select
  using (auth.role() = 'authenticated');

create policy "Allow public read access to student by QR Code (Stampbook)"
  on public.students for select
  using (deleted_at is null);

create policy "Allow admins to manage students"
  on public.students for all
  using (public.is_admin());

-- 4.5. PARTICIPATIONS POLICIES
create policy "Allow authenticated users to view all participations"
  on public.participations for select
  using (auth.role() = 'authenticated');

create policy "Allow public read access to participations"
  on public.participations for select
  using (deleted_at is null);

create policy "Allow authenticated operators to insert participations"
  on public.participations for insert
  with check (auth.role() = 'authenticated');

create policy "Allow operators to cancel their own scans"
  on public.participations for update
  using (auth.role() = 'authenticated' and (auth.uid() = scanned_by or public.is_admin()));

create policy "Allow admins to hard delete participations"
  on public.participations for delete
  using (public.is_admin());

-- 4.6. LOGS POLICIES
create policy "Allow admins to view logs"
  on public.logs for select
  using (public.is_admin());

create policy "Allow authenticated users to insert logs"
  on public.logs for insert
  with check (auth.role() = 'authenticated');

-- 4.7. SETTINGS POLICIES
create policy "Allow public read access to settings"
  on public.settings for select
  using (true);

create policy "Allow admins to manage settings"
  on public.settings for all
  using (public.is_admin());
