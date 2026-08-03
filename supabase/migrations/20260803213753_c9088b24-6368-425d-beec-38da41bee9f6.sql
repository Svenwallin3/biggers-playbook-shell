
-- ============ ENUMS ============
create type public.auth_tier as enum ('staff','manager','owner');
create type public.department as enum ('universal','market','kitchen','delivery');
create type public.step_type as enum ('text','photo','video','quiz','doing_signoff','supervised_live_practice');
create type public.content_status as enum ('ready','needs_restructuring','missing','blocked');
create type public.progress_status as enum ('not_started','in_progress','completed','signed_off');
create type public.suggestion_status as enum ('pending','approved','rejected');
create type public.employee_status as enum ('active','inactive','merged');

-- ============ SHARED FUNCTIONS ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ EMPLOYEES ============
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text not null unique,
  full_name text,
  auth_tier public.auth_tier not null default 'staff',
  department_scope public.department,
  location_id text,
  path text,
  status public.employee_status not null default 'active',
  merged_into uuid references public.employees(id),
  is_deleted boolean not null default false,
  deleted_by uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;

create or replace function public.current_tier()
returns public.auth_tier language sql stable security definer set search_path = public as $$
  select auth_tier from public.employees where user_id = auth.uid() limit 1
$$;

create or replace function public.has_tier(_tier public.auth_tier)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees where user_id = auth.uid() and auth_tier = _tier)
$$;

create or replace function public.is_manager_or_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.employees where user_id = auth.uid() and auth_tier in ('manager','owner'))
$$;

create or replace function public.my_department()
returns public.department language sql stable security definer set search_path = public as $$
  select department_scope from public.employees where user_id = auth.uid() limit 1
$$;

create policy "employees_select_self" on public.employees for select to authenticated using (user_id = auth.uid());
create policy "employees_select_staff_directory" on public.employees for select to authenticated using (public.is_manager_or_owner());
create policy "employees_update_self" on public.employees for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "employees_owner_manage" on public.employees for update to authenticated using (public.has_tier('owner')) with check (public.has_tier('owner'));
create policy "employees_owner_insert" on public.employees for insert to authenticated with check (public.has_tier('owner'));

-- prevent self privilege escalation
create or replace function public.guard_auth_tier()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.auth_tier is distinct from old.auth_tier and not public.has_tier('owner') then
    raise exception 'Only owners can change auth_tier';
  end if;
  return new;
end; $$;
create trigger employees_guard_tier before update on public.employees
for each row execute function public.guard_auth_tier();
create trigger employees_updated_at before update on public.employees
for each row execute function public.update_updated_at_column();

-- auto-create employee row on first magic-link sign in
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.employees (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (email) do update set user_id = excluded.user_id;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ TRACKS ============
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  department public.department not null,
  description text,
  sequence_order int not null default 0,
  location_tag text,
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.tracks to authenticated;
grant all on public.tracks to service_role;
alter table public.tracks enable row level security;
create policy "tracks_read" on public.tracks for select to authenticated using (not is_deleted or public.is_manager_or_owner());
create policy "tracks_write_mgr" on public.tracks for update to authenticated using (public.has_tier('owner') or (public.has_tier('manager') and department = public.my_department())) with check (public.has_tier('owner') or (public.has_tier('manager') and department = public.my_department()));
create policy "tracks_insert_mgr" on public.tracks for insert to authenticated with check (public.has_tier('owner') or (public.has_tier('manager') and department = public.my_department()));
create trigger tracks_updated_at before update on public.tracks for each row execute function public.update_updated_at_column();

-- ============ MODULES ============
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id),
  slug text not null unique,
  name text not null,
  description text,
  sub_path text,
  day_assignment int,
  sequence_order int not null default 0,
  is_assignable boolean not null default false,
  location_tag text,
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.modules to authenticated;
grant all on public.modules to service_role;
alter table public.modules enable row level security;
create policy "modules_read" on public.modules for select to authenticated using (not is_deleted or public.is_manager_or_owner());
create policy "modules_insert" on public.modules for insert to authenticated with check (public.has_tier('owner') or (public.has_tier('manager') and exists (select 1 from public.tracks t where t.id = track_id and t.department = public.my_department())));
create policy "modules_update" on public.modules for update to authenticated using (public.has_tier('owner') or (public.has_tier('manager') and exists (select 1 from public.tracks t where t.id = track_id and t.department = public.my_department()))) with check (public.has_tier('owner') or (public.has_tier('manager') and exists (select 1 from public.tracks t where t.id = track_id and t.department = public.my_department())));
create trigger modules_updated_at before update on public.modules for each row execute function public.update_updated_at_column();

