-- Only create an employee record once the person has verified their email.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new;
  end if;
  insert into public.employees (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (email) do update set user_id = excluded.user_id;
  return new;
end; $function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_new_user();

-- Hide the one record created from a mistyped, never-verified email (soft delete).
update public.employees
set is_deleted = true, deleted_at = now()
where id = 'ca22eccf-dc41-432a-8de3-7fcfd590f316';