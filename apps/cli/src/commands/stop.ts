/**
 * Stop Command
 *
 * Stop a running agent.
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

export async function stop(nameArg?: string): Promise<void> {
  if (!isLoggedIn()) {
    error('Not logged in');
    info('Run: agentiom login');
    process.exit(1);
  }

  const spinner = ora('Stopping agent...').start();

  try {
    const name = await getAgentName(nameArg);
    const agent = await findAgent(name);

    if (agent.status === 'stopped') {
      spinner.stop();
      info(`Agent "${agent.name}" is already stopped`);
      return;
    }

    if (agent.status !== 'running') {
      spinner.stop();
      error(`Cannot stop agent in ${formatStatus(agent.status)} state`);
      process.exit(1);
    }

    const client = getApiClient();
    const response = await client.post<{ agent: Agent }>(`/agents/${agent.id}/stop`);

    spinner.stop();
    success(`Agent "${response.agent.name}" stopped`);
  } catch (err) {
    spinner.stop();
    error(err instanceof Error ? err.message : 'Failed to stop agent');
    process.exit(1);
  }
}
