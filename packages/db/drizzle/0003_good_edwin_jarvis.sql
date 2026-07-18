CREATE TABLE "programme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"stream" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programme_code_unique" UNIQUE("code"),
	CONSTRAINT "programme_code_check" CHECK ("programme"."code" ~ '^[A-Z0-9-]{2,40}$')
);
--> statement-breakpoint
CREATE TABLE "rate_limit_event" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"key_hash" char(64) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_hash_check" CHECK ("rate_limit_event"."key_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "requirement_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"configuration" jsonb NOT NULL,
	"verification_status" text DEFAULT 'draft' NOT NULL,
	"maintainer_reviewed_at" timestamp with time zone,
	"explanatory_note" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "requirement_rule_kind_check" CHECK ("requirement_rule"."kind" in ('minimum_course_count', 'minimum_unit_count', 'required_courses', 'choose_n', 'course_allowlist', 'category', 'exclusion', 'no_double_counting', 'manual_review', 'unsupported')),
	CONSTRAINT "requirement_rule_status_check" CHECK ("requirement_rule"."verification_status" in ('draft', 'verified', 'needs_review')),
	CONSTRAINT "requirement_rule_position_check" CHECK ("requirement_rule"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "requirement_rule_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"parent_id" uuid,
	"label" text NOT NULL,
	"operator" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "requirement_group_operator_check" CHECK ("requirement_rule_group"."operator" in ('all', 'any')),
	CONSTRAINT "requirement_group_position_check" CHECK ("requirement_rule_group"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "requirement_rule_source" (
	"rule_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "requirement_rule_source_rule_id_source_id_pk" PRIMARY KEY("rule_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "requirement_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme_id" uuid NOT NULL,
	"entry_year" integer NOT NULL,
	"effective_academic_period" text NOT NULL,
	"source_revision" text NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"supersedes_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_set_version_unique" UNIQUE("programme_id","entry_year","effective_academic_period","source_revision","version"),
	CONSTRAINT "requirement_set_status_check" CHECK ("requirement_set"."status" in ('draft', 'verified', 'superseded', 'archived')),
	CONSTRAINT "requirement_set_entry_year_check" CHECK ("requirement_set"."entry_year" between 2000 and 2200),
	CONSTRAINT "requirement_set_version_check" CHECK ("requirement_set"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "requirement_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"source_revision" text NOT NULL,
	"effective_academic_year" text NOT NULL,
	"verification_status" text NOT NULL,
	"maintainer_verified_at" timestamp with time zone,
	"explanatory_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_source_url_unique" UNIQUE("requirement_set_id","url"),
	CONSTRAINT "requirement_source_https_check" CHECK ("requirement_source"."url" like 'https://%'),
	CONSTRAINT "requirement_source_status_check" CHECK ("requirement_source"."verification_status" in ('official', 'maintainer_verified', 'needs_review'))
);
--> statement-breakpoint
CREATE TABLE "requirement_verification_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"actor_id" text,
	"event_type" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_event_type_check" CHECK ("requirement_verification_event"."event_type" in ('created', 'source_added', 'rule_added', 'validated', 'verified', 'superseded', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "user_planning_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"programme_id" uuid NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"entry_year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_requirement_course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"course_id" uuid,
	"course_code" text NOT NULL,
	"title_raw" text DEFAULT '' NOT NULL,
	"units" numeric(7, 3) NOT NULL,
	"planning_status" text NOT NULL,
	"origin" text DEFAULT 'manual' NOT NULL,
	"approval_status" text DEFAULT 'unknown' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_requirement_course_unique" UNIQUE("user_id","course_code"),
	CONSTRAINT "user_requirement_course_code_check" CHECK ("user_requirement_course"."course_code" ~ '^[A-Z]{4}[0-9A-Z]{4,5}$'),
	CONSTRAINT "user_requirement_course_status_check" CHECK ("user_requirement_course"."planning_status" in ('completed', 'planned')),
	CONSTRAINT "user_requirement_course_origin_check" CHECK ("user_requirement_course"."origin" in ('manual', 'favorite', 'schedule')),
	CONSTRAINT "user_requirement_course_approval_check" CHECK ("user_requirement_course"."approval_status" in ('approved', 'unknown', 'rejected')),
	CONSTRAINT "user_requirement_course_units_check" CHECK ("user_requirement_course"."units" >= 0)
);
--> statement-breakpoint
ALTER TABLE "requirement_rule" ADD CONSTRAINT "requirement_rule_requirement_set_id_requirement_set_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."requirement_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_rule" ADD CONSTRAINT "requirement_rule_group_id_requirement_rule_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."requirement_rule_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_rule_group" ADD CONSTRAINT "requirement_rule_group_requirement_set_id_requirement_set_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."requirement_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_rule_source" ADD CONSTRAINT "requirement_rule_source_rule_id_requirement_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."requirement_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_rule_source" ADD CONSTRAINT "requirement_rule_source_source_id_requirement_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."requirement_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_set" ADD CONSTRAINT "requirement_set_programme_id_programme_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programme"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_set" ADD CONSTRAINT "requirement_set_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_set" ADD CONSTRAINT "requirement_set_verified_by_app_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_source" ADD CONSTRAINT "requirement_source_requirement_set_id_requirement_set_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."requirement_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_verification_event" ADD CONSTRAINT "requirement_verification_event_requirement_set_id_requirement_set_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."requirement_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_verification_event" ADD CONSTRAINT "requirement_verification_event_actor_id_app_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_planning_profile" ADD CONSTRAINT "user_planning_profile_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_planning_profile" ADD CONSTRAINT "user_planning_profile_programme_id_programme_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programme"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_planning_profile" ADD CONSTRAINT "user_planning_profile_requirement_set_id_requirement_set_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."requirement_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_requirement_course" ADD CONSTRAINT "user_requirement_course_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_requirement_course" ADD CONSTRAINT "user_requirement_course_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_limit_lookup_idx" ON "rate_limit_event" USING btree ("scope","key_hash","occurred_at");--> statement-breakpoint
CREATE INDEX "rate_limit_expiry_idx" ON "rate_limit_event" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "requirement_rule_group_idx" ON "requirement_rule" USING btree ("group_id","position");--> statement-breakpoint
CREATE INDEX "requirement_group_set_idx" ON "requirement_rule_group" USING btree ("requirement_set_id","position");--> statement-breakpoint
CREATE INDEX "requirement_set_lookup_idx" ON "requirement_set" USING btree ("programme_id","entry_year","status");--> statement-breakpoint
CREATE INDEX "requirement_event_set_idx" ON "requirement_verification_event" USING btree ("requirement_set_id","created_at");--> statement-breakpoint
CREATE INDEX "user_requirement_course_user_idx" ON "user_requirement_course" USING btree ("user_id");