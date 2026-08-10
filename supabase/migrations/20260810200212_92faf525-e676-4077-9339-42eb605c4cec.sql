UPDATE public.steps
SET content_body = REPLACE(
  content_body,
  '70°F to 41°F within 4 more hours (6 total). Miss stage 1 and it''s tossed, no exceptions.',
  '70°F to 41°F within 4 more hours (6 total). Miss stage 1 cooling temps, bring to manager. '
)
WHERE id = '19381882-9301-4a12-a4ff-adee18530ef5';