ALTER TABLE public.sourcing_board_entries
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS seasonality text;