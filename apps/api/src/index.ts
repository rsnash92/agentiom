import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { createLogger } from '@agentiom/logger';

const log = createLogger('api');
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.0.1',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Agentiom API',
    version: '0.0.1',
    docs: '/docs',
  });
});

log.info('API running on http://localhost:3000');

export default {
  port: 3000,
  fetch: app.fetch,
};
