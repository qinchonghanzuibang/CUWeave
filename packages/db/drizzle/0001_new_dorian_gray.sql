CREATE TABLE "course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_code" text NOT NULL,
	"catalog_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_identity_unique" UNIQUE("subject_code","catalog_number")
);
--> statement-breakpoint
CREATE TABLE "course_catalog_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"subject_raw" text NOT NULL,
	"course_code_raw" text NOT NULL,
	"title_raw" text NOT NULL,
	"title" text NOT NULL,
	"credits_raw" text NOT NULL,
	"credits" numeric(6, 2) NOT NULL,
	"academic_career_raw" text,
	"record_hash" char(64) NOT NULL,
	"valid_from_import_run_id" uuid NOT NULL,
	"valid_to_import_run_id" uuid,
	"first_seen_snapshot_id" uuid NOT NULL,
	"last_seen_snapshot_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_offering" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"term_key" text NOT NULL,
	"term_code_raw" text NOT NULL,
	"term_name_raw" text NOT NULL,
	"record_hash" char(64) NOT NULL,
	"valid_from_import_run_id" uuid NOT NULL,
	"valid_to_import_run_id" uuid,
	"first_seen_snapshot_id" uuid NOT NULL,
	"last_seen_snapshot_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_offering_term_check" CHECK ("course_offering"."term_key" in ('term-1', 'term-2', 'summer-session'))
);
--> statement-breakpoint
CREATE TABLE "import_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"adapter_name" text NOT NULL,
	"adapter_version" text NOT NULL,
	"status" text NOT NULL,
	"reused_import_run_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"report" jsonb,
	"error_code" text,
	CONSTRAINT "import_run_status_check" CHECK ("import_run"."status" in ('running', 'succeeded', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "instructor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_key" text NOT NULL,
	"display_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_display_key_unique" UNIQUE("display_key")
);
--> statement-breakpoint
CREATE TABLE "meeting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"ordinal" smallint NOT NULL,
	"time_raw" text NOT NULL,
	"time_status" text NOT NULL,
	"weekday" smallint,
	"start_time" time,
	"end_time" time,
	"teaching_dates_raw" text NOT NULL,
	"location_raw" text NOT NULL,
	"instructor_display_raw" text NOT NULL,
	CONSTRAINT "meeting_section_ordinal_unique" UNIQUE("section_id","ordinal"),
	CONSTRAINT "meeting_time_status_check" CHECK ("meeting"."time_status" in ('parsed', 'unknown')),
	CONSTRAINT "meeting_weekday_check" CHECK ("meeting"."weekday" is null or "meeting"."weekday" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"section_key" text NOT NULL,
	"section_label_raw" text NOT NULL,
	"class_attributes_raw" text NOT NULL,
	"capacity_raw" text NOT NULL,
	"capacity" integer NOT NULL,
	"enrolled_raw" text NOT NULL,
	"enrolled" integer NOT NULL,
	"available_seats_raw" text NOT NULL,
	"available_seats" integer NOT NULL,
	"waitlist_capacity_raw" text NOT NULL,
	"waitlist_capacity" integer NOT NULL,
	"waitlist_total_raw" text NOT NULL,
	"waitlist_total" integer NOT NULL,
	"availability_status_raw" text NOT NULL,
	"revision_hash" char(64) NOT NULL,
	"valid_from_import_run_id" uuid NOT NULL,
	"valid_to_import_run_id" uuid,
	"first_seen_snapshot_id" uuid NOT NULL,
	"last_seen_snapshot_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_counts_nonnegative_check" CHECK ("section"."capacity" >= 0 and "section"."enrolled" >= 0 and "section"."available_seats" >= 0 and "section"."waitlist_capacity" >= 0 and "section"."waitlist_total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "section_instructor" (
	"section_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"source_display_raw" text NOT NULL,
	"meeting_ordinals" smallint[] NOT NULL,
	CONSTRAINT "section_instructor_section_id_instructor_id_pk" PRIMARY KEY("section_id","instructor_id")
);
--> statement-breakpoint
CREATE TABLE "source_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"source_uri" text NOT NULL,
	"upstream_revision" char(40) NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"academic_year" text NOT NULL,
	"subject_code" text NOT NULL,
	"is_complete" boolean NOT NULL,
	"content_sha256" char(64) NOT NULL,
	"raw_content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_snapshot_identity_unique" UNIQUE("source_name","source_uri","upstream_revision","retrieved_at","academic_year","subject_code","is_complete","content_sha256"),
	CONSTRAINT "source_snapshot_revision_check" CHECK ("source_snapshot"."upstream_revision" ~ '^[0-9a-f]{40}$'),
	CONSTRAINT "source_snapshot_hash_check" CHECK ("source_snapshot"."content_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "source_snapshot_year_check" CHECK ("source_snapshot"."academic_year" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "source_snapshot_subject_check" CHECK ("source_snapshot"."subject_code" ~ '^[A-Z]{4}$')
);
--> statement-breakpoint
ALTER TABLE "course_catalog_version" ADD CONSTRAINT "course_catalog_version_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offering" ADD CONSTRAINT "course_offering_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offering" ADD CONSTRAINT "course_offering_catalog_version_id_course_catalog_version_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."course_catalog_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_run" ADD CONSTRAINT "import_run_snapshot_id_source_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."source_snapshot"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_offering_id_course_offering_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offering"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_instructor" ADD CONSTRAINT "section_instructor_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_instructor" ADD CONSTRAINT "section_instructor_instructor_id_instructor_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_code_search_idx" ON "course" USING btree ("subject_code","catalog_number");--> statement-breakpoint
CREATE UNIQUE INDEX "course_catalog_version_active_unique" ON "course_catalog_version" USING btree ("course_id","academic_year") WHERE "course_catalog_version"."valid_to_import_run_id" is null;--> statement-breakpoint
CREATE INDEX "course_catalog_version_hash_idx" ON "course_catalog_version" USING btree ("course_id","academic_year","record_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "course_offering_active_unique" ON "course_offering" USING btree ("course_id","academic_year","term_key") WHERE "course_offering"."valid_to_import_run_id" is null;--> statement-breakpoint
CREATE INDEX "import_run_snapshot_idx" ON "import_run" USING btree ("snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_run_success_unique" ON "import_run" USING btree ("snapshot_id","adapter_name","adapter_version") WHERE "import_run"."status" = 'succeeded';--> statement-breakpoint
CREATE UNIQUE INDEX "section_active_unique" ON "section" USING btree ("offering_id","section_key") WHERE "section"."valid_to_import_run_id" is null;