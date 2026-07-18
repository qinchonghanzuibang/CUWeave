WITH ranked_meetings AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "section_id", "time_raw", "teaching_dates_raw", "location_raw", "instructor_display_raw"
		ORDER BY "ordinal", "id"
	) AS duplicate_rank
	FROM "meeting"
)
DELETE FROM "meeting"
USING ranked_meetings
WHERE "meeting"."id" = ranked_meetings."id"
	AND ranked_meetings.duplicate_rank > 1;--> statement-breakpoint
UPDATE "section_instructor"
SET "meeting_ordinals" = coalesce((
	SELECT array_agg("meeting"."ordinal" ORDER BY "meeting"."ordinal")
	FROM "meeting"
	WHERE "meeting"."section_id" = "section_instructor"."section_id"
		AND trim("meeting"."instructor_display_raw") = trim("section_instructor"."source_display_raw")
), '{}'::smallint[]);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_source_identity_unique" ON "meeting" USING btree ("section_id","time_raw","teaching_dates_raw","location_raw","instructor_display_raw");
