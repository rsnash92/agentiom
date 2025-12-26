/**
 * Config Management
 *
 * Handles reading/writing credentials and config from ~/.agentiom/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.agentiom');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials');
const CONFIG_FILE = join(CONFIG_DIR, 'config');

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load API token from credentials file
 */
export function loadToken(): string | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const content = readFileSync(CREDENTIALS_FILE, 'utf-8').trim();
    const data = JSON.parse(content);
    return data.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Save API token to credentials file
 */
export function saveToken(token: string, email?: string): void {
  ensureConfigDir();
  const data = { token, email, savedAt: new Date().toISOString() };
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  // Ensure restrictive permissions
  chmodSync(CREDENTIALS_FILE, 0o600);
}

/**
 * Clear credentials (logout)
 */
export function clearToken(): void {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get stored email
 */
export function getStoredEmail(): string | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const content = readFileSync(CREDENTIALS_FILE, 'utf-8').trim();
    const data = JSON.parse(content);
    return data.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return loadToken() !== null;
}

/**
 * Get API URL from environment or default
 */
export function getApiUrl(): string {
  return process.env.AGENTIOM_API_URL ?? 'https://agentiom-api.fly.dev';
}
