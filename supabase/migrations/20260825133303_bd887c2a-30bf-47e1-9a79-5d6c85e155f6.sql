create table public.locations (
  id uuid primary key default gen_random_uuid(),
  division department not null,
  name text not null,
  is_active boolean not null default true,
  sequence_order integer not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.locations to authenticated;
grant all on public.locations to service_role;
alter table public.locations enable row level security;
create policy "Locations readable by authenticated" on public.locations for select to authenticated using (true);
create policy "GMs and owners create locations" on public.locations for insert to authenticated with check (public.is_gm() or public.has_tier('owner'));
create policy "GMs and owners update locations" on public.locations for update to authenticated using (public.is_gm() or public.has_tier('owner')) with check (public.is_gm() or public.has_tier('owner'));
create trigger locations_updated_at before update on public.locations for each row execute function public.update_updated_at_column();

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id),
  name text not null,
  is_active boolean not null default true,
  sequence_order integer not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.paths to authenticated;
grant all on public.paths to service_role;
alter table public.paths enable row level security;
create policy "Paths readable by authenticated" on public.paths for select to authenticated using (true);
create policy "GMs and owners create paths" on public.paths for insert to authenticated with check (public.is_gm() or public.has_tier('owner'));
create policy "GMs and owners update paths" on public.paths for update to authenticated using (public.is_gm() or public.has_tier('owner')) with check (public.is_gm() or public.has_tier('owner'));
create trigger paths_updated_at before update on public.paths for each row execute function public.update_updated_at_column();

insert into public.locations (division, name, sequence_order) values
  ('market', 'Market Street', 1),
  ('market', 'Carolina Beach Road', 2);

insert into public.paths (track_id, name, sequence_order)
select id, 'Production', 1 from public.tracks where department = 'kitchen' and is_deleted = false;
insert into public.paths (track_id, name, sequence_order)
select id, 'Service', 2 from public.tracks where department = 'kitchen' and is_deleted = false;

drop policy "GMs can update staff and managers in their scope" on public.employees;

alter table public.employees
  alter column location_id type uuid using nullif(location_id, '')::uuid;

create policy "GMs can update staff and managers in their scope"
on public.employees for update to authenticated
using (
  is_gm() and department_scope = my_department()
  and not (location_id is distinct from nullif(my_location(), '')::uuid)
  and auth_tier <> 'owner'::auth_tier
)
with check (
  is_gm() and department_scope = my_department()
  and not (location_id is distinct from nullif(my_location(), '')::uuid)
  and auth_tier <> 'owner'::auth_tier
);

alter table public.employees
  add constraint employees_location_id_fkey foreign key (location_id) references public.locations(id) on delete set null;

create or replace function public.my_location()
returns text
language sql
stable security definer
set search_path to 'public'
as $$
  select location_id::text from public.employees
  where user_id = auth.uid() and status = 'active' and is_deleted = false
  limit 1
$$;

alter table public.modules add column path_id uuid references public.paths(id);
alter table public.employees add column path_id uuid references public.paths(id);
alter table public.employee_secondary_divisions add column path_id uuid references public.paths(id);

update public.modules m
set path_id = p.id
from public.paths p
join public.tracks t on t.id = p.track_id
where t.id = m.track_id
  and (
    (p.name = 'Production' and m.path in ('Production', 'Weekday Production'))
    or (p.name = 'Service' and m.path = 'Service')
  );