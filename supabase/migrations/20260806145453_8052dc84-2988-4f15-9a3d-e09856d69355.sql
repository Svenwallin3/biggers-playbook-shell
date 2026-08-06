CREATE TYPE public.reference_document_type AS ENUM ('checklist', 'sop');

CREATE TABLE public.reference_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type public.reference_document_type NOT NULL,
  title text NOT NULL,
  departments text[] NOT NULL DEFAULT '{}',
  sub_category text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_status public.content_status NOT NULL DEFAULT 'missing',
  content_notes text,
  location_tag text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_by uuid REFERENCES public.employees(id),
  deleted_at timestamptz,
  updated_by uuid REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.reference_documents TO authenticated;
GRANT ALL ON public.reference_documents TO service_role;
ALTER TABLE public.reference_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_documents_read ON public.reference_documents
  FOR SELECT TO authenticated
  USING (
    is_manager_or_owner()
    OR ((NOT is_deleted) AND (
      departments = '{}'
      OR 'universal' = ANY (departments)
      OR (my_department())::text = ANY (departments)
    ))
  );

CREATE POLICY reference_documents_insert ON public.reference_documents
  FOR INSERT TO authenticated
  WITH CHECK (has_tier('owner'));

CREATE POLICY reference_documents_update ON public.reference_documents
  FOR UPDATE TO authenticated
  USING (has_tier('owner'))
  WITH CHECK (has_tier('owner'));

CREATE TRIGGER reference_documents_updated_at BEFORE UPDATE ON public.reference_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reference_documents_version BEFORE UPDATE ON public.reference_documents
  FOR EACH ROW EXECUTE FUNCTION public.record_version();

CREATE TABLE public.presentation_reference_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  item_name text NOT NULL,
  photo_url text,
  portion_note text,
  department text,
  location_tag text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_by uuid REFERENCES public.employees(id),
  deleted_at timestamptz,
  updated_by uuid REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.presentation_reference_entries TO authenticated;
GRANT ALL ON public.presentation_reference_entries TO service_role;
ALTER TABLE public.presentation_reference_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY presentation_entries_read ON public.presentation_reference_entries
  FOR SELECT TO authenticated
  USING (
    is_manager_or_owner()
    OR ((NOT is_deleted) AND (
      department IS NULL
      OR department = 'universal'
      OR department = (my_department())::text
    ))
  );

CREATE POLICY presentation_entries_insert ON public.presentation_reference_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    has_tier('owner')
    OR (has_tier('manager') AND (department IS NULL OR department = (my_department())::text))
  );

CREATE POLICY presentation_entries_update ON public.presentation_reference_entries
  FOR UPDATE TO authenticated
  USING (
    has_tier('owner')
    OR (has_tier('manager') AND (department IS NULL OR department = (my_department())::text))
  )
  WITH CHECK (
    has_tier('owner')
    OR (has_tier('manager') AND (department IS NULL OR department = (my_department())::text))
  );

CREATE TRIGGER presentation_entries_updated_at BEFORE UPDATE ON public.presentation_reference_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER presentation_entries_version BEFORE UPDATE ON public.presentation_reference_entries
  FOR EACH ROW EXECUTE FUNCTION public.record_version();

ALTER TABLE public.suggestion_queue
  ADD COLUMN reference_document_id uuid REFERENCES public.reference_documents(id);

ALTER TABLE public.steps ADD COLUMN video_url text;