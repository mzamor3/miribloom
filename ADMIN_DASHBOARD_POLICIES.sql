-- Run once in Supabase SQL Editor after admin_users exists.

-- Admins can read all orders.
drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Admins can update fulfillment status.
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Admins can read customer names.
drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Admins can read Beauty Profiles.
drop policy if exists "Admins can view beauty profiles" on public.beauty_profiles;
create policy "Admins can view beauty profiles"
on public.beauty_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);
