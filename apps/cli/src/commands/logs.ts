/**
 * Logs Command
 *
 * Stream agent logs.
 */

import pc from 'picocolors';
import { getApiClient } from '../lib/api-client';
import { isLoggedIn } from '../lib/config';
import { error, info } from '../lib/output';
import { findAgent, getAgentName } from './status';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

function formatLogLevel(level: string): string {
  switch (level.toLowerCase()) {
    case 'error':
    case 'err':
      return pc.red(`[${level.toUpperCase()}]`);
    case 'warn':
    case 'warning':
      return pc.yellow(`[${level.toUpperCase()}]`);
    case 'info':
      return pc.blue(`[${level.toUpperCase()}]`);
    case 'debug':
      return pc.gray(`[${level.toUpperCase()}]`);
    default:
      return `[${level.toUpperCase()}]`;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return pc.gray(date.toISOString().replace('T', ' ').replace('Z', ''));
}

function formatLogEntry(entry: LogEntry): string {
  return `${formatTimestamp(entry.timestamp)} ${formatLogLevel(entry.level)} ${entry.message}`;
}

export async function logs(
  nameArg?: string,
  options?: { follow?: boolean }
): Promise<void> {
  if (!isLoggedIn()) {
    error('Not logged in');
    info('Run: agentiom login');
    process.exit(1);
  }

  try {
    const name = await getAgentName(nameArg);
    const agent = await findAgent(name);

    const client = getApiClient();

    if (options?.follow) {
      // Stream logs via SSE
      info(`Streaming logs for ${agent.name}... (Ctrl+C to stop)`);
      console.log();

      try {
        for await (const data of client.stream(`/agents/${agent.id}/logs?follow=true`)) {
          try {
            const entry = JSON.parse(data) as LogEntry;
            console.log(formatLogEntry(entry));
          } catch {
            // If not JSON, print raw
            console.log(data);
          }
        }
      } catch (err) {
        // Stream ended or error
        if (err instanceof Error && err.message !== 'Stream ended') {
          throw err;
        }
      }
    } else {
      // Get all logs
      const response = await client.get<{ logs: LogEntry[] }>(`/agents/${agent.id}/logs`);

      if (response.logs.length === 0) {
        info('No logs available');
        return;
      }

      for (const entry of response.logs) {
        console.log(formatLogEntry(entry));
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : 'Failed to get logs');
    process.exit(1);
  }
}
