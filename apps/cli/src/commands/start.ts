/**
 * Start Command
 *
 * Start a stopped agent.
 */

import ora from 'ora';
import { getApiClient } from '../lib/api-client';
import { isLoggedIn } from '../lib/config';
import { success, error, info, formatStatus } from '../lib/output';
import { findAgent, getAgentName } from './status';

interface Agent {
  id: string;
  name: string;
  status: string;
}

export async function start(nameArg?: string): Promise<void> {
  if (!isLoggedIn()) {
    error('Not logged in');
    info('Run: agentiom login');
    process.exit(1);
  }

  const spinner = ora('Starting agent...').start();

  try {
    const name = await getAgentName(nameArg);
    const agent = await findAgent(name);

    if (agent.status === 'running') {
      spinner.stop();
      info(`Agent "${agent.name}" is already running`);
      return;
    }

    if (agent.status !== 'stopped') {
      spinner.stop();
      error(`Cannot start agent in ${formatStatus(agent.status)} state`);
      process.exit(1);
    }

    const client = getApiClient();
    const response = await client.post<{ agent: Agent }>(`/agents/${agent.id}/start`);

    spinner.stop();
    success(`Agent "${response.agent.name}" started`);
  } catch (err) {
    spinner.stop();
    error(err instanceof Error ? err.message : 'Failed to start agent');
    process.exit(1);
  }
}
