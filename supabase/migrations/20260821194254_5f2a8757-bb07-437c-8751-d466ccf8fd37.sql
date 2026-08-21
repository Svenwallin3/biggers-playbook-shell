-- Helper: the caller's own division(s), derived from department_scope (managers) and path (trainees)
CREATE OR REPLACE FUNCTION public.my_divisions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select array_remove(array[
    e.department_scope::text,
    case
      when lower(coalesce(e.path, '')) like 'kitchen%' then 'kitchen'
      when lower(coalesce(e.path, '')) like 'market%' then 'market'
      when lower(coalesce(e.path, '')) like 'delivery%' then 'delivery'
      when lower(coalesce(e.path, '')) like 'universal%' then 'universal'
      else null
    end
  ], null)
  from public.employees e
  where e.user_id = auth.uid() and e.status = 'active' and e.is_deleted = false
  limit 1
$$;

-- Helper: can the caller act on this checklist instance?
CREATE OR REPLACE FUNCTION public.can_access_checklist_instance(_instance_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select public.has_tier('owner') or exists (
    select 1
    from public.checklist_instances ci
    join public.reference_documents rd on rd.id = ci.reference_document_id
    where ci.id = _instance_id
      and (
        rd.departments = '{}'::text[]
        or 'universal' = any (rd.departments)
        or exists (select 1 from unnest(public.my_divisions()) d where d = any (rd.departments))
      )
      and (ci.location_tag is null or ci.location_tag = public.my_location())
  )
$$;

-- Helper: same scoping check evaluated from a parent document + location tag (for INSERT rows)
CREATE OR REPLACE FUNCTION public.can_access_checklist_scope(_reference_document_id uuid, _location_tag text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select public.has_tier('owner') or exists (
    select 1
    from public.reference_documents rd
    where rd.id = _reference_document_id
      and (
        rd.departments = '{}'::text[]
        or 'universal' = any (rd.departments)
        or exists (select 1 from unnest(public.my_divisions()) d where d = any (rd.departments))
      )
      and (_location_tag is null or _location_tag = public.my_location())
  )
$$;

REVOKE EXECUTE ON FUNCTION public.my_divisions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_checklist_instance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_checklist_scope(uuid, text) FROM anon;

-- checklist_instances
DROP POLICY IF EXISTS "Signed-in users can view checklist instances" ON public.checklist_instances;
DROP POLICY IF EXISTS "Signed-in users can create checklist instances" ON public.checklist_instances;
DROP POLICY IF EXISTS "Signed-in users can update checklist instances" ON public.checklist_instances;

CREATE POLICY "checklist_instances_select" ON public.checklist_instances
FOR SELECT TO authenticated
USING (public.can_access_checklist_scope(reference_document_id, location_tag));

CREATE POLICY "checklist_instances_insert" ON public.checklist_instances
FOR INSERT TO authenticated
WITH CHECK (public.can_access_checklist_scope(reference_document_id, location_tag));

CREATE POLICY "checklist_instances_update" ON public.checklist_instances
FOR UPDATE TO authenticated
USING (public.can_access_checklist_scope(reference_document_id, location_tag))
WITH CHECK (public.can_access_checklist_scope(reference_document_id, location_tag));

-- checklist_line_completions
DROP POLICY IF EXISTS "Signed-in users can view checklist line completions" ON public.checklist_line_completions;
DROP POLICY IF EXISTS "Signed-in users can create checklist line completions" ON public.checklist_line_completions;
DROP POLICY IF EXISTS "Signed-in users can update checklist line completions" ON public.checklist_line_completions;

CREATE POLICY "checklist_line_completions_select" ON public.checklist_line_completions
FOR SELECT TO authenticated
USING (public.can_access_checklist_instance(instance_id));

CREATE POLICY "checklist_line_completions_insert" ON public.checklist_line_completions
FOR INSERT TO authenticated
WITH CHECK (public.can_access_checklist_instance(instance_id));

CREATE POLICY "checklist_line_completions_update" ON public.checklist_line_completions
FOR UPDATE TO authenticated
USING (public.can_access_checklist_instance(instance_id))
WITH CHECK (public.can_access_checklist_instance(instance_id));