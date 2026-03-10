export interface HealthResponse {
  ok: true;
  timestamp: string;
}

export interface AppMetaResponse {
  name: string;
  version: string;
  authProvider: string;
  transactionSource: string;
  interfaceSource: string;
  persistence: string;
}

export function createHealthResponse(): HealthResponse {
  return {
    ok: true,
    timestamp: new Date().toISOString()
  };
}

export function createAppMetaResponse(payload: AppMetaResponse): AppMetaResponse {
  return payload;
}
