DROP INDEX "sample_like_user_sample_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "sample_like_user_sample_unique_idx" ON "sample_like" USING btree ("user_id","sample_code_id");