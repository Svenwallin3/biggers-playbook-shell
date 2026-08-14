create table public.step_blocks (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.steps(id),
  block_type text not null check (block_type in ('heading','paragraph','list','photo','gallery','video','label_value','danger_zone')),
  payload jsonb not null default '{}',
  sequence_order int not null default 0,
  is_deleted boolean not null default false,
  deleted_by uuid references public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index step_blocks_step_id_idx on public.step_blocks (step_id, sequence_order);

grant select, insert, update on public.step_blocks to authenticated;
grant all on public.step_blocks to service_role;

alter table public.step_blocks enable row level security;

create policy "Employees can read active step blocks"
on public.step_blocks for select to authenticated
using (is_deleted = false or public.is_manager_or_owner());

create policy "Owners and scoped GMs can insert step blocks"
on public.step_blocks for insert to authenticated
with check (
  public.has_tier('owner')
  or (
    public.is_gm()
    and exists (
      select 1 from public.steps s
      join public.modules m on m.id = s.module_id
      join public.tracks t on t.id = m.track_id
      where s.id = step_blocks.step_id
        and t.department = public.my_department()
    )
  )
);

create policy "Owners and scoped GMs can update step blocks"
on public.step_blocks for update to authenticated
using (
  public.has_tier('owner')
  or (
    public.is_gm()
    and exists (
      select 1 from public.steps s
      join public.modules m on m.id = s.module_id
      join public.tracks t on t.id = m.track_id
      where s.id = step_blocks.step_id
        and t.department = public.my_department()
    )
  )
)
with check (
  public.has_tier('owner')
  or (
    public.is_gm()
    and exists (
      select 1 from public.steps s
      join public.modules m on m.id = s.module_id
      join public.tracks t on t.id = m.track_id
      where s.id = step_blocks.step_id
        and t.department = public.my_department()
    )
  )
);

create trigger step_blocks_updated_at
before update on public.step_blocks
for each row execute function public.update_updated_at_column();

create trigger step_blocks_version
before update on public.step_blocks
for each row execute function public.record_version();