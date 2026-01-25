ALTER TABLE "user_notification" ALTER COLUMN "is_read" SET DATA TYPE boolean USING (is_read != 0);
