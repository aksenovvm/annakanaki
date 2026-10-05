-- Удобное представление (VIEW) для просмотра записей в Supabase Table Editor.
--
-- В таблице bookings время хранится в UTC (так правильно — см. docs/spec.md, раздел 15),
-- поэтому в Supabase запись на 10:00 по Ташкенту видна как 05:00+00. Это не ошибка.
-- А здесь — то же самое, но по-человечески: время по Ташкенту, имена вместо id, список услуг.
--
-- Это не отдельная таблица с копией данных: VIEW — сохранённый запрос, он всегда показывает актуальное.

CREATE VIEW "bookings_readable"
WITH (security_invoker = true) -- права проверяются как у того, кто смотрит: RLS таблиц продолжает работать
AS
SELECT
  b."id",
  to_char(b."starts_at" AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD HH24:MI') AS "starts_tashkent",
  to_char(b."ends_at"   AT TIME ZONE 'Asia/Tashkent', 'HH24:MI')            AS "ends_tashkent",
  br."name"  AS "barber",
  c."name"   AS "client",
  c."phone"  AS "phone",
  (
    SELECT string_agg(bs."name", ', ' ORDER BY bs."name")
    FROM "booking_services" bs
    WHERE bs."booking_id" = b."id"
  )          AS "services",
  b."total_price",
  b."total_duration_min",
  b."status",
  b."source",
  to_char(b."created_at" AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD HH24:MI') AS "created_tashkent"
FROM "bookings" b
JOIN "barbers" br ON br."id" = b."barber_id"
JOIN "clients" c  ON c."id"  = b."client_id"
ORDER BY b."starts_at" DESC;

-- Публичным ключам Supabase (anon / authenticated) представление недоступно.
-- Эти роли есть только в Supabase, поэтому сначала проверяем, что они существуют.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "bookings_readable" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "bookings_readable" FROM authenticated;
  END IF;
END $$;
