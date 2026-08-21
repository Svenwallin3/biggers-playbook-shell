REVOKE EXECUTE ON FUNCTION public.get_quiz_questions(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_answer(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_quiz_answer(uuid, integer) TO authenticated, service_role;