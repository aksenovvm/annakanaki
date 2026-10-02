-- CreateEnum
CREATE TYPE "time_off_type" AS ENUM ('day_off', 'vacation', 'sick_leave', 'closed', 'other');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "booking_source" AS ENUM ('web', 'telegram', 'admin');

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "duration_min" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barbers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Барбер',
    "photo_url" TEXT,
    "bio" TEXT NOT NULL DEFAULT '',
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "telegram_chat_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "barbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barber_services" (
    "barber_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "duration_min" INTEGER,
    "price" INTEGER,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "barber_services_pkey" PRIMARY KEY ("barber_id","service_id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breaks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "type" "time_off_type" NOT NULL DEFAULT 'other',
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "telegram_id" TEXT,
    "telegram_chat_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "total_price" INTEGER NOT NULL,
    "total_duration_min" INTEGER NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'confirmed',
    "source" "booking_source" NOT NULL,
    "manage_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminder_day_sent_at" TIMESTAMPTZ(3),
    "reminder_30m_sent_at" TIMESTAMPTZ(3),
    "review_requested_at" TIMESTAMPTZ(3),
    "auto_completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_services" (
    "booking_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("booking_id","service_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "login" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "telegram_chat_id" TEXT,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_items_barber_id_idx" ON "portfolio_items"("barber_id");

-- CreateIndex
CREATE INDEX "barber_services_service_id_idx" ON "barber_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_barber_id_weekday_key" ON "working_hours"("barber_id", "weekday");

-- CreateIndex
CREATE INDEX "breaks_barber_id_weekday_idx" ON "breaks"("barber_id", "weekday");

-- CreateIndex
CREATE INDEX "time_off_barber_id_starts_at_idx" ON "time_off"("barber_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "clients_telegram_id_key" ON "clients"("telegram_id");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_manage_token_key" ON "bookings"("manage_token");

-- CreateIndex
CREATE INDEX "bookings_barber_id_starts_at_idx" ON "bookings"("barber_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_client_id_idx" ON "bookings"("client_id");

-- CreateIndex
CREATE INDEX "bookings_status_starts_at_idx" ON "bookings"("status", "starts_at");

-- CreateIndex
CREATE INDEX "booking_services_service_id_idx" ON "booking_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_barber_id_idx" ON "reviews"("barber_id");

-- CreateIndex
CREATE INDEX "reviews_is_public_created_at_idx" ON "reviews"("is_public", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_login_key" ON "admin_users"("login");

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Дописано вручную: то, что нельзя описать в schema.prisma.
-- ============================================================

-- Проверки данных на уровне базы: даже ошибочный код не сможет сохранить мусор.
ALTER TABLE "services"         ADD CONSTRAINT "services_duration_positive" CHECK ("duration_min" > 0);
ALTER TABLE "services"         ADD CONSTRAINT "services_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "barber_services"  ADD CONSTRAINT "barber_services_duration_positive" CHECK ("duration_min" IS NULL OR "duration_min" > 0);
ALTER TABLE "barber_services"  ADD CONSTRAINT "barber_services_price_non_negative" CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "barbers"          ADD CONSTRAINT "barbers_experience_non_negative" CHECK ("experience_years" >= 0);
ALTER TABLE "working_hours"    ADD CONSTRAINT "working_hours_weekday" CHECK ("weekday" BETWEEN 1 AND 7);
ALTER TABLE "working_hours"    ADD CONSTRAINT "working_hours_order" CHECK ("end_time" > "start_time");
ALTER TABLE "breaks"           ADD CONSTRAINT "breaks_weekday" CHECK ("weekday" BETWEEN 1 AND 7);
ALTER TABLE "breaks"           ADD CONSTRAINT "breaks_order" CHECK ("end_time" > "start_time");
ALTER TABLE "time_off"         ADD CONSTRAINT "time_off_order" CHECK ("ends_at" > "starts_at");
ALTER TABLE "bookings"         ADD CONSTRAINT "bookings_order" CHECK ("ends_at" > "starts_at");
ALTER TABLE "bookings"         ADD CONSTRAINT "bookings_price_non_negative" CHECK ("total_price" >= 0);
ALTER TABLE "bookings"         ADD CONSTRAINT "bookings_duration_positive" CHECK ("total_duration_min" > 0);
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_duration_positive" CHECK ("duration_min" > 0);
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "reviews"          ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

-- Row Level Security: закрываем прямой доступ к таблицам через публичный API Supabase
-- (ключи anon / authenticated). Политик нет — значит, снаружи нельзя ни читать, ни писать.
-- Наш backend подключается как владелец таблиц (postgres), и на него RLS не действует.
ALTER TABLE "services"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "barbers"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_items"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "barber_services"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "working_hours"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "breaks"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_off"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_users"      ENABLE ROW LEVEL SECURITY;
