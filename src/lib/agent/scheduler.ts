/**
 * Agent Scheduler
 * Manages the automatic execution of active agents based on their execution intervals
 */

import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { executeAgentCycle } from './executor';

// Store active interval timers
const activeAgents = new Map<string, NodeJS.Timeout>();

/**
 * Start the scheduler for a specific agent
 */
export function startAgentScheduler(agentId: string, intervalSeconds: number = 300) {
  // Don't start if already running
  if (activeAgents.has(agentId)) {
    console.log(`Agent ${agentId} scheduler already running`);
    return;
  }

  console.log(`Starting scheduler for agent ${agentId} (interval: ${intervalSeconds}s)`);

  // Run immediately, then on interval
  runAgentCycle(agentId);

  const timer = setInterval(() => {
    runAgentCycle(agentId);
  }, intervalSeconds * 1000);

  activeAgents.set(agentId, timer);
}

/**
 * Stop the scheduler for a specific agent
 */
export function stopAgentScheduler(agentId: string) {
  const timer = activeAgents.get(agentId);
  if (timer) {
    clearInterval(timer);
    activeAgents.delete(agentId);
    console.log(`Stopped scheduler for agent ${agentId}`);
  }
}

/**
 * Check if an agent's scheduler is running
 */
export function isAgentSchedulerRunning(agentId: string): boolean {
  return activeAgents.has(agentId);
}

/**
 * Get all running agent IDs
 */
export function getRunningAgents(): string[] {
  return Array.from(activeAgents.keys());
}

/**
 * Run one cycle for an agent (with status check)
 */
async function runAgentCycle(agentId: string) {
  try {
    // Verify agent is still active
    const [agent] = await db
      .select({ status: agents.status })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent || agent.status !== 'active') {
      console.log(`Agent ${agentId} no longer active, stopping scheduler`);
      stopAgentScheduler(agentId);
      return;
    }

    // Execute the cycle
    console.log(`Running cycle for agent ${agentId}`);
    const results = await executeAgentCycle(agentId);
    console.log(`Agent ${agentId} cycle complete: ${results.length} decisions`);

    // Update last execution time
    await db
      .update(agents)
      .set({ lastExecutionAt: new Date() })
      .where(eq(agents.id, agentId));

  } catch (error) {
    console.error(`Error running agent ${agentId} cycle:`, error);
  }
}

/**
 * Initialize schedulers for all active agents (called on server start)
 */
export async function initializeAllSchedulers() {
  try {
    const activeAgentsList = await db
      .select({
        id: agents.id,
        executionInterval: agents.executionInterval,
      })
      .from(agents)
      .where(eq(agents.status, 'active'));

    console.log(`Initializing schedulers for ${activeAgentsList.length} active agents`);

    for (const agent of activeAgentsList) {
      startAgentScheduler(agent.id, agent.executionInterval);
    }
  } catch (error) {
    console.error('Failed to initialize agent schedulers:', error);
  }
}

/**
 * Stop all running schedulers (called on server shutdown)
 */
export function stopAllSchedulers() {
  console.log(`Stopping all ${activeAgents.size} agent schedulers`);
  for (const agentId of activeAgents.keys()) {
    stopAgentScheduler(agentId);
  }
}