-- ============ STEPS ============
create table public.steps (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id),
  title text not null,
  step_type public.step_type not null default 'text',
  content_status public.content_status not null default 'missing',
  content_body text,
  content_notes text,
  media_url text,
  sequence_order int not null default 0,
  location_tag text,
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.steps to authenticated;
grant all on public.steps to service_role;
alter table public.steps enable row level security;
create policy "steps_read" on public.steps for select to authenticated using (not is_deleted or public.is_manager_or_owner());
create policy "steps_insert" on public.steps for insert to authenticated with check (public.has_tier('owner') or (public.has_tier('manager') and exists (select 1 from public.modules m join public.tracks t on t.id = m.track_id where m.id = module_id and t.department = public.my_department())));
create policy "steps_update" on public.steps for update to authenticated using (public.has_tier('owner') or (public.has_tier('manager') and exists (select 1 from public.modules m join public.tracks t on t.id = m.track_id where m.id = module_id and t.department = public.my_department()))) with check (public.has_tier('owner') or (public.has_tier('manager') and exists (select 1 from public.modules m join public.tracks t on t.id = m.track_id where m.id = module_id and t.department = public.my_department())));
create trigger steps_updated_at before update on public.steps for each row execute function public.update_updated_at_column();

-- ============ PROGRESS RECORDS ============
create table public.progress_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  step_id uuid not null references public.steps(id),
  status public.progress_status not null default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  signed_off_by uuid references public.employees(id),
  signed_off_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, step_id)
);
grant select, insert, update on public.progress_records to authenticated;
grant all on public.progress_records to service_role;
alter table public.progress_records enable row level security;
create policy "progress_read_own" on public.progress_records for select to authenticated using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_manager_or_owner());
create policy "progress_insert_own" on public.progress_records for insert to authenticated with check (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_manager_or_owner());
create policy "progress_update" on public.progress_records for update to authenticated using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_manager_or_owner()) with check (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_manager_or_owner());
create trigger progress_updated_at before update on public.progress_records for each row execute function public.update_updated_at_column();

-- ============ QUIZ BANK / ATTEMPTS ============
create table public.quiz_bank (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.steps(id),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_option int not null default 0,
  explanation text,
  sequence_order int not null default 0,
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.quiz_bank to authenticated;
grant all on public.quiz_bank to service_role;
alter table public.quiz_bank enable row level security;
create policy "quiz_read" on public.quiz_bank for select to authenticated using (not is_deleted or public.is_manager_or_owner());
create policy "quiz_insert" on public.quiz_bank for insert to authenticated with check (public.is_manager_or_owner());
create policy "quiz_update" on public.quiz_bank for update to authenticated using (public.is_manager_or_owner()) with check (public.is_manager_or_owner());
create trigger quiz_updated_at before update on public.quiz_bank for each row execute function public.update_updated_at_column();

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  quiz_id uuid not null references public.quiz_bank(id),
  chosen_option int,
  is_correct boolean,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
alter table public.quiz_attempts enable row level security;
create policy "attempts_read" on public.quiz_attempts for select to authenticated using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_manager_or_owner());
create policy "attempts_insert_own" on public.quiz_attempts for insert to authenticated with check (employee_id in (select id from public.employees where user_id = auth.uid()));
create trigger attempts_updated_at before update on public.quiz_attempts for each row execute function public.update_updated_at_column();

