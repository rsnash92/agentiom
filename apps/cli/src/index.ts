#!/usr/bin/env node
/**
 * Agentiom CLI
 *
 * Deploy and manage stateful AI agents.
 */

import { Command } from 'commander';
import {
  login,
  logout,
  init,
  deploy,
  status,
  list,
  start,
  stop,
  destroy,
  logs,
} from './commands';

const program = new Command();

program
  .name('agentiom')
  .description('Deploy and manage stateful AI agents')
  .version('0.0.1');

// Auth commands
program
  .command('login')
  .description('Authenticate with Agentiom')
  .action(login);

program
  .command('logout')
  .description('Clear stored credentials')
  .action(logout);

// Project commands
program
  .command('init <name>')
  .description('Create a new agent project')
  .action(init);

program
  .command('deploy')
  .description('Deploy agent from current directory')
  .action(deploy);

// Agent commands
program
  .command('status [name]')
  .description('Show agent status')
  .action(status);

program
  .command('list')
  .alias('ls')
  .description('List all agents')
  .action(list);

program
  .command('start [name]')
  .description('Start a stopped agent')
  .action(start);

program
  .command('stop [name]')
  .description('Stop a running agent')
  .action(stop);

program
  .command('destroy [name]')
  .description('Destroy an agent and its infrastructure')
  .option('-f, --force', 'Skip confirmation prompt')
  .action((name, options) => destroy(name, options));

program
  .command('logs [name]')
  .description('View agent logs')
  .option('-f, --follow', 'Follow log output')
  .action((name, options) => logs(name, options));

// Parse and run
program.parse();
