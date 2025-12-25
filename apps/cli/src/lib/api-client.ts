/**
 * API Client
 *
 * HTTP client for communicating with the Agentiom API.
 */

import { loadToken, getApiUrl } from './config';
import { error } from './output';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = getApiUrl();
    this.token = loadToken();
  }

  /**
   * Reload token (after login)
   */
  reloadToken(): void {
    this.token = loadToken();
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * GET request
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Stream SSE events
   */
  async *stream(path: string): AsyncIterable<string> {
    const response = await this.rawRequest('GET', path);

    if (!response.ok) {
      await this.handleError(response);
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            yield line.slice(6);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.rawRequest(method, path, body);

    if (!response.ok) {
      await this.handleError(response);
    }

    return response.json() as Promise<T>;
  }

  private async rawRequest(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseUrl}${path}`;

    return fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async handleError(response: Response): Promise<never> {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const data = (await response.json()) as ApiError;
      if (data.error?.message) {
        errorMessage = data.error.message;
      }
    } catch {
      // Use default message
    }

    if (response.status === 401) {
      error(`Authentication failed: ${errorMessage}`);
      error('Please run: agentiom login');
      process.exit(1);
    }

    throw new Error(errorMessage);
  }
}

// Singleton instance
let client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!client) {
    client = new ApiClient();
  }
  return client;
}

export function resetApiClient(): void {
  client = null;
}