-- ============ SUGGESTION QUEUE ============
create table public.suggestion_queue (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references public.steps(id),
  module_id uuid references public.modules(id),
  submitted_by uuid not null references public.employees(id),
  field_what text not null,
  field_how text,
  field_how_you_know text,
  status public.suggestion_status not null default 'pending',
  reviewed_by uuid references public.employees(id),
  reviewed_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.suggestion_queue to authenticated;
grant all on public.suggestion_queue to service_role;
alter table public.suggestion_queue enable row level security;
create policy "suggestions_read" on public.suggestion_queue for select to authenticated using (submitted_by in (select id from public.employees where user_id = auth.uid()) or public.is_manager_or_owner());
create policy "suggestions_insert" on public.suggestion_queue for insert to authenticated with check (submitted_by in (select id from public.employees where user_id = auth.uid()));
create policy "suggestions_review" on public.suggestion_queue for update to authenticated using (public.has_tier('owner')) with check (public.has_tier('owner'));
create trigger suggestions_updated_at before update on public.suggestion_queue for each row execute function public.update_updated_at_column();

-- ============ VERSION HISTORY ============
create table public.version_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  changed_by uuid,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
grant select on public.version_history to authenticated;
grant all on public.version_history to service_role;
alter table public.version_history enable row level security;
create policy "history_read" on public.version_history for select to authenticated using (public.is_manager_or_owner());

create or replace function public.record_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.version_history (entity_type, entity_id, changed_by, snapshot)
  values (tg_table_name, old.id, auth.uid(), to_jsonb(old));
  return new;
end; $$;
create trigger tracks_version before update on public.tracks for each row execute function public.record_version();
create trigger modules_version before update on public.modules for each row execute function public.record_version();
create trigger steps_version before update on public.steps for each row execute function public.record_version();

-- ============ SOURCING BOARD ============
create table public.sourcing_board_entries (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  region text,
  supplier text,
  since_date date,
  notes text,
  location_tag text,
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.sourcing_board_entries to authenticated;
grant all on public.sourcing_board_entries to service_role;
alter table public.sourcing_board_entries enable row level security;
create policy "sourcing_read" on public.sourcing_board_entries for select to authenticated using (not is_deleted or public.is_manager_or_owner());
create policy "sourcing_insert" on public.sourcing_board_entries for insert to authenticated with check (public.is_manager_or_owner());
create policy "sourcing_update" on public.sourcing_board_entries for update to authenticated using (public.is_manager_or_owner()) with check (public.is_manager_or_owner());
create trigger sourcing_updated_at before update on public.sourcing_board_entries for each row execute function public.update_updated_at_column();

-- ============ ASSIGNABLE MODULE ASSIGNMENTS ============
create table public.assignable_module_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  module_id uuid not null references public.modules(id),
  assigned_by uuid references public.employees(id),
  due_date date,
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, module_id)
);
grant select, insert, update on public.assignable_module_assignments to authenticated;
grant all on public.assignable_module_assignments to service_role;
alter table public.assignable_module_assignments enable row level security;
create policy "assignments_read" on public.assignable_module_assignments for select to authenticated using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.is_manager_or_owner());
create policy "assignments_insert" on public.assignable_module_assignments for insert to authenticated with check (public.is_manager_or_owner());
create policy "assignments_update" on public.assignable_module_assignments for update to authenticated using (public.is_manager_or_owner()) with check (public.is_manager_or_owner());
create trigger assignments_updated_at before update on public.assignable_module_assignments for each row execute function public.update_updated_at_column();

-- ============ NO HARD DELETES ANYWHERE ============
revoke delete on all tables in schema public from authenticated, anon;
