CREATE TABLE "budget_periods" (
	"user_id" text NOT NULL,
	"category_name" varchar(80) NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"limit" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_periods_pk" PRIMARY KEY("user_id","category_name","month","year")
);
--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_category_name_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."categories"("name") ON DELETE cascade ON UPDATE no action;