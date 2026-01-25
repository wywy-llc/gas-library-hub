-- Step 1: Drop the default value
ALTER TABLE "user_notification" ALTER COLUMN "is_read" DROP DEFAULT;
-- Step 2: Change the column type
ALTER TABLE "user_notification" ALTER COLUMN "is_read" SET DATA TYPE boolean USING (is_read != 0);
-- Step 3: Set the new default value
ALTER TABLE "user_notification" ALTER COLUMN "is_read" SET DEFAULT false;
