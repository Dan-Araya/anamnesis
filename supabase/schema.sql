create table if not exists public.user_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_backups enable row level security;

revoke all on table public.user_backups from anon;
grant select, insert, update, delete on table public.user_backups to authenticated;

create policy "users read their own backup"
on public.user_backups for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users create their own backup"
on public.user_backups for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users update their own backup"
on public.user_backups for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users delete their own backup"
on public.user_backups for delete
to authenticated
using ((select auth.uid()) = user_id);
