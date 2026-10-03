import { describe, it, expect, vi } from 'vitest';
import { BridgeApiClient, ApiClientError } from '../src';

describe('Bridge API Client', () => {
  it('instantiates client and includes bearer auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '123', displayName: 'Alice' }),
    });
    global.fetch = mockFetch;

    const client = new BridgeApiClient({
      baseUrl: 'http://localhost:4000',
      getToken: () => 'my-token',
    });

    const user = await client.getMe();
    expect(user.displayName).toBe('Alice');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/me',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });

  it('throws ApiClientError when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      json: async () => ({
        error: { code: 'NOT_FOUND', message: 'Bridge not found', requestId: 'req-1' },
      }),
    });

    const client = new BridgeApiClient({ baseUrl: 'http://localhost:4000' });
    await expect(client.getBridgeBySlug('missing')).rejects.toThrow(ApiClientError);
  });
});
