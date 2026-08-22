CREATE OR REPLACE FUNCTION public.can_cross_train(_employee_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when public.has_tier('owner') then true
    when public.is_gm() then exists (
      select 1
      from public.employees me
      join public.employees target on target.id = _employee_id
      where me.user_id = auth.uid()
        and me.department_scope is not null
        and lower(coalesce(target.path, '')) = lower(me.department_scope::text)
        and (
          me.department_scope <> 'market'
          or me.location_id is null
          or me.location_id = target.location_id
        )
    )
    else false
  end
$function$;