-- Update the TCS food training step with more descriptive text
UPDATE public.steps
SET 
  title = 'What counts as TCS (Time/Temp Control Safety) food',
  content_body = REPLACE(
    content_body, 
    'Between cold and hot holding — this is where product goes bad and people get sick',
    'Between cold(41) and hot(135) holding — this is where product goes bad and people get sick'
  )
WHERE title = 'What counts as TCS food'
   OR title = 'What counts as a Time/Temperature Control for Safety (TCS) food';

-- Also update any existing occurrences of the plain body text just in case title varies
UPDATE public.steps
SET content_body = REPLACE(
    content_body, 
    'Between cold and hot holding — this is where product goes bad and people get sick',
    'Between cold(41) and hot(135) holding — this is where product goes bad and people get sick'
  )
WHERE content_body LIKE '%Between cold and hot holding — this is where product goes bad and people get sick%';
