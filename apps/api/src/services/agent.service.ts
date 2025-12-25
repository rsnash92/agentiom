/**
 * Agent Service
 *
 * Handles CRUD operations for agents.
 */

import { eq, and } from 'drizzle-orm';
import type { DatabaseClient } from '@agentiom/db';
import { agents } from '@agentiom/db';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  type CreateAgentInput,
  type UpdateAgentInput,
} from '@agentiom/shared';
import { createLogger } from '@agentiom/logger';

const logger = createLogger('agent-service');

export type Agent = typeof agents.$inferSelect;

export class AgentService {
  constructor(private db: DatabaseClient) {}

  /**
   * Create a new agent
   */
  async create(userId: string, input: CreateAgentInput): Promise<Agent> {
    logger.info({ userId, name: input.name }, 'Creating agent');

    // Check if slug is unique
    const existing = await this.db
      .select()
      .from(agents)
      .where(eq(agents.slug, input.name))
      .get();

    if (existing) {
      throw new ConflictError('Agent with this name already exists');
    }

    // Merge config with defaults
    const config = input.config ?? {};

    const [agent] = await this.db
      .insert(agents)
      .values({
        userId,
        name: input.name,
        slug: input.name, // slug is same as name (already validated)
        description: input.description ?? null,
        region: config.region ?? 'iad',
        cpuKind: config.cpuKind ?? 'shared',
        cpus: config.cpus ?? 1,
        memoryMb: config.memoryMb ?? 256,
        storageSizeGb: config.storageSizeGb ?? 1,
        config: config,
        status: 'pending',
      })
      .returning();

    if (!agent) {
      throw new Error('Failed to create agent');
    }

    logger.info({ userId, agentId: agent.id }, 'Agent created');

    return agent;
  }

  /**
   * Get agent by ID (validates ownership)
   */
  async getById(userId: string, agentId: string): Promise<Agent> {
    const agent = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .get();

    if (!agent) {
      throw new NotFoundError('Agent', agentId);
    }

    if (agent.userId !== userId) {
      throw new ForbiddenError('You do not have access to this agent');
    }

    return agent;
  }

  /**
   * Get agent by ID without ownership check (internal use)
   */
  async getByIdInternal(agentId: string): Promise<Agent | null> {
    return this.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .get() ?? null;
  }

  /**
   * List agents for a user
   */
  async listByUser(userId: string): Promise<Agent[]> {
    return this.db
      .select()
      .from(agents)
      .where(eq(agents.userId, userId));
  }

  /**
   * Update an agent
   */
  async update(userId: string, agentId: string, input: UpdateAgentInput): Promise<Agent> {
    logger.info({ userId, agentId }, 'Updating agent');

    // Get agent (validates ownership)
    const existing = await this.getById(userId, agentId);

    // If name is changing, check uniqueness
    if (input.name && input.name !== existing.name) {
      const slugExists = await this.db
        .select()
        .from(agents)
        .where(and(eq(agents.slug, input.name), eq(agents.userId, userId)))
        .get();

      if (slugExists && slugExists.id !== agentId) {
        throw new ConflictError('Agent with this name already exists');
      }
    }

    // Merge config updates
    const existingConfig = (existing.config as Record<string, unknown>) ?? {};
    const configUpdate = input.config ?? {};
    const mergedConfig = { ...existingConfig, ...configUpdate };

    const updateData: Partial<typeof agents.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
      updateData.slug = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.config !== undefined) {
      updateData.config = mergedConfig;
      // Also update individual fields
      if (configUpdate.region) updateData.region = configUpdate.region;
      if (configUpdate.cpuKind) updateData.cpuKind = configUpdate.cpuKind;
      if (configUpdate.cpus) updateData.cpus = configUpdate.cpus;
      if (configUpdate.memoryMb) updateData.memoryMb = configUpdate.memoryMb;
      if (configUpdate.storageSizeGb) updateData.storageSizeGb = configUpdate.storageSizeGb;
    }

    const [updated] = await this.db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, agentId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update agent');
    }

    logger.info({ userId, agentId }, 'Agent updated');

    return updated;
  }

  /**
   * Update agent status (internal)
   */
  async updateStatus(
    agentId: string,
    status: Agent['status'],
    additionalFields?: Partial<typeof agents.$inferInsert>
  ): Promise<Agent> {
    const [updated] = await this.db
      .update(agents)
      .set({
        status,
        updatedAt: new Date(),
        ...additionalFields,
      })
      .where(eq(agents.id, agentId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update agent status');
    }

    return updated;
  }

  /**
   * Delete an agent (sets status to destroyed)
   */
  async delete(userId: string, agentId: string): Promise<void> {
    logger.info({ userId, agentId }, 'Deleting agent');

    // Validate ownership
    await this.getById(userId, agentId);

    // Soft delete by setting status
    await this.db
      .update(agents)
      .set({
        status: 'destroyed',
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    logger.info({ userId, agentId }, 'Agent marked as destroyed');
  }

  /**
   * Hard delete an agent (removes from database)
   */
  async hardDelete(agentId: string): Promise<void> {
    await this.db.delete(agents).where(eq(agents.id, agentId));
  }
}
