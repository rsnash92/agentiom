/**
 * Logout Command
 *
 * Clear stored credentials.
 */

import { clearToken, isLoggedIn } from '../lib/config';
import { success, warn } from '../lib/output';

export async function logout(): Promise<void> {
  if (!isLoggedIn()) {
    warn('Not currently logged in');
    return;
  }

  clearToken();
  success('Logged out');
}
