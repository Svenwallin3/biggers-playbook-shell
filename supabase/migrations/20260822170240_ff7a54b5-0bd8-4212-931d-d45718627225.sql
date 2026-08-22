CREATE TABLE public.employee_secondary_divisions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  department public.department not null,
  sub_path text,
  assigned_by uuid references public.employees(id),
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE UNIQUE INDEX employee_secondary_divisions_active_uniq
  ON public.employee_secondary_divisions (employee_id, department)
  WHERE is_deleted = false;

GRANT SELECT, INSERT, UPDATE ON public.employee_secondary_divisions TO authenticated;
GRANT ALL ON public.employee_secondary_divisions TO service_role;

ALTER TABLE public.employee_secondary_divisions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_cross_train(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select case
    when public.has_tier('owner') then true
    when public.is_gm() then exists (
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

REVOKE ALL ON FUNCTION public.can_cross_train(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_cross_train(uuid) TO authenticated;

CREATE POLICY "secondary_divisions_select" ON public.employee_secondary_divisions
  FOR SELECT TO authenticated
  USING (
    public.is_manager_or_owner()
    OR exists (
      select 1 from public.employees e
      where e.id = employee_id and e.user_id = auth.uid()
    )
  );

CREATE POLICY "secondary_divisions_insert" ON public.employee_secondary_divisions
  FOR INSERT TO authenticated
  WITH CHECK (public.can_cross_train(employee_id));

CREATE POLICY "secondary_divisions_update" ON public.employee_secondary_divisions
  FOR UPDATE TO authenticated
  USING (public.can_cross_train(employee_id))
  WITH CHECK (public.can_cross_train(employee_id));

CREATE TRIGGER update_employee_secondary_divisions_updated_at
  BEFORE UPDATE ON public.employee_secondary_divisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_manage_progress_for(_employee_id uuid, _step_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select case
    when public.has_tier('owner') then true
    when public.has_tier('manager') then (
      exists (
        select 1
        from public.steps s
        join public.modules m on m.id = s.module_id
        join public.tracks t on t.id = m.track_id
        where s.id = _step_id
          and t.department = 'universal'
      )
      or exists (
        select 1
        from public.employees me
        join public.employees target on target.id = _employee_id
        join public.steps s on s.id = _step_id
        join public.modules m on m.id = s.module_id
        join public.tracks t on t.id = m.track_id
        where me.user_id = auth.uid()
          and me.department_scope is not null
          and t.department = me.department_scope
          and (
            me.department_scope <> 'market'
            or me.location_id is null
            or me.location_id = target.location_id
          )
      )
    )
    else false
  end
$$;