CREATE OR REPLACE FUNCTION public.merge_employees(_primary uuid, _duplicate uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid;
BEGIN
  IF NOT public.has_tier('owner') THEN
    RAISE EXCEPTION 'Only owners can merge employee records';
  END IF;
  IF _primary = _duplicate THEN
    RAISE EXCEPTION 'Cannot merge a record into itself';
  END IF;

  SELECT id INTO _actor FROM public.employees WHERE user_id = auth.uid() LIMIT 1;

  -- Move progress, skipping steps the primary already has a record for.
  DELETE FROM public.progress_records d
  WHERE d.employee_id = _duplicate
    AND EXISTS (
      SELECT 1 FROM public.progress_records p
      WHERE p.employee_id = _primary AND p.step_id = d.step_id
    );
  UPDATE public.progress_records SET employee_id = _primary WHERE employee_id = _duplicate;

  UPDATE public.quiz_attempts SET employee_id = _primary WHERE employee_id = _duplicate;
  UPDATE public.suggestion_queue SET submitted_by = _primary WHERE submitted_by = _duplicate;
  UPDATE public.suggestion_queue SET reviewed_by = _primary WHERE reviewed_by = _duplicate;
  UPDATE public.version_history SET changed_by = _primary WHERE changed_by = _duplicate;

  DELETE FROM public.assignable_module_assignments d
  WHERE d.employee_id = _duplicate
    AND EXISTS (
      SELECT 1 FROM public.assignable_module_assignments p
      WHERE p.employee_id = _primary AND p.module_id = d.module_id
    );
  UPDATE public.assignable_module_assignments SET employee_id = _primary WHERE employee_id = _duplicate;

  UPDATE public.employees
  SET status = 'merged',
      merged_into = _primary,
      is_deleted = true,
      deleted_by = _actor,
      deleted_at = now()
  WHERE id = _duplicate;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_employees(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.merge_employees(uuid, uuid) TO authenticated;