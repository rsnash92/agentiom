/**
 * Login Command
 *
 * Authenticate with Agentiom API and store credentials.
 */

import { createInterface } from 'node:readline';
import { hostname } from 'node:os';
import ora from 'ora';
import { getApiClient, resetApiClient } from '../lib/api-client';
import { saveToken, getApiUrl } from '../lib/config';
import { success, error, info } from '../lib/output';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  token: string;
}

interface TokenResponse {
  token: {
    id: string;
    name: string;
    token: string;
    expiresAt: string;
  };
}

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      // Hide input for password
      process.stdout.write(question);
      let input = '';

      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;

      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      stdin.resume();
      stdin.setEncoding('utf8');

      const onData = (char: string) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            stdin.removeListener('data', onData);
            if (stdin.isTTY) {
              stdin.setRawMode(wasRaw ?? false);
            }
            process.stdout.write('\n');
            rl.close();
            resolve(input);
            break;
          case '\u0003': // Ctrl+C
            process.exit(1);
            break;
          case '\u007F': // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1);
            }
            break;
          default:
            input += char;
            break;
        }
      };

      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

export async function login(): Promise<void> {
  info(`Logging in to ${getApiUrl()}`);
  console.log();

  // Get credentials
  const email = await prompt('Email: ');
  const password = await prompt('Password: ', true);

  if (!email || !password) {
    error('Email and password are required');
    process.exit(1);
  }

  const spinner = ora('Authenticating...').start();

  try {
    // Login to get session token
    const loginResponse = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      const data = await loginResponse.json() as { error?: { message?: string } };
      throw new Error(data.error?.message ?? 'Login failed');
    }

    const loginData = (await loginResponse.json()) as LoginResponse;

    spinner.text = 'Creating CLI token...';

    // Create a long-lived API token for CLI
    const tokenName = `cli-${hostname()}`;
    const tokenResponse = await fetch(`${getApiUrl()}/auth/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({ name: tokenName }),
    });

    if (!tokenResponse.ok) {
      const data = await tokenResponse.json() as { error?: { message?: string } };
      throw new Error(data.error?.message ?? 'Failed to create CLI token');
    }

    const tokenData = (await tokenResponse.json()) as TokenResponse;

    // Save the token
    saveToken(tokenData.token.token, loginData.user.email);

    // Reset API client to pick up new token
    resetApiClient();

    spinner.stop();
    console.log();
    success(`Logged in as ${loginData.user.email}`);
  } catch (err) {
    spinner.stop();
    error(err instanceof Error ? err.message : 'Login failed');
    process.exit(1);
  }
}
