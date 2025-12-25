/**
 * Auth Service
 *
 * Handles authentication operations: password hashing, JWT, API tokens.
 */

import { sign, verify } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@agentiom/db';
import { users, apiTokens } from '@agentiom/db';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  type RegisterInput,
  type LoginInput,
  type CreateTokenInput,
} from '@agentiom/shared';
import { createLogger } from '@agentiom/logger';

const logger = createLogger('auth-service');

export type JWTPayload = {
  sub: string;
  email: string;
  type: 'session';
  exp: number;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiToken = {
  id: string;
  name: string;
  token: string;
  expiresAt: Date | null;
  createdAt: Date;
};

const JWT_EXPIRES_IN = 24 * 60 * 60; // 24 hours in seconds
const API_TOKEN_PREFIX = 'agentiom_';

export class AuthService {
  constructor(
    private db: DatabaseClient,
    private jwtSecret: string
  ) {}

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<{ user: User; token: string }> {
    logger.info({ email: input.email }, 'Registering new user');

    // Check if user already exists
    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .get();

    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password using Bun's built-in argon2
    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: 'argon2id',
      memoryCost: 65536,
      timeCost: 2,
    });

    // Create user
    const [user] = await this.db
      .insert(users)
      .values({
        email: input.email,
        name: input.name ?? null,
        passwordHash,
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create user');
    }

    // Generate session token
    const token = await this.createSessionToken(user);

    logger.info({ userId: user.id }, 'User registered successfully');

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<{ user: User; token: string }> {
    logger.info({ email: input.email }, 'User login attempt');

    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .get();

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await Bun.password.verify(input.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = await this.createSessionToken(user);

    logger.info({ userId: user.id }, 'User logged in successfully');

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Create a long-lived API token
   */
  async createApiToken(
    userId: string,
    input: CreateTokenInput
  ): Promise<ApiToken> {
    logger.info({ userId, tokenName: input.name }, 'Creating API token');

    // Generate random token
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const tokenValue = API_TOKEN_PREFIX + Buffer.from(randomBytes).toString('base64url');

    // Hash the token for storage
    const tokenHash = await this.hashToken(tokenValue);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

    // Store in database
    const [token] = await this.db
      .insert(apiTokens)
      .values({
        userId,
        name: input.name,
        tokenHash,
        expiresAt,
      })
      .returning();

    if (!token) {
      throw new Error('Failed to create API token');
    }

    logger.info({ userId, tokenId: token.id }, 'API token created');

    // Return the token (only time the plaintext is available)
    return {
      id: token.id,
      name: token.name,
      token: tokenValue,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    };
  }

  /**
   * Revoke an API token
   */
  async revokeApiToken(userId: string, tokenId: string): Promise<void> {
    logger.info({ userId, tokenId }, 'Revoking API token');

    const token = await this.db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.id, tokenId))
      .get();

    if (!token) {
      throw new NotFoundError('API token', tokenId);
    }

    if (token.userId !== userId) {
      throw new NotFoundError('API token', tokenId);
    }

    await this.db.delete(apiTokens).where(eq(apiTokens.id, tokenId));

    logger.info({ userId, tokenId }, 'API token revoked');
  }

  /**
   * List API tokens for a user (without the actual token values)
   */
  async listApiTokens(userId: string) {
    const tokens = await this.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        lastUsedAt: apiTokens.lastUsedAt,
        expiresAt: apiTokens.expiresAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.userId, userId));

    return tokens;
  }

  /**
   * Validate a Bearer token (JWT or API token)
   */
  async validateToken(token: string): Promise<User> {
    // Check if it's an API token
    if (token.startsWith(API_TOKEN_PREFIX)) {
      return this.validateApiToken(token);
    }

    // Otherwise, treat as JWT
    return this.validateJwt(token);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    return user ? this.sanitizeUser(user) : null;
  }

  private async validateJwt(token: string): Promise<User> {
    try {
      const payload = await verify(token, this.jwtSecret) as JWTPayload;

      if (payload.type !== 'session') {
        throw new UnauthorizedError('Invalid token type');
      }

      const user = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .get();

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  private async validateApiToken(token: string): Promise<User> {
    const tokenHash = await this.hashToken(token);

    const result = await this.db
      .select({
        token: apiTokens,
        user: users,
      })
      .from(apiTokens)
      .innerJoin(users, eq(apiTokens.userId, users.id))
      .where(eq(apiTokens.tokenHash, tokenHash))
      .get();

    if (!result) {
      throw new UnauthorizedError('Invalid API token');
    }

    // Check expiration
    if (result.token.expiresAt && result.token.expiresAt < new Date()) {
      throw new UnauthorizedError('API token has expired');
    }

    // Update lastUsedAt (fire and forget)
    this.db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, result.token.id))
      .run();

    return this.sanitizeUser(result.user);
  }

  private async createSessionToken(user: { id: string; email: string }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      type: 'session',
      exp: now + JWT_EXPIRES_IN,
    };

    return sign(payload, this.jwtSecret);
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hashBuffer).toString('hex');
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
