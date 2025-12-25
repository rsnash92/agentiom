/**
 * Auth Validation Schemas
 *
 * Zod schemas for authentication-related requests.
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(100, 'Token name is too long'),
  expiresInDays: z
    .number()
    .int()
    .min(1, 'Expiration must be at least 1 day')
    .max(365, 'Expiration must be at most 365 days')
    .optional()
    .default(365),
});

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
