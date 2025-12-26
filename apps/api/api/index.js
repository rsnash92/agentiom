// Vercel Edge Function handler for Hono
// Using .js to avoid Vercel's TypeScript type checking issues
import { handle } from 'hono/vercel';
import { app } from '../src/index.js';

export const config = {
  runtime: 'edge',
};

export default handle(app);
