
insert into public.tracks (id, slug, name, department, description, sequence_order, location_tag) values
 ('11111111-1111-4111-8111-000000000001','universal','Universal / Hospitality','universal','Day 1 hospitality standards everyone completes first.',1,'loc_biggers_main'),
 ('11111111-1111-4111-8111-000000000002','market','Market','market','Retail floor: stocking, cashier, receiving.',2,'loc_biggers_main'),
 ('11111111-1111-4111-8111-000000000003','kitchen','Kitchen','kitchen','Weekday production and weekend service.',3,'loc_biggers_main');

insert into public.modules (id, track_id, slug, name, description, sub_path, day_assignment, sequence_order, is_assignable, location_tag) values
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','hospitality-day-1','Day 1: Hospitality at Biggers','How we greet, help, and hand off every guest who walks in.',null,1,1,false,'loc_biggers_main'),
 ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000002','stocking-the-floor','Stocking the Floor','Rotation, facing, and shelf standards for the retail floor.','Stocking',2,1,true,'loc_biggers_main'),
 ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000003','food-safety-basics','Food Safety Basics (TCS & CFPM)','Temperature control, holding times, and who must be on-site.','Weekday Production',1,1,true,'loc_biggers_main');

insert into public.steps (id, module_id, title, step_type, content_status, content_body, content_notes, sequence_order, location_tag) values
 ('33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-000000000001','The 10-foot greeting','text','ready',
  E'Notice every guest within ten feet of you, even if your hands are full.\nMake eye contact and greet them out loud - a nod is not a greeting.\nIf you cannot stop what you are doing, say so and name who can help them.\nNever point. Walk the guest to what they are looking for.',null,1,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000002','22222222-2222-4222-8222-000000000001','Reading the front-of-house at a glance','photo','needs_restructuring',
  E'Scan the entry, the counter, and the pickup shelf in that order before you clock in.\nFront counter set for open - registers staffed, bag station stocked.','Source photos exist in the old Drive folder; captions need rewriting.',2,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000003','22222222-2222-4222-8222-000000000001','Handling an unhappy guest','video','missing',null,'Needs a 60-sec clip. Sven to record with Andrew on a slow weekday.',3,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000004','22222222-2222-4222-8222-000000000001','Day 4: Supervised guest interactions','supervised_live_practice','ready',
  E'Work the floor with your trainer for a full shift with real customers.\nYour trainer stays within earshot but does not step in unless asked.\nDebrief three interactions at the end of the shift.',null,4,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000011','22222222-2222-4222-8222-000000000002','First In, First Out (FIFO) rotation on the dry shelf','text','ready',
  E'Pull existing product forward before anything new goes on the shelf.\nCheck the date on every unit you pull - do not assume the back is newer.\nNew stock goes behind, dated stock goes in front, labels facing out.\nAnything within seven days of code goes to the markdown cart, not back on the shelf.',null,1,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000012','22222222-2222-4222-8222-000000000002','What a faced shelf looks like','photo','ready',
  E'Compare your section to this before you call it done.\nCorrect: labels square to the aisle, front row flush to the shelf edge.',null,2,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000013','22222222-2222-4222-8222-000000000002','Breaking down a pallet safely','video','needs_restructuring',null,'Old clip is 6 minutes; needs to be cut to one 90-second skill clip.',3,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000014','22222222-2222-4222-8222-000000000002','Stocking sign-off','doing_signoff','ready',
  E'Stock and face one full aisle end-to-end without prompting.\nTrainer checks rotation on five random units.',null,4,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000021','22222222-2222-4222-8222-000000000003','What counts as a Time/Temperature Control for Safety (TCS) food','text','ready',
  E'Time/Temperature Control for Safety (TCS) food needs temperature control to stay safe.\nCooked grains, cut melon, dairy, eggs, and all proteins are TCS.\nCold holding at 41F or below. Hot holding at 135F or above.\nThe zone between those two numbers is where you lose product and get people sick.',null,1,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000022','22222222-2222-4222-8222-000000000003','Holding-time quiz','quiz','ready',null,null,2,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000023','22222222-2222-4222-8222-000000000003','Certified Food Protection Manager (CFPM) coverage requirements (NC)','text','blocked',null,'Blocked: waiting on confirmation of which managers hold a current CFPM certificate.',3,'loc_biggers_main'),
 ('33333333-3333-4333-8333-000000000024','22222222-2222-4222-8222-000000000003','Temp log sign-off','doing_signoff','ready',
  E'Take and record a full line temp log unassisted.\nKitchen Ops Manager verifies the readings against their own probe.',null,4,'loc_biggers_main');

insert into public.quiz_bank (id, step_id, question, options, correct_option, explanation, sequence_order) values
 ('44444444-4444-4444-8444-000000000001','33333333-3333-4333-8333-000000000022',
  'A pan of cooked rice has been sitting at room temperature for five hours. What do you do?',
  '["Reheat it to 165F and put it back in service","Discard it and log the waste","Move it to the walk-in and use it tomorrow"]'::jsonb,
  1,'Past four hours in the danger zone, Time/Temperature Control for Safety (TCS) food is discarded - reheating does not make it safe.',1);

insert into public.sourcing_board_entries (product, region, supplier, since_date, notes, location_tag) values
 ('Stone-ground grits','Oak Ridge, NC','Old Mill of Guilford','2021-03-01','Sacked weekly, picked up Thursdays.','loc_biggers_main'),
 ('Pasture eggs','Siler City, NC','Rocky Creek Farm','2022-06-01','Seasonal volume - short in January.','loc_biggers_main'),
 ('Sourdough loaves','In-house','In-house bakery','2020-01-01','Baker floats weekday production and weekend service.','loc_biggers_main'),
 ('Heirloom tomatoes','Rutherford County, NC','Sunset Ridge Produce','2021-07-01','Peak July-September; hothouse fill-in the rest of the year.','loc_biggers_main'),
 ('Collards & kale','Wake County, NC','Wake Greens Co-op','2020-10-01','Twice-weekly cut, best after the first frost.','loc_biggers_main'),
 ('Sweet potatoes','Nash County, NC','Nash County Growers','2019-09-01','Cured in-house for two weeks before they hit the floor.','loc_biggers_main'),
 ('Muscadine grapes','Duplin County, NC','Duplin Vineyard Farms','2023-08-01','Six-week window only - do not promise them year-round.','loc_biggers_main'),
 ('Apples (Gala, Rome)','Henderson County, NC','Hendersonville Orchards','2020-09-01','Mountain fruit, arrives Tuesdays through November.','loc_biggers_main');
