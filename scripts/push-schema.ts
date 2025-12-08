import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL required');

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function pushSchema() {
  console.log('Pushing schema changes...');

  // Add llm_config column if it doesn't exist
  await db.execute(sql`
    ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS llm_config jsonb NOT NULL DEFAULT '{
      "primaryModel": "claude-sonnet-4-20250514",
      "simpleModel": "gpt-4o-mini",
      "analysisModel": "deepseek-chat",
      "autoSelect": true,
      "parameters": {
        "temperature": 0.3,
        "topP": 0.9,
        "frequencyPenalty": 0,
        "presencePenalty": 0,
        "maxTokens": 4096
      }
    }'::jsonb
  `);

  // Drop old llm_provider column if exists
  await db.execute(sql`
    ALTER TABLE agents
    DROP COLUMN IF EXISTS llm_provider
  `);

  // Create llm_usage table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS llm_usage (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      model text NOT NULL,
      provider text NOT NULL,
      task_type text NOT NULL,
      input_tokens integer NOT NULL,
      output_tokens integer NOT NULL,
      total_tokens integer NOT NULL,
      cost_usd numeric(10, 6) NOT NULL,
      latency_ms integer NOT NULL,
      success boolean NOT NULL DEFAULT true,
      error_message text,
      created_at timestamptz DEFAULT now() NOT NULL
    )
  `);

  // Create indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS llm_usage_agent_idx ON llm_usage(agent_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS llm_usage_user_idx ON llm_usage(user_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS llm_usage_created_idx ON llm_usage(created_at)
  `);

  console.log('Schema updated successfully!');
  process.exit(0);
}

pushSchema().catch(console.error);
