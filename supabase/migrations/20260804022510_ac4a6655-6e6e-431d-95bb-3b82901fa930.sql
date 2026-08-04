REVOKE EXECUTE ON FUNCTION public.merge_employees(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_employees(uuid, uuid) TO authenticated, service_role;