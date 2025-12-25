/**
 * Auth Middleware
 *
 * Validates Bearer tokens and attaches user to context.
 */

import type { Context, Next } from 'hono';
import { UnauthorizedError } from '@agentiom/shared';
import type { AuthService, User } from '../services/auth.service';

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
  }
}

/**
 * Create auth middleware that validates Bearer tokens
 */
export function createAuthMiddleware(authService: AuthService) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      throw new UnauthorizedError('Missing Authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid Authorization header format');
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new UnauthorizedError('Missing token');
    }

    const user = await authService.validateToken(token);
    c.set('user', user);

    await next();
  };
}

/**
 * Optional auth middleware - attaches user if token is present, but doesn't require it
 */
export function createOptionalAuthMiddleware(authService: AuthService) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token) {
        try {
          const user = await authService.validateToken(token);
          c.set('user', user);
        } catch {
          // Ignore auth errors for optional auth
        }
      }
    }

    await next();
  };
}
