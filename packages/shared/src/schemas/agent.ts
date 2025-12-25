/**
 * Agent Validation Schemas
 *
 * Zod schemas for agent-related requests.
 */

import { z } from 'zod';

// Agent name must be URL-safe: lowercase alphanumeric and hyphens
const agentNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export const agentConfigSchema = z.object({
  // Resource allocation
  region: z.string().min(1).max(10).default('iad'),
  cpuKind: z.enum(['shared', 'dedicated']).default('shared'),
  cpus: z.number().int().min(1).max(8).default(1),
  memoryMb: z.number().int().min(256).max(8192).default(256),
  storageSizeGb: z.number().int().min(1).max(100).default(1),

  // Environment variables
  env: z.record(z.string()).optional(),

  // Triggers (for future use)
  triggers: z
    .object({
      webhook: z.boolean().optional(),
      cron: z.string().optional(),
      email: z.boolean().optional(),
    })
    .optional(),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

export const createAgentSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(32, 'Name must be at most 32 characters')
    .regex(
      agentNameRegex,
      'Name must be lowercase alphanumeric with hyphens, cannot start or end with hyphen'
    )
    .transform((val) => val.toLowerCase()),
  description: z.string().max(500, 'Description is too long').optional(),
  config: agentConfigSchema.optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(32, 'Name must be at most 32 characters')
    .regex(
      agentNameRegex,
      'Name must be lowercase alphanumeric with hyphens, cannot start or end with hyphen'
    )
    .transform((val) => val.toLowerCase())
    .optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  config: agentConfigSchema.partial().optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
