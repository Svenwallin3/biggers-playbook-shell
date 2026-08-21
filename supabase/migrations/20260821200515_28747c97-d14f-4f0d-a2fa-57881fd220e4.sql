DO $$
declare
  v_uid uuid;
  v_quiz uuid;
  v_res record;
begin
  select user_id into v_uid from public.employees where user_id is not null and is_deleted = false limit 1;
  select id into v_quiz from public.quiz_bank where is_deleted = false limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  select * into v_res from public.submit_quiz_answer(v_quiz, 0);
  raise notice 'graded is_correct=% attempts=%', v_res.is_correct, (select count(*) from public.quiz_attempts where quiz_id = v_quiz);
  -- smoke test only: remove the synthetic attempt
  delete from public.quiz_attempts where quiz_id = v_quiz and employee_id in (select id from public.employees where user_id = v_uid);
end $$;