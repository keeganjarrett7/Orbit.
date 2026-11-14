-- Run in Supabase SQL Editor. Enable Anonymous Sign-ins under Authentication > Providers.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','in_review','done')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  due_date date,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_status_idx on public.tasks(user_id,status);
alter table public.tasks enable row level security;
create policy "Users can view own tasks" on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own tasks" on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own tasks" on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own tasks" on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);
