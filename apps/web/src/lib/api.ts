import { BridgeApiClient } from '@bridge/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bridge_auth_token');
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('bridge_auth_token', token);
  } else {
    localStorage.removeItem('bridge_auth_token');
  }
}

export const apiClient = new BridgeApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => getStoredToken(),
});
