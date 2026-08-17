ALTER TABLE public.steps
  ADD COLUMN IF NOT EXISTS card_override_text text,
  ADD COLUMN IF NOT EXISTS hide_module_card boolean NOT NULL DEFAULT false;