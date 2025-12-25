/**
 * Destroy Command
 *
 * Destroy an agent and its infrastructure.
 */

import { createInterface } from 'node:readline';
import ora from 'ora';
import pc from 'picocolors';
import { getApiClient } from '../lib/api-client';
import { isLoggedIn } from '../lib/config';
import { success, error, info, warn } from '../lib/output';
import { findAgent, getAgentName } from './status';

async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function destroy(nameArg?: string, options?: { force?: boolean }): Promise<void> {
  if (!isLoggedIn()) {
    error('Not logged in');
    info('Run: agentiom login');
    process.exit(1);
  }

  try {
    const name = await getAgentName(nameArg);
    const agent = await findAgent(name);

    // Confirm destruction unless --force
    if (!options?.force) {
      console.log();
      warn(`You are about to destroy agent "${agent.name}"`);
      warn('This will delete all data and cannot be undone!');
      console.log();

      const confirmation = await prompt(`Type ${pc.bold(agent.name)} to confirm: `);

      if (confirmation !== agent.name) {
        error('Destruction cancelled');
        process.exit(1);
      }
    }

    const spinner = ora('Destroying agent...').start();

    const client = getApiClient();
    await client.delete(`/agents/${agent.id}`);

    spinner.stop();
    success(`Agent "${agent.name}" destroyed`);
  } catch (err) {
    error(err instanceof Error ? err.message : 'Failed to destroy agent');
    process.exit(1);
  }
}
