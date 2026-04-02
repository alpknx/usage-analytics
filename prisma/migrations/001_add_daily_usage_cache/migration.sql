-- CreateTable: daily_usage_cache
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

-- CreateIndex: unique constraint on (user_id, date_key)
CREATE UNIQUE INDEX "daily_usage_cache_user_id_date_key_key" ON "daily_usage_cache"("user_id", "date_key");

-- CreateIndex: lookup index
CREATE INDEX "daily_usage_cache_user_id_date_key_idx" ON "daily_usage_cache"("user_id", "date_key");

-- AddForeignKey
ALTER TABLE "daily_usage_cache"
    ADD CONSTRAINT "daily_usage_cache_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
