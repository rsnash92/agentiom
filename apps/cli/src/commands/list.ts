/**
 * List Command
 *
 * List all agents.
 */

import { getApiClient } from '../lib/api-client';
import { isLoggedIn } from '../lib/config';
import { error, info, table, formatStatus, formatDate } from '../lib/output';

interface Agent {
  id: string;
  name: string;
  status: string;
  url: string | null;
  region: string;
  lastDeployedAt: string | null;
}

export async function list(): Promise<void> {
  if (!isLoggedIn()) {
    error('Not logged in');
    info('Run: agentiom login');
    process.exit(1);
  }

  try {
    const client = getApiClient();
    const response = await client.get<{ agents: Agent[] }>('/agents');

    if (response.agents.length === 0) {
      info('No agents found');
      console.log();
      info('Create one with: agentiom init <name>');
      return;
    }

    console.log();
    table(
      ['NAME', 'STATUS', 'URL', 'REGION', 'LAST DEPLOYED'],
      response.agents.map((agent) => [
        agent.name,
        formatStatus(agent.status),
        agent.url ?? '—',
        agent.region,
        formatDate(agent.lastDeployedAt),
      ])
    );
    console.log();
  } catch (err) {
    error(err instanceof Error ? err.message : 'Failed to list agents');
    process.exit(1);
  }
}
