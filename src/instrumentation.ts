/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 * Used to initialize agent schedulers for active agents
 */

export async function register() {
  // Only run on server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeAllSchedulers } = await import('@/lib/agent/scheduler');

    console.log('🤖 Initializing agent schedulers...');
    await initializeAllSchedulers();
  }
}
