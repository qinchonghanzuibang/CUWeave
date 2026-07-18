CREATE TABLE "catalog_coverage" (
	"academic_year" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"upstream_revision" char(40) NOT NULL,
	"expected_subject_count" integer NOT NULL,
	"discovered_file_count" integer NOT NULL,
	"imported_subject_count" integer NOT NULL,
	"course_count" integer NOT NULL,
	"offering_count" integer NOT NULL,
	"section_count" integer NOT NULL,
	"instructor_count" integer NOT NULL,
	"warning_count" integer NOT NULL,
	"report" jsonb NOT NULL,
	"validated_at" timestamp with time zone NOT NULL,
	"imported_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_coverage_status_check" CHECK ("catalog_coverage"."status" in ('complete', 'partial'))
);
--> statement-breakpoint
ALTER TABLE "course_offering" DROP CONSTRAINT "course_offering_term_check";--> statement-breakpoint
CREATE INDEX "course_subject_idx" ON "course" USING btree ("subject_code");--> statement-breakpoint
CREATE INDEX "course_catalog_title_idx" ON "course_catalog_version" USING btree ("title");--> statement-breakpoint
CREATE INDEX "instructor_display_idx" ON "instructor" USING btree ("display_value");--> statement-breakpoint
ALTER TABLE "course_offering" ADD CONSTRAINT "course_offering_term_check" CHECK ("course_offering"."term_key" in ('term-1', 'term-2', 'summer-session', 'academic-year'));