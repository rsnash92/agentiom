/**
 * Status Command
 *
 * Show agent status.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { getApiClient } from '../lib/api-client';
import { isLoggedIn } from '../lib/config';
import { error, info, keyValue, formatStatus, formatDate, header } from '../lib/output';

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  url: string | null;
  region: string;
  cpuKind: string;
  cpus: number;
  memoryMb: number;
  storageSizeGb: number;
  createdAt: string;
  updatedAt: string;
  lastDeployedAt: string | null;
}

async function getAgentName(nameArg?: string): Promise<string> {
  if (nameArg) {
    return nameArg;
  }

  // Try to read from agent.yaml
  const configPath = join(process.cwd(), 'agent.yaml');
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = YAML.parse(content) as { name?: string };
      if (config.name) {
        return config.name;
      }
    } catch {
      // Ignore parse errors
    }
  }

  throw new Error('Agent name required. Provide as argument or run from directory with agent.yaml');
}

async function findAgent(name: string): Promise<Agent> {
  const client = getApiClient();
  const response = await client.get<{ agents: Agent[] }>('/agents');
  const agent = response.agents.find((a) => a.name === name || a.id === name);

  if (!agent) {
    throw new Error(`Agent "${name}" not found`);
  }

  return agent;
}

export async function status(nameArg?: string): Promise<void> {
  if (!isLoggedIn()) {
    error('Not logged in');
    info('Run: agentiom login');
    process.exit(1);
  }

  try {
    const name = await getAgentName(nameArg);
    const agent = await findAgent(name);

    header('Agent Status');
    keyValue('Name', agent.name);
    keyValue('ID', agent.id);
    keyValue('Status', formatStatus(agent.status));
    keyValue('URL', agent.url);
    keyValue('Region', agent.region);
    keyValue('Description', agent.description);

    console.log();
    header('Resources');
    keyValue('CPU', `${agent.cpuKind} x${agent.cpus}`);
    keyValue('Memory', `${agent.memoryMb}MB`);
    keyValue('Storage', `${agent.storageSizeGb}GB`);

    console.log();
    header('Timestamps');
    keyValue('Created', formatDate(agent.createdAt));
    keyValue('Updated', formatDate(agent.updatedAt));
    keyValue('Last Deployed', formatDate(agent.lastDeployedAt));

    console.log();
  } catch (err) {
    error(err instanceof Error ? err.message : 'Failed to get status');
    process.exit(1);
  }
}

export { findAgent, getAgentName };
