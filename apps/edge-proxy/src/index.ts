export interface Env {}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    url.hostname = 'bridge-operations.pages.dev';

    const headers = new Headers(request.headers);
    headers.set('Host', 'bridge-operations.pages.dev');
    headers.set('X-Forwarded-Host', 'bridge.sayalabs.in');

    const proxyRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    return fetch(proxyRequest);
  },
};
