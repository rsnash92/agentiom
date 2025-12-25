/**
 * Deploy Command
 *
 * Deploy an agent to the cloud.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import ora from 'ora';
import { getApiClient } from '../lib/api-client';
import { isLoggedIn } from '../lib/config';
import { success, error, info, keyValue, formatStatus, header } from '../lib/output';

interface AgentConfig {
  name: string;
  description?: string;
  resources?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
  region?: string;
  env?: Record<string, string>;
}

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
  lastDeployedAt: string | null;
}

interface Deployment {
  id: string;
  status: string;
  completedAt: string | null;
}

function parseMemory(memory: string): number {
  const match = memory.match(/^(\d+)(mb|gb)?$/i);
  if (!match) return 256;
  const value = parseInt(match[1]!, 10);
  const unit = (match[2] ?? 'mb').toLowerCase();
  return unit === 'gb' ? value * 1024 : value;
}

function parseStorage(storage: string): number {
  const match = storage.match(/^(\d+)(gb)?$/i);
  if (!match) return 1;
  return parseInt(match[1]!, 10);
}

export async function deploy(): Promise<void> {
  // Check login
  if (!isLoggedIn()) {
    error('Not logged in');
    info('Run: agentiom login');
    process.exit(1);
  }

  // Read agent.yaml
  const configPath = join(process.cwd(), 'agent.yaml');

  if (!existsSync(configPath)) {
    error('agent.yaml not found in current directory');
    info('Run: agentiom init <name>');
    process.exit(1);
  }

  let config: AgentConfig;
  try {
    const content = readFileSync(configPath, 'utf-8');
    config = YAML.parse(content) as AgentConfig;
  } catch (err) {
    error(`Failed to parse agent.yaml: ${err instanceof Error ? err.message : 'Unknown error'}`);
    process.exit(1);
  }

  if (!config.name) {
    error('agent.yaml must have a "name" field');
    process.exit(1);
  }

  const client = getApiClient();
  const spinner = ora('Preparing deployment...').start();

  try {
    // Check if agent exists
    const agentsResponse = await client.get<{ agents: Agent[] }>('/agents');
    let agent = agentsResponse.agents.find((a) => a.name === config.name);

    if (!agent) {
      // Create agent
      spinner.text = 'Creating agent...';

      const createResponse = await client.post<{ agent: Agent }>('/agents', {
        name: config.name,
        description: config.description,
        config: {
          region: config.region ?? 'iad',
          cpuKind: config.resources?.cpu ?? 'shared',
          memoryMb: parseMemory(config.resources?.memory ?? '256mb'),
          storageSizeGb: parseStorage(config.resources?.storage ?? '1gb'),
          env: config.env,
        },
      });

      agent = createResponse.agent;
    }

    // Deploy
    spinner.text = 'Deploying agent...';

    const deployResponse = await client.post<{ agent: Agent; deployment: Deployment }>(
      `/agents/${agent.id}/deploy`
    );

    spinner.stop();

    // Output success
    console.log();
    success('Agent deployed successfully!');

    header('Agent Details');
    keyValue('Name', deployResponse.agent.name);
    keyValue('Status', formatStatus(deployResponse.agent.status));
    keyValue('URL', deployResponse.agent.url);
    keyValue('Region', deployResponse.agent.region);
    keyValue('Resources', `${deployResponse.agent.cpuKind} CPU, ${deployResponse.agent.memoryMb}MB RAM, ${deployResponse.agent.storageSizeGb}GB storage`);

    console.log();
  } catch (err) {
    spinner.stop();
    error(err instanceof Error ? err.message : 'Deployment failed');
    process.exit(1);
  }
}
