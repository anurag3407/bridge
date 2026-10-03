import {
  BridgeSummary,
  BridgeDetail,
  BridgePublicStatus,
  BridgeHistoryItem,
  SubmitReportRequest,
  CreateBridgeRequest,
  UpdateBridgeRequest,
  UserProfile,
  AuditEvent,
  ApiError,
} from '@bridge/contracts';

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly apiError: ApiError['error']
  ) {
    super(apiError.message);
    this.name = 'ApiClientError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null> | string | null;
}

export class BridgeApiClient {
  private baseUrl: string;
  private getToken?: () => Promise<string | null> | string | null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = {
          error: {
            code: 'HTTP_ERROR',
            message: response.statusText || `HTTP ${response.status}`,
            requestId: response.headers.get('x-request-id') || 'unknown',
          },
        };
      }
      throw new ApiClientError(response.status, errorBody.error);
    }

    return response.json() as Promise<T>;
  }

  // Public Endpoints
  async getBridges(): Promise<BridgeSummary[]> {
    return this.fetch<BridgeSummary[]>('/api/v1/bridges');
  }

  async getBridgeBySlug(slug: string): Promise<BridgeDetail> {
    return this.fetch<BridgeDetail>(`/api/v1/bridges/${encodeURIComponent(slug)}`);
  }

  async getBridgeStatus(bridgeId: string): Promise<BridgePublicStatus> {
    return this.fetch<BridgePublicStatus>(`/api/v1/bridges/${encodeURIComponent(bridgeId)}/status`, {
      cache: 'no-store',
    });
  }

  // Authenticated Operator Endpoints
  async getMe(): Promise<UserProfile> {
    return this.fetch<UserProfile>('/api/v1/me');
  }

  async getMyBridges(): Promise<BridgeSummary[]> {
    return this.fetch<BridgeSummary[]>('/api/v1/me/bridges');
  }

  async getBridgeHistory(bridgeId: string, beforeRevision?: string): Promise<BridgeHistoryItem[]> {
    const query = beforeRevision ? `?before=${beforeRevision}` : '';
    return this.fetch<BridgeHistoryItem[]>(
      `/api/v1/bridges/${encodeURIComponent(bridgeId)}/history${query}`
    );
  }

  async submitReport(
    bridgeId: string,
    report: SubmitReportRequest,
    idempotencyKey?: string
  ): Promise<BridgePublicStatus> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return this.fetch<BridgePublicStatus>(
      `/api/v1/bridges/${encodeURIComponent(bridgeId)}/reports`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(report),
      }
    );
  }

  // Admin Endpoints
  async createBridge(data: CreateBridgeRequest): Promise<{ id: string }> {
    return this.fetch<{ id: string }>('/api/v1/admin/bridges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBridge(bridgeId: string, data: UpdateBridgeRequest): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/api/v1/admin/bridges/${encodeURIComponent(bridgeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listUsers(): Promise<UserProfile[]> {
    return this.fetch<UserProfile[]>('/api/v1/admin/users');
  }

  async assignOperator(bridgeId: string, userId: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>('/api/v1/admin/assignments', {
      method: 'POST',
      body: JSON.stringify({ bridgeId, userId }),
    });
  }

  async revokeOperator(bridgeId: string, userId: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>('/api/v1/admin/assignments', {
      method: 'DELETE',
      body: JSON.stringify({ bridgeId, userId }),
    });
  }

  async getAuditLogs(): Promise<AuditEvent[]> {
    return this.fetch<AuditEvent[]>('/api/v1/admin/audit');
  }
}
