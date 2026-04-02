-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_usage_events" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_usage_cache" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date_key" TEXT NOT NULL,
    "committed_count" INTEGER NOT NULL DEFAULT 0,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "is_today_cache" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_usage_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "daily_usage_events_user_id_date_key_idx" ON "daily_usage_events"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "daily_usage_cache_user_id_date_key_idx" ON "daily_usage_cache"("user_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "daily_usage_cache_user_id_date_key_key" ON "daily_usage_cache"("user_id", "date_key");

-- AddForeignKey
ALTER TABLE "daily_usage_events" ADD CONSTRAINT "daily_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_usage_cache" ADD CONSTRAINT "daily_usage_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
