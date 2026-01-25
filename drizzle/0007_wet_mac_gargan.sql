CREATE TABLE "sample_code" (
	"id" text PRIMARY KEY NOT NULL,
	"library_id" text,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"document_type" text NOT NULL,
	"original_url" text NOT NULL,
	"copy_url" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"copy_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sample_copy" (
	"id" text PRIMARY KEY NOT NULL,
	"sample_code_id" text NOT NULL,
	"user_id" text,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sample_like" (
	"id" text PRIMARY KEY NOT NULL,
	"sample_code_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"sample_code_id" text NOT NULL,
	"actor_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_read" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sample_code" ADD CONSTRAINT "sample_code_library_id_library_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."library"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_code" ADD CONSTRAINT "sample_code_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_copy" ADD CONSTRAINT "sample_copy_sample_code_id_sample_code_id_fk" FOREIGN KEY ("sample_code_id") REFERENCES "public"."sample_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_copy" ADD CONSTRAINT "sample_copy_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_like" ADD CONSTRAINT "sample_like_sample_code_id_sample_code_id_fk" FOREIGN KEY ("sample_code_id") REFERENCES "public"."sample_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_like" ADD CONSTRAINT "sample_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_sample_code_id_sample_code_id_fk" FOREIGN KEY ("sample_code_id") REFERENCES "public"."sample_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sample_code_author_id_idx" ON "sample_code" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "sample_code_status_idx" ON "sample_code" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sample_code_library_id_idx" ON "sample_code" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "sample_copy_sample_code_id_idx" ON "sample_copy" USING btree ("sample_code_id");--> statement-breakpoint
CREATE INDEX "sample_copy_created_at_idx" ON "sample_copy" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sample_like_user_sample_unique_idx" ON "sample_like" USING btree ("user_id","sample_code_id");--> statement-breakpoint
CREATE INDEX "sample_like_sample_code_id_idx" ON "sample_like" USING btree ("sample_code_id");--> statement-breakpoint
CREATE INDEX "user_notification_user_id_is_read_idx" ON "user_notification" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "user_notification_created_at_idx" ON "user_notification" USING btree ("created_at");