ALTER TABLE "requirement_rule_group" ADD CONSTRAINT "requirement_group_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."requirement_rule_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_set" ADD CONSTRAINT "requirement_set_supersedes_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."requirement_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "system_metadata" ("key", "value", "updated_at")
VALUES ('schema_version', '0004_requirements_launch', now())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = now();
