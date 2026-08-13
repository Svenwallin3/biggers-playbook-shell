ALTER TABLE public.steps
  ADD COLUMN day_position text NOT NULL DEFAULT 'middle';

UPDATE public.steps SET day_position = 'middle' WHERE day_position IS DISTINCT FROM 'middle';

ALTER TABLE public.steps
  ADD CONSTRAINT steps_day_position_check CHECK (day_position IN ('start','middle','end'));