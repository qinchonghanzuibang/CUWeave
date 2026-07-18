CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_account_provider_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "course_favorite" (
	"user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_favorite_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"offering_id" uuid NOT NULL,
	"instructor_id" uuid,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"recommendation" boolean,
	"attendance_requirement" text NOT NULL,
	"assessment_summary" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"moderation_state" text DEFAULT 'published' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_attendance_check" CHECK ("review"."attendance_requirement" in ('required', 'optional', 'unknown')),
	CONSTRAINT "review_moderation_state_check" CHECK ("review"."moderation_state" in ('published', 'under_review', 'hidden')),
	CONSTRAINT "review_body_length_check" CHECK (char_length("review"."body") between 20 and 4000),
	CONSTRAINT "review_assessment_length_check" CHECK (char_length("review"."assessment_summary") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "review_rating" (
	"review_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"value" smallint NOT NULL,
	CONSTRAINT "review_rating_review_id_dimension_pk" PRIMARY KEY("review_id","dimension"),
	CONSTRAINT "review_rating_dimension_check" CHECK ("review_rating"."dimension" in ('overall', 'teaching', 'workload', 'difficulty', 'grading', 'usefulness')),
	CONSTRAINT "review_rating_value_check" CHECK ("review_rating"."value" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "review_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"reporter_id" text NOT NULL,
	"category" text NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"moderator_id" text,
	"resolution_notes" text DEFAULT '' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_report_reporter_unique" UNIQUE("review_id","reporter_id"),
	CONSTRAINT "review_report_category_check" CHECK ("review_report"."category" in ('spam', 'harassment', 'privacy', 'incorrect', 'other')),
	CONSTRAINT "review_report_status_check" CHECK ("review_report"."status" in ('open', 'resolved', 'dismissed')),
	CONSTRAINT "review_report_explanation_check" CHECK (char_length("review_report"."explanation") <= 1000),
	CONSTRAINT "review_report_resolution_check" CHECK (char_length("review_report"."resolution_notes") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "review_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"editor_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_vote" (
	"review_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_vote_review_id_user_id_pk" PRIMARY KEY("review_id","user_id"),
	CONSTRAINT "review_vote_value_check" CHECK ("review_vote"."value" in ('helpful', 'not_helpful'))
);
--> statement-breakpoint
CREATE TABLE "saved_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"share_token_hash" char(64),
	"share_created_at" timestamp with time zone,
	"share_revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_schedule_version_check" CHECK ("saved_schedule"."version" > 0),
	CONSTRAINT "saved_schedule_name_check" CHECK (char_length(trim("saved_schedule"."name")) between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "saved_schedule_item" (
	"schedule_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_schedule_item_schedule_id_section_id_pk" PRIMARY KEY("schedule_id","section_id"),
	CONSTRAINT "saved_schedule_item_position_check" CHECK ("saved_schedule_item"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"verified_cuhk_email" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_role_check" CHECK ("app_user"."role" in ('user', 'moderator', 'admin')),
	CONSTRAINT "app_user_status_check" CHECK ("app_user"."status" in ('active', 'deactivated'))
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_favorite" ADD CONSTRAINT "course_favorite_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_favorite" ADD CONSTRAINT "course_favorite_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_author_id_app_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_offering_id_course_offering_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offering"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_instructor_id_instructor_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_rating" ADD CONSTRAINT "review_rating_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_reporter_id_app_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_moderator_id_app_user_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_revision" ADD CONSTRAINT "review_revision_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_revision" ADD CONSTRAINT "review_revision_editor_id_app_user_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_vote" ADD CONSTRAINT "review_vote_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_vote" ADD CONSTRAINT "review_vote_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_schedule" ADD CONSTRAINT "saved_schedule_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_schedule_item" ADD CONSTRAINT "saved_schedule_item_schedule_id_saved_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."saved_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_schedule_item" ADD CONSTRAINT "saved_schedule_item_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_active_scope_unique" ON "review" USING btree ("author_id","offering_id",coalesce("instructor_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "review"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "review_offering_idx" ON "review" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "review_report_status_idx" ON "review_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "review_revision_review_idx" ON "review_revision" USING btree ("review_id","created_at");--> statement-breakpoint
CREATE INDEX "saved_schedule_user_idx" ON "saved_schedule" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_schedule_share_hash_unique" ON "saved_schedule" USING btree ("share_token_hash") WHERE "saved_schedule"."share_token_hash" is not null;--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_email_unique" ON "app_user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");