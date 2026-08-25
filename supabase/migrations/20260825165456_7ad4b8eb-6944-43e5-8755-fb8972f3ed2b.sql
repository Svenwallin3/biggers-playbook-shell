create unique index if not exists locations_division_name_uk on public.locations (division, lower(name)) where is_deleted = false;
create unique index if not exists paths_track_name_uk on public.paths (track_id, lower(name)) where is_deleted = false;

drop policy if exists "GMs and owners can create locations" on public.locations;
drop policy if exists "GMs and owners can update locations" on public.locations;
drop policy if exists "Managers and owners can create locations" on public.locations;
drop policy if exists "Managers and owners can update locations" on public.locations;
drop policy if exists "Owners can create locations" on public.locations;
drop policy if exists "Owners can update locations" on public.locations;

create policy "Owners can create locations" on public.locations
  for insert to authenticated with check (public.has_tier('owner'));
create policy "Owners can update locations" on public.locations
  for update to authenticated using (public.has_tier('owner')) with check (public.has_tier('owner'));

drop policy if exists "GMs and owners can create paths" on public.paths;
drop policy if exists "GMs and owners can update paths" on public.paths;
drop policy if exists "Managers and owners can create paths" on public.paths;
drop policy if exists "Managers and owners can update paths" on public.paths;
drop policy if exists "Owners can create paths" on public.paths;
drop policy if exists "Owners can update paths" on public.paths;

create policy "Owners can create paths" on public.paths
  for insert to authenticated with check (public.has_tier('owner'));
create policy "Owners can update paths" on public.paths
  for update to authenticated using (public.has_tier('owner')) with check (public.has_tier('owner'));