-- 1) Hide the answer key: only GM/Owner can read quiz_bank rows directly.
DROP POLICY IF EXISTS quiz_read ON public.quiz_bank;
CREATE POLICY quiz_read ON public.quiz_bank
FOR SELECT TO authenticated
USING (public.is_gm() OR public.has_tier('owner'));

-- 2) Safe question feed for trainees (no correct_option / explanation).
CREATE OR REPLACE FUNCTION public.get_quiz_questions(_step_ids uuid[])
RETURNS TABLE (
  id uuid,
  step_id uuid,
  question text,
  options jsonb,
  sequence_order integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select q.id, q.step_id, q.question, q.options, q.sequence_order
  from public.quiz_bank q
  where q.step_id = any(_step_ids)
    and q.is_deleted = false
    and auth.uid() is not null
  order by q.sequence_order
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid[]) TO authenticated;

-- 3) Server-side grading: records the attempt, then reveals correctness + explanation.
CREATE OR REPLACE FUNCTION public.submit_quiz_answer(_quiz_id uuid, _chosen_option integer)
RETURNS TABLE (
  is_correct boolean,
  correct_option integer,
  explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_quiz public.quiz_bank%rowtype;
  v_employee uuid;
  v_correct boolean;
begin
  select id into v_employee from public.employees
  where user_id = auth.uid() and is_deleted = false limit 1;
  if v_employee is null then
    raise exception 'No employee record for the current user';
  end if;

  select * into v_quiz from public.quiz_bank where id = _quiz_id and is_deleted = false;
  if not found then
    raise exception 'Question not found';
  end if;

  v_correct := (_chosen_option = v_quiz.correct_option);

  insert into public.quiz_attempts (employee_id, quiz_id, chosen_option, is_correct)
  values (v_employee, _quiz_id, _chosen_option, v_correct);

  return query select v_correct, v_quiz.correct_option, v_quiz.explanation;
end;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_answer(uuid, integer) TO authenticated;