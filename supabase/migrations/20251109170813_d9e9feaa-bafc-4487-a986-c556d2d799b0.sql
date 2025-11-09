-- Create enum for user roles
create type public.app_role as enum ('host', 'vip', 'user');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now() not null,
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Policy: Users can view their own roles
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Only admins can insert roles (manual assignment via backend)
create policy "Service role can manage roles"
on public.user_roles
for all
to service_role
using (true)
with check (true);

-- Create security definer function to check if user has a specific role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create helper function to check if user can create rooms (host or vip)
create or replace function public.can_create_room(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role in ('host', 'vip')
  )
$$;

-- Update game_rooms policy to restrict room creation to host/vip
drop policy if exists "Authenticated users can create game rooms" on public.game_rooms;

create policy "Host and VIP users can create game rooms"
on public.game_rooms
for insert
to authenticated
with check (
  auth.uid() = host_id 
  and public.can_create_room(auth.uid())
);