CREATE TYPE "public"."merchant_match_type" AS ENUM('contains', 'equals');--> statement-breakpoint
CREATE TYPE "public"."transaction_sign_meaning" AS ENUM('charge', 'credit');--> statement-breakpoint
CREATE TABLE "budgets" (
	"user_id" text NOT NULL,
	"category_name" varchar(80) NOT NULL,
	"limit" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_pk" PRIMARY KEY("user_id","category_name")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"name" varchar(80) PRIMARY KEY NOT NULL,
	"order_index" integer NOT NULL,
	"color" text NOT NULL,
	"color_dark" text NOT NULL,
	"color_light" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configurations" (
	"user_id" text NOT NULL,
	"name" varchar(25) NOT NULL,
	"minus_symbol_meaning" "transaction_sign_meaning",
	"plus_symbol_meaning" "transaction_sign_meaning",
	"no_symbol_meaning" "transaction_sign_meaning",
	"date_col_num" integer NOT NULL,
	"amount_col_num" integer NOT NULL,
	"merchant_col_num" integer NOT NULL,
	"has_header" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configurations_pk" PRIMARY KEY("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "merchants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"text" varchar(60) NOT NULL,
	"type" "merchant_match_type" NOT NULL,
	"category_name" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"configuration_name" varchar(25) NOT NULL,
	"category_name" varchar(80) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"day" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"merchant" text NOT NULL,
	"ignored" boolean DEFAULT false NOT NULL,
	"upload_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"files" text NOT NULL,
	"transactions_uploaded" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whitelist" (
	"email" varchar(320) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_name_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."categories"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_category_name_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."categories"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_name_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."categories"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_order_index_unique" ON "categories" USING btree ("order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_user_text_type_unique" ON "merchants" USING btree ("user_id","text","type");