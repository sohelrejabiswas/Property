CREATE SEQUENCE IF NOT EXISTS "property_code_seq" START 1;
--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'video');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('available', 'sold', 'on_hold');--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_code" text DEFAULT ('LND-' || lpad(nextval('property_code_seq')::text, 5, '0')) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "property_status" DEFAULT 'available' NOT NULL,
	"asking_price" numeric(14, 2),
	"land_area" numeric(14, 4),
	"area_unit" text DEFAULT 'decimal' NOT NULL,
	"state" text,
	"district" text,
	"locality" text,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"contact_name" text,
	"contact_phone" text,
	"whatsapp_number" text,
	"internal_notes" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_property_code_unique" UNIQUE("property_code")
);
--> statement-breakpoint
CREATE TABLE "property_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"google_drive_file_id" text NOT NULL,
	"google_drive_folder_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" "media_type" NOT NULL,
	"mime_type" text NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_media_google_drive_file_id_unique" UNIQUE("google_drive_file_id")
);
--> statement-breakpoint
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_created_at_idx" ON "properties" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "properties_published_idx" ON "properties" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "property_media_property_idx" ON "property_media" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_media_one_cover_idx" ON "property_media" USING btree ("property_id") WHERE "property_media"."is_cover";