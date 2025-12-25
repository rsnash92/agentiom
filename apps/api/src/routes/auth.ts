/**
 * Auth Routes
 *
 * Handles user authentication and API token management.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  registerSchema,
  loginSchema,
  createTokenSchema,
} from '@agentiom/shared';
import type { AuthService } from '../services/auth.service';
import { createAuthMiddleware } from '../middleware/auth';

export function createAuthRoutes(authService: AuthService) {
  const app = new Hono();
  const requireAuth = createAuthMiddleware(authService);

  /**
   * POST /auth/register
   * Create a new user account
   */
  app.post('/register', zValidator('json', registerSchema), async (c) => {
    const data = c.req.valid('json');
    const result = await authService.register(data);
    return c.json(result, 201);
  });

  /**
   * POST /auth/login
   * Login with email and password
   */
  app.post('/login', zValidator('json', loginSchema), async (c) => {
    const data = c.req.valid('json');
    const result = await authService.login(data);
    return c.json(result);
  });

  /**
   * GET /auth/me
   * Get current user info
   */
  app.get('/me', requireAuth, async (c) => {
    const user = c.get('user');
    return c.json({ user });
  });

  /**
   * POST /auth/tokens
   * Create a new API token
   */
  app.post('/tokens', requireAuth, zValidator('json', createTokenSchema), async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const token = await authService.createApiToken(user.id, data);
    return c.json({ token }, 201);
  });

  /**
   * GET /auth/tokens
   * List all API tokens for current user
   */
  app.get('/tokens', requireAuth, async (c) => {
    const user = c.get('user');
    const tokens = await authService.listApiTokens(user.id);
    return c.json({ tokens });
  });

  /**
   * DELETE /auth/tokens/:tokenId
   * Revoke an API token
   */
  app.delete('/tokens/:tokenId', requireAuth, async (c) => {
    const user = c.get('user');
    const tokenId = c.req.param('tokenId');
    await authService.revokeApiToken(user.id, tokenId);
    return c.json({ success: true });
  });

  return app;
}
