create or replace function public.can_manage_progress_for(_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.has_tier('owner') then true
    when public.has_tier('manager') then exists (
      select 1
      from public.employees me
      join public.employees target on target.id = _employee_id
      where me.user_id = auth.uid()
        and me.department_scope is not null
        and lower(coalesce(target.path, '')) like left(me.department_scope::text, 6) || '%'
        and (
          me.department_scope <> 'market'
          or me.location_id is null
          or me.location_id = target.location_id
        )
    )
    else false
  end
$$;

drop policy if exists progress_read_own on public.progress_records;
drop policy if exists progress_insert_own on public.progress_records;
drop policy if exists progress_update on public.progress_records;

create policy progress_read_own on public.progress_records
for select to authenticated
using (
  employee_id in (select id from public.employees where user_id = auth.uid())
  or public.can_manage_progress_for(employee_id)
);

create policy progress_insert_own on public.progress_records
for insert to authenticated
with check (
  employee_id in (select id from public.employees where user_id = auth.uid())
  or public.can_manage_progress_for(employee_id)
);

create policy progress_update on public.progress_records
for update to authenticated
using (
  employee_id in (select id from public.employees where user_id = auth.uid())
  or public.can_manage_progress_for(employee_id)
)
with check (
  employee_id in (select id from public.employees where user_id = auth.uid())
  or public.can_manage_progress_for(employee_id)
);