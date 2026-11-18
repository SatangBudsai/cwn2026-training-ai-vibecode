-- สบายใจ สปา · ข้อมูลตั้งต้นตาม TEST-DATA.md ทุกค่า · สร้างครั้งเดียว hash เป็น Argon2id จริง
-- ฟังก์ชันเดียวนี้คือ seed ชุดเดียวของระบบ: docker init และ POST /api/test/reset เรียกตัวเดียวกัน
-- ค่าที่คิดจากวันล็อก: C01–C06 และ Gift Card (วันล็อก − N) · U02, U05 เดือนเกิด · R01 ปี (TD-04, TD-07, TD-12, D-24)
-- การจอง B01–B19 วันที่คงที่ · UUID คงที่: U=…0101+ · B=…0201+ · C=…0301+ · GC=…0401+

CREATE OR REPLACE FUNCTION sabai_seed(p_now timestamptz) RETURNS void
LANGUAGE plpgsql AS $seed$
DECLARE
  v_today date := (p_now AT TIME ZONE 'Asia/Bangkok')::date;
  v_month int := extract(month FROM (p_now AT TIME ZONE 'Asia/Bangkok'))::int;
  v_year  int := extract(year FROM (p_now AT TIME ZONE 'Asia/Bangkok'))::int;
BEGIN
  TRUNCATE app_settings, users, services, herbs, service_herbs, therapists, therapist_services,
           therapist_reviews, hotels, course_purchases, gift_cards, bookings, booking_items,
           gift_card_transactions, point_transactions, birthday_redemptions,
           waist_measurements, before_after_photos
    RESTART IDENTITY CASCADE;

  INSERT INTO users (id, email, password_hash, role, full_name, phone, birth_date, lifetime_spend, points_balance) VALUES
    ('00000000-0000-0000-0000-000000000101', 'nida@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$+q6CwIZM9u2FsKxo6Tf+Rg$DxUIl+z2MeL9JznOJvb2YP/HtTBhoVRz/Yd/mxUFuhE', 'CUSTOMER', 'คุณนิดา', '0810000001', DATE '1985-03-01', 12400, 99),
    ('00000000-0000-0000-0000-000000000102', 'ton@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$wQah1pxkyfYu8e6Irc9QPA$tQRTByGJ0c8dSGwPtmhEYcZlOwe5YpsOymucPS26IsI', 'CUSTOMER', 'คุณต้น', '0810000002', make_date(1992, v_month, 1), 30000, 0),
    ('00000000-0000-0000-0000-000000000103', 'fon@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$C/Vs7BIi3cO5A2A1Cwr98w$KWo0pvT3v1fXQgBCN8IeOZfhcDM0p1sd9Ou5CTdd7Dw', 'CUSTOMER', 'คุณฝน', '0810000003', DATE '1994-02-01', 9999, 250),
    ('00000000-0000-0000-0000-000000000104', 'may@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$Z+DQMlDJAboanZin0zWcdg$bhLGoDC18n2bkI/cIE6mbWQl/ZuowkXxfPlCEPUKsmM', 'CUSTOMER', 'คุณเมย์', '0810000004', DATE '1997-05-01', 0, 0),
    ('00000000-0000-0000-0000-000000000105', 'prae@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$VOIvIQd+T9lCmq/OgNSCiQ$sLG4uzBXYkboDK1Qz/97Ec7veQEZh6+3C3iyKsPF8RQ', 'CUSTOMER', 'น้องแพร', '0810000005', make_date(2003, v_month, 1), 29999, 100),
    ('00000000-0000-0000-0000-000000000106', 'liwei@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$iAYTSIqf7W8fH9yorx9ghQ$sR20KwBNTA/Djw4OjPZvMKYg5ivCQ2rI6tQyybaY8Mw', 'CUSTOMER', 'Mr. Li Wei', '0810000006', DATE '1991-01-01', 0, 0),
    ('00000000-0000-0000-0000-000000000107', 'owner@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$b0XM/fe1YCRJDZV3kwn3Pw$hiXwcrHMqNZRlpstDyYY4AUegXu9e0S918+ZBs0cB34', 'OWNER', 'คุณจันทร์', '021234567', NULL, 0, 0),
    ('00000000-0000-0000-0000-000000000108', 'kan@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$7rY596+PNDzkmcryFlI/5A$LlfOLFhRSFKyytPltmAupfpZw03WLmWH1me+gt8utOU', 'CUSTOMER', 'คุณกานต์', '0810000008', DATE '1990-08-01', 10000, 101),
    ('00000000-0000-0000-0000-000000000109', 'win@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$f0Dy16kPh3iD4uoR/AvU5g$0iI7XlsxdSkCvBRMtOmDOFEkW/yEyKthr8SOS+Na8FM', 'CUSTOMER', 'คุณวิน', '0810000009', DATE '1988-11-01', 10001, 199),
    ('00000000-0000-0000-0000-000000000110', 'bee@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$hzhxGk/SoIHedMNPbRezYA$VsbdJ564q/tc5AzuXJdqfhiwrFLoObiyQfU6/uLX2DA', 'CUSTOMER', 'คุณบี', '0810000010', DATE '1986-09-01', 30001, 200),
    ('00000000-0000-0000-0000-000000000111', 'por@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$CENpFbopKZyL9ekGgfiImQ$qsAYrMgTv2jCRCCuNURA0JyPmMECSI19L+TQFFoiEFM', 'CUSTOMER', 'คุณปอ', '0810000011', DATE '1995-06-01', 500, 1700),
    ('00000000-0000-0000-0000-000000000112', 'muk@sabai.test', '$argon2id$v=19$m=19456,t=2,p=1$TSXJMfz2P6QYFIU10+dd5w$AxqHokKrH6eKD8YB9yWkEH1kI8RWmxy3y2kiNn/dmEM', 'CUSTOMER', 'คุณมุก', '0810000012', DATE '1993-06-01', 5000, 300);

  INSERT INTO services (id, kind, name_th, name_en, name_zh, duration_minutes, price, image_path, sort_order) VALUES
    ('S01', 'SERVICE', 'นวดไทย 60 นาที', 'Thai Massage 60', '泰式按摩 60分钟', 60, 1000, '/brand/services/svc-s01-thai60.jpg', 1),
    ('S02', 'SERVICE', 'นวดไทย 90 นาที', 'Thai Massage 90', '泰式按摩 90分钟', 90, 1400, '/brand/services/svc-s02-thai90.jpg', 2),
    ('S03', 'SERVICE', 'ประคบสมุนไพร', 'Herbal Compress', '草药热敷', 60, 1200, '/brand/services/svc-s03-compress.jpg', 3),
    ('S04', 'SERVICE', 'นวดน้ำมันอโรมา', 'Aroma Oil Massage', '香薰精油按摩', 90, 2000, '/brand/services/svc-s04-aroma.jpg', 4),
    ('S05', 'SERVICE', 'นวดเท้า', 'Foot Massage', '足部按摩', 60, 800, '/brand/services/svc-s05-foot.jpg', 5),
    ('S06', 'SERVICE', 'ขัดผิวสมุนไพร', 'Herbal Body Scrub', '草药身体磨砂', 60, 1500, '/brand/services/svc-s06-scrub.jpg', 6),
    ('S07', 'SERVICE', 'ทรีตเมนต์หน้า', 'Herbal Facial', '草药面部护理', 60, 1800, '/brand/services/svc-s07-facial.jpg', 7),
    ('P01', 'PACKAGE', 'แพ็กเกจ Bangkok Relax', 'Bangkok Relax', '曼谷放松套餐', 120, 2900, '/brand/services/svc-p01-bangkok-relax.jpg', 8),
    ('K01', 'COURSE', 'คอร์สกระชับสัดส่วน 10 แถม 1', 'Body Contouring Course', '塑形疗程', 60, 15000, '/brand/services/svc-k01-contour.jpg', 9);

  INSERT INTO herbs (id, name_th, name_en, name_zh, image_path) VALUES
    (1, 'ไพล', 'Phlai', '紫姜', '/brand/herbs/herb-phlai.jpg'),
    (2, 'ตะไคร้', 'Lemongrass', '香茅', '/brand/herbs/herb-lemongrass.jpg'),
    (3, 'ขมิ้น', 'Turmeric', '姜黄', '/brand/herbs/herb-turmeric.jpg'),
    (4, 'มะกรูด', 'Kaffir Lime', '泰国青柠', '/brand/herbs/herb-kaffir.jpg'),
    (5, 'มะลิ', 'Jasmine', '茉莉', '/brand/herbs/herb-jasmine.jpg'),
    (6, 'การบูร', 'Camphor', '樟脑', '/brand/herbs/herb-camphor.jpg'),
    (7, 'ขิง', 'Ginger', '生姜', '/brand/herbs/herb-ginger.jpg'),
    (8, 'มะขาม', 'Tamarind', '罗望子', '/brand/herbs/herb-tamarind.jpg'),
    (9, 'น้ำผึ้ง', 'Honey', '蜂蜜', '/brand/herbs/herb-honey.jpg'),
    (10, 'ว่านหางจระเข้', 'Aloe Vera', '芦荟', '/brand/herbs/herb-aloe.jpg'),
    (11, 'ทานาคา', 'Thanaka', '黄香楝', '/brand/herbs/herb-thanaka.jpg'),
    (12, 'พริกไทย', 'Pepper', '胡椒', '/brand/herbs/herb-pepper.jpg');
  PERFORM setval(pg_get_serial_sequence('herbs', 'id'), 12);

  INSERT INTO service_herbs (service_id, herb_id) VALUES
    ('S01', 1),
    ('S02', 1),
    ('S03', 1),
    ('S05', 1),
    ('P01', 1),
    ('K01', 1),
    ('S01', 2),
    ('S02', 2),
    ('S03', 2),
    ('S04', 2),
    ('P01', 2),
    ('S03', 3),
    ('S06', 3),
    ('S07', 3),
    ('P01', 3),
    ('S03', 4),
    ('S04', 4),
    ('P01', 4),
    ('S04', 5),
    ('S05', 6),
    ('S05', 7),
    ('K01', 7),
    ('S06', 8),
    ('S06', 9),
    ('S07', 10),
    ('S07', 11),
    ('K01', 12);

  INSERT INTO therapists (id, name_th, name_en, name_zh, title_th, title_en, title_zh, photo_path) VALUES
    ('T01', 'พี่ศรี', 'P''Sri', '诗丽', 'หัวหน้านักบำบัด', 'Head Therapist', '首席理疗师', '/brand/people/staff-t01-sri.jpg'),
    ('T02', 'พี่มาลี', 'P''Malee', '玛莉', 'นักบำบัด', 'Therapist', '理疗师', '/brand/people/staff-t02-malee.jpg'),
    ('T03', 'พี่ภูมิ', 'P''Phum', '普姆', 'นักบำบัด', 'Therapist', '理疗师', '/brand/people/staff-t03-phum.jpg'),
    ('T04', 'น้องฟ้า', 'Nong Fah', '法', 'นักบำบัดใหม่', 'New Therapist', '新理疗师', '/brand/people/staff-t04-fah.jpg'),
    ('T05', 'พี่ทิว', 'P''Tiw', '蒂乌', 'นักบำบัด', 'Therapist', '理疗师', '/brand/people/staff-t05-tiw.jpg'),
    ('T06', 'น้องแก้ว', 'Nong Kaew', '凯欧', 'นักบำบัด', 'Therapist', '理疗师', '/brand/people/staff-t06-kaew.jpg');

  INSERT INTO therapist_services (therapist_id, service_id) VALUES
    ('T01', 'S01'),
    ('T01', 'S02'),
    ('T01', 'S03'),
    ('T01', 'S04'),
    ('T01', 'S05'),
    ('T01', 'P01'),
    ('T01', 'K01'),
    ('T02', 'S01'),
    ('T02', 'S02'),
    ('T02', 'S03'),
    ('T02', 'S05'),
    ('T02', 'P01'),
    ('T03', 'S01'),
    ('T03', 'S02'),
    ('T03', 'S04'),
    ('T03', 'S05'),
    ('T03', 'S06'),
    ('T04', 'S01'),
    ('T04', 'S02'),
    ('T04', 'S05'),
    ('T04', 'S06'),
    ('T04', 'S07'),
    ('T05', 'S01'),
    ('T05', 'S02'),
    ('T05', 'S03'),
    ('T05', 'S04'),
    ('T05', 'S07'),
    ('T05', 'K01'),
    ('T06', 'S01'),
    ('T06', 'S02'),
    ('T06', 'S03'),
    ('T06', 'S05'),
    ('T06', 'P01');

  INSERT INTO therapist_reviews (therapist_id, stars) VALUES
    ('T01', 5),
    ('T01', 5),
    ('T01', 5),
    ('T02', 5),
    ('T02', 4),
    ('T03', 5),
    ('T03', 5),
    ('T03', 4),
    ('T03', 4),
    ('T03', 4),
    ('T05', 5),
    ('T05', 5),
    ('T05', 5),
    ('T05', 4),
    ('T05', 4),
    ('T06', 5),
    ('T06', 3);

  INSERT INTO hotels (id, name_th, name_en, name_zh, distance_km) VALUES
    ('H01', 'โรงแรมเรือนไทย ริเวอร์ไซด์', 'Ruen Thai Riverside Hotel', '泰屋河畔酒店', 2.0),
    ('H02', 'โรงแรมบ้านสบาย สุขุมวิท', 'Baan Sabai Sukhumvit Hotel', '安逸之家素坤逸酒店', 5.0),
    ('H03', 'โรงแรมดอกบัว สีลม', 'Dok Bua Silom Hotel', '莲花是隆酒店', 5.1),
    ('H04', 'โรงแรมกล้วยไม้ พาเลซ', 'Kluai Mai Palace Hotel', '兰花宫酒店', 12.0),
    ('H05', 'โรงแรมทองคำ แกรนด์', 'Thong Kham Grand Hotel', '金色大酒店', 15.0),
    ('H06', 'โรงแรมสวนมะลิ บางนา', 'Suan Mali Bangna Hotel', '茉莉园邦纳酒店', 15.1);

  INSERT INTO course_purchases (id, user_id, service_id, price_paid, total_sessions, used_sessions, reserved_sessions, purchased_on, expires_on, payment_status) VALUES
    ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', 'K01', 15000, 11, 4, 0, v_today - 90, v_today - 90 + 180, 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000108', 'K01', 15000, 11, 9, 0, v_today - 175, v_today - 175 + 180, 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000109', 'K01', 15000, 11, 6, 0, v_today - 181, v_today - 181 + 180, 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000110', 'K01', 15000, 11, 11, 0, v_today - 120, v_today - 120 + 180, 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000111', 'K01', 15000, 11, 10, 0, v_today - 60, v_today - 60 + 180, 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000112', 'K01', 15000, 11, 3, 1, v_today - 45, v_today - 45 + 180, 'SIMULATED');

  INSERT INTO gift_cards (id, code, design, initial_value, balance, purchased_on, expires_on, delivery_channel, payment_status) VALUES
    ('00000000-0000-0000-0000-000000000401', 'GIFT-ACTIVE', 'ORCHID', 2000, 2000, v_today - 30, v_today - 30 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000402', 'GIFT-BAL-400', 'LOTUS', 1000, 400, v_today - 100, v_today - 100 + 365, 'EMAIL', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000403', 'GIFT-BAL-1', 'GOLD', 500, 1, v_today - 50, v_today - 50 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000404', 'GIFT-BAL-0', 'ORCHID', 500, 0, v_today - 50, v_today - 50 + 365, 'EMAIL', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000405', 'GIFT-EXP364', 'LOTUS', 1000, 1000, v_today - 364, v_today - 364 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000406', 'GIFT-EXP365', 'GOLD', 1000, 1000, v_today - 365, v_today - 365 + 365, 'EMAIL', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000407', 'GIFT-EXP366', 'ORCHID', 1000, 1000, v_today - 366, v_today - 366 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000408', 'GIFT-500', 'ORCHID', 500, 500, v_today - 10, v_today - 10 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000409', 'GIFT-1000', 'GOLD', 1000, 1000, v_today - 10, v_today - 10 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000410', 'GIFT-899', 'LOTUS', 899, 899, v_today - 10, v_today - 10 + 365, 'EMAIL', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000411', 'GIFT-900', 'LOTUS', 900, 900, v_today - 10, v_today - 10 + 365, 'EMAIL', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000412', 'GIFT-901', 'LOTUS', 901, 901, v_today - 10, v_today - 10 + 365, 'EMAIL', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000413', 'GIFT-2199', 'GOLD', 2199, 2199, v_today - 10, v_today - 10 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000414', 'GIFT-2200', 'GOLD', 2200, 2200, v_today - 10, v_today - 10 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000415', 'GIFT-2201', 'GOLD', 2201, 2201, v_today - 10, v_today - 10 + 365, 'LINE', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000416', 'GIFT-REFUND', 'ORCHID', 1000, 500, v_today - 40, v_today - 40 + 365, 'EMAIL', 'SIMULATED'),
    ('00000000-0000-0000-0000-000000000417', 'GIFT-EXPREF', 'LOTUS', 500, 200, v_today - 366, v_today - 366 + 365, 'LINE', 'SIMULATED');

  INSERT INTO bookings (id, booking_code, user_id, guest_name, guest_phone, service_id, booking_type, party_size, start_at, end_at, is_couple_suite, status, full_price, discount_percent, discount_source, discount_amount, points_redeemed, points_discount, service_net, hotel_id, distance_km, cars, transport_fee, gift_card_id, gift_card_amount, pay_at_shop, course_purchase_id, points_earned, completed_at, created_at) VALUES
    ('00000000-0000-0000-0000-000000000201', 'SJHIST01', '00000000-0000-0000-0000-000000000101', NULL, NULL, 'K01', 'SINGLE', 1, TIMESTAMPTZ '2026-03-24 14:00:00+07', TIMESTAMPTZ '2026-03-24 15:00:00+07', false, 'COMPLETED', 0, 0, 'NONE', 0, 0, 0, 0, NULL, NULL, 0, 0, NULL, 0, 0, '00000000-0000-0000-0000-000000000301', 0, TIMESTAMPTZ '2026-03-24 15:00:00+07', TIMESTAMPTZ '2026-03-24 14:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000202', 'SJHIST02', '00000000-0000-0000-0000-000000000101', NULL, NULL, 'K01', 'SINGLE', 1, TIMESTAMPTZ '2026-04-14 14:00:00+07', TIMESTAMPTZ '2026-04-14 15:00:00+07', false, 'COMPLETED', 0, 0, 'NONE', 0, 0, 0, 0, NULL, NULL, 0, 0, NULL, 0, 0, '00000000-0000-0000-0000-000000000301', 0, TIMESTAMPTZ '2026-04-14 15:00:00+07', TIMESTAMPTZ '2026-04-14 14:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000203', 'SJHIST03', '00000000-0000-0000-0000-000000000101', NULL, NULL, 'K01', 'SINGLE', 1, TIMESTAMPTZ '2026-05-05 14:00:00+07', TIMESTAMPTZ '2026-05-05 15:00:00+07', false, 'COMPLETED', 0, 0, 'NONE', 0, 0, 0, 0, NULL, NULL, 0, 0, NULL, 0, 0, '00000000-0000-0000-0000-000000000301', 0, TIMESTAMPTZ '2026-05-05 15:00:00+07', TIMESTAMPTZ '2026-05-05 14:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000204', 'SJHIST04', '00000000-0000-0000-0000-000000000101', NULL, NULL, 'K01', 'SINGLE', 1, TIMESTAMPTZ '2026-05-26 14:00:00+07', TIMESTAMPTZ '2026-05-26 15:00:00+07', false, 'COMPLETED', 0, 0, 'NONE', 0, 0, 0, 0, NULL, NULL, 0, 0, NULL, 0, 0, '00000000-0000-0000-0000-000000000301', 0, TIMESTAMPTZ '2026-05-26 15:00:00+07', TIMESTAMPTZ '2026-05-26 14:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000205', 'SJTEST05', '00000000-0000-0000-0000-000000000109', NULL, NULL, 'S01', 'SINGLE', 1, TIMESTAMPTZ '2026-06-15 13:00:00+07', TIMESTAMPTZ '2026-06-15 14:00:00+07', false, 'CONFIRMED', 1000, 5, 'TIER', 50, 0, 0, 950, NULL, NULL, 0, 0, NULL, 0, 950, NULL, 0, NULL, TIMESTAMPTZ '2026-06-15 13:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000206', 'SJTEST06', NULL, 'คุณทดสอบ หนึ่ง', '0890000001', 'S05', 'SINGLE', 1, TIMESTAMPTZ '2026-06-15 15:00:00+07', TIMESTAMPTZ '2026-06-15 16:00:00+07', false, 'CONFIRMED', 800, 0, 'NONE', 0, 0, 0, 800, NULL, NULL, 0, 0, NULL, 0, 800, NULL, 0, NULL, TIMESTAMPTZ '2026-06-15 15:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000207', 'SJTEST07', '00000000-0000-0000-0000-000000000101', NULL, NULL, 'S01', 'SINGLE', 1, TIMESTAMPTZ '2026-06-16 10:00:00+07', TIMESTAMPTZ '2026-06-16 11:00:00+07', false, 'CONFIRMED', 1000, 5, 'TIER', 50, 0, 0, 950, NULL, NULL, 0, 0, NULL, 0, 950, NULL, 0, NULL, TIMESTAMPTZ '2026-06-16 10:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000208', 'SJTEST08', '00000000-0000-0000-0000-000000000112', NULL, NULL, 'K01', 'SINGLE', 1, TIMESTAMPTZ '2026-06-18 11:00:00+07', TIMESTAMPTZ '2026-06-18 12:00:00+07', false, 'CONFIRMED', 0, 0, 'NONE', 0, 0, 0, 0, NULL, NULL, 0, 0, NULL, 0, 0, '00000000-0000-0000-0000-000000000306', 0, NULL, TIMESTAMPTZ '2026-06-18 11:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000209', 'SJTEST09', NULL, 'คุณทดสอบ สอง', '0890000002', 'S01', 'COUPLE', 2, TIMESTAMPTZ '2026-06-20 18:00:00+07', TIMESTAMPTZ '2026-06-20 19:00:00+07', true, 'CONFIRMED', 2000, 0, 'NONE', 0, 0, 0, 2000, NULL, NULL, 0, 0, NULL, 0, 2000, NULL, 0, NULL, TIMESTAMPTZ '2026-06-20 18:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000210', 'SJTEST10', NULL, 'คุณทดสอบ สาม', '0890000003', 'S01', 'SINGLE', 1, TIMESTAMPTZ '2026-06-22 14:00:00+07', TIMESTAMPTZ '2026-06-22 15:00:00+07', false, 'CONFIRMED', 1000, 0, 'NONE', 0, 0, 0, 1000, NULL, NULL, 0, 0, NULL, 0, 1000, NULL, 0, NULL, TIMESTAMPTZ '2026-06-22 14:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000211', 'SJTEST11', NULL, 'คุณทดสอบ สาม', '0890000003', 'S06', 'SINGLE', 1, TIMESTAMPTZ '2026-06-23 16:00:00+07', TIMESTAMPTZ '2026-06-23 17:00:00+07', false, 'CONFIRMED', 1500, 0, 'NONE', 0, 0, 0, 1500, NULL, NULL, 0, 0, NULL, 0, 1500, NULL, 0, NULL, TIMESTAMPTZ '2026-06-23 16:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000212', 'SJTEST12', NULL, 'คุณทดสอบ สี่', '0890000004', 'S07', 'SINGLE', 1, TIMESTAMPTZ '2026-06-23 16:00:00+07', TIMESTAMPTZ '2026-06-23 17:00:00+07', false, 'CONFIRMED', 1800, 0, 'NONE', 0, 0, 0, 1800, NULL, NULL, 0, 0, NULL, 0, 1800, NULL, 0, NULL, TIMESTAMPTZ '2026-06-23 16:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000213', 'SJTEST13', NULL, 'Ms. Test Tourist', '0890000005', 'P01', 'SINGLE', 1, TIMESTAMPTZ '2026-06-24 10:00:00+07', TIMESTAMPTZ '2026-06-24 12:00:00+07', false, 'CONFIRMED', 2900, 0, 'NONE', 0, 0, 0, 2900, 'H01', 2.0, 1, 0, NULL, 0, 2900, NULL, 0, NULL, TIMESTAMPTZ '2026-06-24 10:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000214', 'SJTEST14', NULL, 'คุณทดสอบ สี่', '0890000004', 'S06', 'SINGLE', 1, TIMESTAMPTZ '2026-06-24 12:00:00+07', TIMESTAMPTZ '2026-06-24 13:00:00+07', false, 'CONFIRMED', 1500, 0, 'NONE', 0, 0, 0, 1500, NULL, NULL, 0, 0, NULL, 0, 1500, NULL, 0, NULL, TIMESTAMPTZ '2026-06-24 12:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000215', 'SJTEST15', '00000000-0000-0000-0000-000000000112', NULL, NULL, 'S04', 'SINGLE', 1, TIMESTAMPTZ '2026-06-25 14:00:00+07', TIMESTAMPTZ '2026-06-25 15:30:00+07', false, 'CONFIRMED', 2000, 20, 'BIRTHDAY', 400, 200, 100, 1500, 'H04', 12.0, 1, 300, '00000000-0000-0000-0000-000000000416', 500, 1300, NULL, 0, NULL, TIMESTAMPTZ '2026-06-25 14:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000216', 'SJTEST16', NULL, 'คุณทดสอบ หก', '0890000006', 'S01', 'GROUP', 6, TIMESTAMPTZ '2026-06-26 12:00:00+07', TIMESTAMPTZ '2026-06-26 13:00:00+07', false, 'CONFIRMED', 6000, 10, 'GROUP', 600, 0, 0, 5400, 'H04', 12.0, 2, 600, NULL, 0, 6000, NULL, 0, NULL, TIMESTAMPTZ '2026-06-26 12:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000217', 'SJTEST17', NULL, 'คุณทดสอบ หนึ่ง', '0890000001', 'S04', 'SINGLE', 1, TIMESTAMPTZ '2026-06-28 11:00:00+07', TIMESTAMPTZ '2026-06-28 12:30:00+07', false, 'CONFIRMED', 2000, 0, 'NONE', 0, 0, 0, 2000, NULL, NULL, 0, 0, NULL, 0, 2000, NULL, 0, NULL, TIMESTAMPTZ '2026-06-28 11:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000218', 'SJTEST18', NULL, 'คุณทดสอบ สอง', '0890000002', 'S04', 'SINGLE', 1, TIMESTAMPTZ '2026-06-28 11:00:00+07', TIMESTAMPTZ '2026-06-28 12:30:00+07', false, 'CONFIRMED', 2000, 0, 'NONE', 0, 0, 0, 2000, NULL, NULL, 0, 0, NULL, 0, 2000, NULL, 0, NULL, TIMESTAMPTZ '2026-06-28 11:00:00+07' - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000219', 'SJTEST19', NULL, 'คุณทดสอบ เจ็ด', '0890000007', 'S01', 'SINGLE', 1, TIMESTAMPTZ '2026-06-30 17:00:00+07', TIMESTAMPTZ '2026-06-30 18:00:00+07', false, 'CONFIRMED', 1000, 0, 'NONE', 0, 0, 0, 1000, NULL, NULL, 0, 0, '00000000-0000-0000-0000-000000000417', 300, 700, NULL, 0, NULL, TIMESTAMPTZ '2026-06-30 17:00:00+07' - INTERVAL '7 days');

  INSERT INTO booking_items (booking_id, person_no, therapist_id, period, slot_active) VALUES
    ('00000000-0000-0000-0000-000000000201', 1, 'T01', tstzrange(TIMESTAMPTZ '2026-03-24 14:00:00+07', TIMESTAMPTZ '2026-03-24 15:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000202', 1, 'T05', tstzrange(TIMESTAMPTZ '2026-04-14 14:00:00+07', TIMESTAMPTZ '2026-04-14 15:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000203', 1, 'T01', tstzrange(TIMESTAMPTZ '2026-05-05 14:00:00+07', TIMESTAMPTZ '2026-05-05 15:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000204', 1, 'T05', tstzrange(TIMESTAMPTZ '2026-05-26 14:00:00+07', TIMESTAMPTZ '2026-05-26 15:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000205', 1, 'T02', tstzrange(TIMESTAMPTZ '2026-06-15 13:00:00+07', TIMESTAMPTZ '2026-06-15 14:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000206', 1, 'T03', tstzrange(TIMESTAMPTZ '2026-06-15 15:00:00+07', TIMESTAMPTZ '2026-06-15 16:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000207', 1, 'T02', tstzrange(TIMESTAMPTZ '2026-06-16 10:00:00+07', TIMESTAMPTZ '2026-06-16 11:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000208', 1, 'T05', tstzrange(TIMESTAMPTZ '2026-06-18 11:00:00+07', TIMESTAMPTZ '2026-06-18 12:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000209', 1, 'T01', tstzrange(TIMESTAMPTZ '2026-06-20 18:00:00+07', TIMESTAMPTZ '2026-06-20 19:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000209', 2, 'T05', tstzrange(TIMESTAMPTZ '2026-06-20 18:00:00+07', TIMESTAMPTZ '2026-06-20 19:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000210', 1, 'T01', tstzrange(TIMESTAMPTZ '2026-06-22 14:00:00+07', TIMESTAMPTZ '2026-06-22 15:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000211', 1, 'T03', tstzrange(TIMESTAMPTZ '2026-06-23 16:00:00+07', TIMESTAMPTZ '2026-06-23 17:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000212', 1, 'T04', tstzrange(TIMESTAMPTZ '2026-06-23 16:00:00+07', TIMESTAMPTZ '2026-06-23 17:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000213', 1, 'T02', tstzrange(TIMESTAMPTZ '2026-06-24 10:00:00+07', TIMESTAMPTZ '2026-06-24 12:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000214', 1, 'T03', tstzrange(TIMESTAMPTZ '2026-06-24 12:00:00+07', TIMESTAMPTZ '2026-06-24 13:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000215', 1, 'T03', tstzrange(TIMESTAMPTZ '2026-06-25 14:00:00+07', TIMESTAMPTZ '2026-06-25 15:30:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000216', 1, 'T01', tstzrange(TIMESTAMPTZ '2026-06-26 12:00:00+07', TIMESTAMPTZ '2026-06-26 13:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000216', 2, 'T02', tstzrange(TIMESTAMPTZ '2026-06-26 12:00:00+07', TIMESTAMPTZ '2026-06-26 13:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000216', 3, 'T03', tstzrange(TIMESTAMPTZ '2026-06-26 12:00:00+07', TIMESTAMPTZ '2026-06-26 13:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000216', 4, 'T04', tstzrange(TIMESTAMPTZ '2026-06-26 12:00:00+07', TIMESTAMPTZ '2026-06-26 13:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000216', 5, 'T05', tstzrange(TIMESTAMPTZ '2026-06-26 12:00:00+07', TIMESTAMPTZ '2026-06-26 13:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000216', 6, 'T06', tstzrange(TIMESTAMPTZ '2026-06-26 12:00:00+07', TIMESTAMPTZ '2026-06-26 13:00:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000217', 1, 'T01', tstzrange(TIMESTAMPTZ '2026-06-28 11:00:00+07', TIMESTAMPTZ '2026-06-28 12:30:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000218', 1, 'T03', tstzrange(TIMESTAMPTZ '2026-06-28 11:00:00+07', TIMESTAMPTZ '2026-06-28 12:30:00+07', '[)'), true),
    ('00000000-0000-0000-0000-000000000219', 1, 'T06', tstzrange(TIMESTAMPTZ '2026-06-30 17:00:00+07', TIMESTAMPTZ '2026-06-30 18:00:00+07', '[)'), true);

  -- การใช้บัตรก่อนข้อมูลตั้งต้น booking NULL และการหักจาก B15, B19
  INSERT INTO gift_card_transactions (gift_card_id, booking_id, type, amount, created_at) VALUES
    ('00000000-0000-0000-0000-000000000402', NULL, 'REDEEM', 600, p_now),
    ('00000000-0000-0000-0000-000000000403', NULL, 'REDEEM', 499, p_now),
    ('00000000-0000-0000-0000-000000000404', NULL, 'REDEEM', 500, p_now),
    ('00000000-0000-0000-0000-000000000416', '00000000-0000-0000-0000-000000000215', 'REDEEM', 500, p_now),
    ('00000000-0000-0000-0000-000000000417', '00000000-0000-0000-0000-000000000219', 'REDEEM', 300, p_now);

  -- R03
  INSERT INTO point_transactions (user_id, booking_id, type, points, created_at) VALUES
    ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000215', 'REDEEM', -200, p_now);

  -- R01 ปีตามวันล็อก · R02 ผูก B15
  INSERT INTO birthday_redemptions (user_id, benefit_year, booking_id, released_at) VALUES
    ('00000000-0000-0000-0000-000000000105', v_year, NULL, NULL),
    ('00000000-0000-0000-0000-000000000112', 2026, '00000000-0000-0000-0000-000000000215', NULL);

  INSERT INTO waist_measurements (user_id, measured_on, waist_cm) VALUES
    ('00000000-0000-0000-0000-000000000101', '2026-03-17', 82.0),
    ('00000000-0000-0000-0000-000000000101', '2026-04-07', 81.0),
    ('00000000-0000-0000-0000-000000000101', '2026-04-28', 79.5),
    ('00000000-0000-0000-0000-000000000101', '2026-05-19', 78.0);

  INSERT INTO before_after_photos (user_id, kind, taken_on, file_path) VALUES
    ('00000000-0000-0000-0000-000000000101', 'BEFORE', '2026-03-17', 'public/placeholder/nida-before-body.jpg'),
    ('00000000-0000-0000-0000-000000000101', 'AFTER', '2026-05-19', 'public/placeholder/nida-after-body.jpg');

  -- R04 เก็บเป็น ISO +07:00 ตามวันล็อก
  INSERT INTO app_settings (key, value) VALUES
    ('locked_now', to_char(p_now AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD"T"HH24:MI:SS') || '+07:00');
END;
$seed$;

SELECT sabai_seed('2026-06-15T10:00:00+07:00');
