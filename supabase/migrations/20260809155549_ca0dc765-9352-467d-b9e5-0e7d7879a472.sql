ALTER TABLE public.sourcing_board_entries ADD COLUMN IF NOT EXISTS photo_url text;

CREATE TABLE public.delivery_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_vendor text NOT NULL,
  issue_description text NOT NULL,
  photo_url text,
  reported_by uuid REFERENCES public.employees(id),
  assigned_to uuid REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_by uuid REFERENCES public.employees(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.delivery_issues TO authenticated;
GRANT ALL ON public.delivery_issues TO service_role;

ALTER TABLE public.delivery_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view delivery issues"
  ON public.delivery_issues FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and owners can create delivery issues"
  ON public.delivery_issues FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_owner());

CREATE POLICY "Managers and owners can update delivery issues"
  ON public.delivery_issues FOR UPDATE TO authenticated
  USING (public.is_manager_or_owner())
  WITH CHECK (public.is_manager_or_owner());

CREATE TRIGGER delivery_issues_updated_at
  BEFORE UPDATE ON public.delivery_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX delivery_issues_assigned_open_idx
  ON public.delivery_issues (assigned_to, status) WHERE is_deleted = false;