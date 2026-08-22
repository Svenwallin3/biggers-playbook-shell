CREATE OR REPLACE FUNCTION public.guard_auth_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if public.has_tier('owner') then
    return new;
  end if;

  if public.is_gm() then
    if old.department_scope is distinct from public.my_department()
       or old.location_id is distinct from public.my_location() then
      raise exception 'You can only manage employees in your own department and location';
    end if;
    if old.auth_tier = 'owner' or new.auth_tier = 'owner' then
      raise exception 'Only owners can grant or revoke owner access';
    end if;
    if new.can_manage_team is distinct from old.can_manage_team then
      raise exception 'Only owners can change General Manager status';
    end if;
    if new.auth_tier is distinct from old.auth_tier and new.auth_tier not in ('staff','manager') then
      raise exception 'General Managers can only set staff or manager tier';
    end if;
    if new.status is distinct from old.status and new.status not in ('active','inactive') then
      raise exception 'General Managers can only set active or inactive status';
    end if;
    if new.full_name is distinct from old.full_name
      or new.email is distinct from old.email
      or new.department_scope is distinct from old.department_scope
      or new.location_id is distinct from old.location_id
      or new.path is distinct from old.path then
      raise exception 'General Managers can only change auth_tier and status for employees in their scope';
    end if;
    return new;
  end if;

  if new.auth_tier is distinct from old.auth_tier then
    raise exception 'Only owners can change auth_tier';
  end if;
  if new.can_manage_team is distinct from old.can_manage_team then
    raise exception 'Only owners can change General Manager status';
  end if;
  if new.path is distinct from old.path
    or new.department_scope is distinct from old.department_scope
    or new.location_id is distinct from old.location_id
    or new.status is distinct from old.status then
    raise exception 'Only managers or owners can change division, scope, location, or status';
  end if;
  return new;
end;
$function$;