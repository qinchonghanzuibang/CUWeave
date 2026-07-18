ALTER TABLE "auth_session" DROP CONSTRAINT "auth_session_ip_disabled_check";--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_ip_disabled_check" CHECK (coalesce("auth_session"."ip_address", '') = '');
--> statement-breakpoint
INSERT INTO "system_metadata" ("key", "value", "updated_at")
VALUES ('schema_version', '0006_privacy_hardening', now())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = now();
