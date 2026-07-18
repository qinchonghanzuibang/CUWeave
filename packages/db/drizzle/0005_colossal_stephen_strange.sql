UPDATE "auth_session" SET "ip_address" = NULL WHERE "ip_address" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_ip_disabled_check" CHECK ("auth_session"."ip_address" is null);
--> statement-breakpoint
INSERT INTO "system_metadata" ("key", "value", "updated_at")
VALUES ('schema_version', '0005_privacy_hardening', now())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = now();
