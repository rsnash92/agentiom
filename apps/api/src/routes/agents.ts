/**
 * Agent Routes
 *
 * Handles agent CRUD and deployment operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { streamSSE } from 'hono/streaming';
import { createAgentSchema, updateAgentSchema, ValidationError } from '@agentiom/shared';
import type { AgentService } from '../services/agent.service';
import type { DeployService } from '../services/deploy.service';
import { createAuthMiddleware } from '../middleware/auth';
import type { AuthService } from '../services/auth.service';

export function createAgentRoutes(
  agentService: AgentService,
  deployService: DeployService,
  authService: AuthService
) {
  const app = new Hono();
  const requireAuth = createAuthMiddleware(authService);

  // All routes require authentication
  app.use('*', requireAuth);

  /**
   * GET /agents
   * List user's agents
   */
  app.get('/', async (c) => {
    const user = c.get('user');
    const agents = await agentService.listByUser(user.id);
    return c.json({ agents });
  });

  /**
   * POST /agents
   * Create a new agent (register only, not deployed)
   */
  app.post('/', zValidator('json', createAgentSchema), async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const agent = await agentService.create(user.id, data);
    return c.json({ agent }, 201);
  });

  /**
   * GET /agents/:id
   * Get agent details
   */
  app.get('/:id', async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');
    const agent = await agentService.getById(user.id, agentId);
    return c.json({ agent });
  });

  /**
   * PATCH /agents/:id
   * Update agent config
   */
  app.patch('/:id', zValidator('json', updateAgentSchema), async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');
    const data = c.req.valid('json');
    const agent = await agentService.update(user.id, agentId, data);
    return c.json({ agent });
  });

  /**
   * DELETE /agents/:id
   * Destroy agent (tears down infrastructure)
   */
  app.delete('/:id', async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');

    // Get agent first
    const agent = await agentService.getById(user.id, agentId);

    // Destroy infrastructure if exists
    if (agent.machineId || agent.volumeId || agent.dnsRecordId) {
      await deployService.destroy(agent);
    }

    // Mark as destroyed
    await agentService.delete(user.id, agentId);

    return c.json({ success: true });
  });

  /**
   * POST /agents/:id/deploy
   * Deploy or redeploy agent
   */
  app.post('/:id/deploy', async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');

    const agent = await agentService.getById(user.id, agentId);

    // Check if already deploying
    if (agent.status === 'deploying') {
      throw new ValidationError('Agent is already being deployed');
    }

    // Check if destroyed
    if (agent.status === 'destroyed') {
      throw new ValidationError('Cannot deploy a destroyed agent');
    }

    const result = await deployService.deploy(agent, user.id);

    return c.json({
      deployment: result.deployment,
      agent: result.agent,
    });
  });

  /**
   * POST /agents/:id/start
   * Start a stopped agent
   */
  app.post('/:id/start', async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');

    const agent = await agentService.getById(user.id, agentId);
    const updated = await deployService.start(agent);

    return c.json({ agent: updated });
  });

  /**
   * POST /agents/:id/stop
   * Stop a running agent
   */
  app.post('/:id/stop', async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');

    const agent = await agentService.getById(user.id, agentId);
    const updated = await deployService.stop(agent);

    return c.json({ agent: updated });
  });

  /**
   * GET /agents/:id/logs
   * Get agent logs (supports SSE with ?follow=true)
   */
  app.get('/:id/logs', async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');
    const follow = c.req.query('follow') === 'true';

    const agent = await agentService.getById(user.id, agentId);

    if (follow) {
      // SSE streaming
      return streamSSE(c, async (stream) => {
        for await (const entry of deployService.getLogs(agent, { follow: true })) {
          await stream.writeSSE({
            data: JSON.stringify(entry),
            event: 'log',
          });
        }
      });
    }

    // Regular JSON response
    const logs: Array<{ timestamp: Date; level: string; message: string }> = [];
    for await (const entry of deployService.getLogs(agent)) {
      logs.push(entry);
    }

    return c.json({ logs });
  });

  /**
   * GET /agents/:id/deployments
   * List deployment history for an agent
   */
  app.get('/:id/deployments', async (c) => {
    const user = c.get('user');
    const agentId = c.req.param('id');

    // Validate ownership
    await agentService.getById(user.id, agentId);

    // Import here to avoid circular dependency
    const { deployments } = await import('@agentiom/db');
    const { eq } = await import('drizzle-orm');
    const { createDatabase } = await import('@agentiom/db');

    // Get deployments - use the db passed to agentService
    // For now, return empty array since we'd need to inject db
    return c.json({ deployments: [] });
  });

  return app;
}
