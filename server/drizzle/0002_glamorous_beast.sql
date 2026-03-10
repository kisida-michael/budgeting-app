CREATE TABLE "plaid_accounts" (
	"account_id" varchar(128) PRIMARY KEY NOT NULL,
	"item_id" varchar(128) NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"official_name" text,
	"mask" varchar(32),
	"type" varchar(64) NOT NULL,
	"subtype" varchar(64),
	"available_balance" numeric(12, 2),
	"current_balance" numeric(12, 2),
	"iso_currency_code" varchar(8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"item_id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"institution_id" varchar(128),
	"institution_name" text,
	"last_cursor" text,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "plaid_account_id" varchar(128);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "plaid_transaction_id" varchar(128);--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_item_id_plaid_items_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plaid_items"("item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plaid_account_id_plaid_accounts_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_plaid_transaction_id_unique" ON "transactions" USING btree ("user_id","plaid_transaction_id");