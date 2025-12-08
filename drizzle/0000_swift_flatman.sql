CREATE TABLE "agent_genomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"reasoning" jsonb NOT NULL,
	"signals" jsonb NOT NULL,
	"behavior" jsonb NOT NULL,
	"performance" jsonb DEFAULT '{}'::jsonb,
	"parent_genome_id" uuid,
	"mutations" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"log_type" text NOT NULL,
	"symbol" text,
	"content" text NOT NULL,
	"decision" jsonb,
	"confidence" integer,
	"market_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"wallet_address" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"personality" text NOT NULL,
	"strategy" text NOT NULL,
	"policies" jsonb DEFAULT '{"maxLeverage":10,"maxPositionSizeUsd":1000,"maxPositionSizePct":10,"maxDrawdownPct":20,"approvedPairs":["BTC","ETH"]}'::jsonb NOT NULL,
	"llm_provider" text DEFAULT 'claude' NOT NULL,
	"execution_interval_seconds" integer DEFAULT 300 NOT NULL,
	"data_weights" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'paused' NOT NULL,
	"genome_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competition_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"agent_id" uuid,
	"user_id" uuid NOT NULL,
	"starting_balance" numeric NOT NULL,
	"current_balance" numeric,
	"pnl" numeric DEFAULT '0',
	"pnl_pct" numeric DEFAULT '0',
	"rank" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"mode" text NOT NULL,
	"entry_fee" numeric DEFAULT '0',
	"prize_pool" numeric DEFAULT '0',
	"max_participants" integer,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"rules" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"balance_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"description" text NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"conditions" text,
	"actions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"size" numeric NOT NULL,
	"size_usd" numeric NOT NULL,
	"entry_price" numeric NOT NULL,
	"mark_price" numeric,
	"liquidation_price" numeric,
	"leverage" numeric NOT NULL,
	"unrealized_pnl" numeric,
	"realized_pnl" numeric DEFAULT '0',
	"take_profit" numeric,
	"stop_loss" numeric,
	"status" text DEFAULT 'open' NOT NULL,
	"entry_reasoning" text,
	"exit_reasoning" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"email" text,
	"credits" integer DEFAULT 100 NOT NULL,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
ALTER TABLE "agent_genomes" ADD CONSTRAINT "agent_genomes_parent_genome_id_agent_genomes_id_fk" FOREIGN KEY ("parent_genome_id") REFERENCES "public"."agent_genomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_genome_id_agent_genomes_id_fk" FOREIGN KEY ("genome_id") REFERENCES "public"."agent_genomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "logs_agent_idx" ON "agent_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "logs_created_idx" ON "agent_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agents_user_idx" ON "agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "competition_agent_idx" ON "competition_entries" USING btree ("competition_id","agent_id");--> statement-breakpoint
CREATE INDEX "credits_user_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "positions_agent_idx" ON "positions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "positions_status_idx" ON "positions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_wallet_idx" ON "users" USING btree ("wallet_address");