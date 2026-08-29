import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { environment } from '../../config/environment';
import { clearSession, loadSession, saveSession } from '../storage/sessionStorage';
import { ApiError, type ApiErrorPayload, type ApiResponse } from '../types/api';
import type { TokenRefreshResponse } from '../types/domain';

type UnauthorizedHandler = () => void;

const client = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json', 'Accept-Language': 'zh-CN' },
});

let unauthorizedHandler: UnauthorizedHandler | undefined;
let refreshPromise: Promise<string | null> | null = null;

export function setUnauthorizedHandler(handler?: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

function timezoneHeaders(): Record<string, string> {
  const offset = -new Date().getTimezoneOffset();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    'X-Timezone-Offset': String(offset),
    ...(timeZone ? { 'X-Timezone-Name': timeZone } : {}),
  };
}

client.interceptors.request.use(async (config) => {
  const session = await loadSession();
  config.headers.set(timezoneHeaders());

  if (session?.token && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${session.token}`);
  }

  return config;
});

async function refreshToken(): Promise<string | null> {
  const currentSession = await loadSession();
  if (!currentSession?.token) {
    return null;
  }

  try {
    const response = await client.post<ApiResponse<TokenRefreshResponse>>(
      '/v1/tokens/refresh.json',
      {},
      { headers: { Authorization: `Bearer ${currentSession.token}`, 'X-Skip-Refresh': 'true' } },
    );
    const newToken = response.data.result?.newToken;

    if (!response.data.success || !newToken) {
      return null;
    }

    await saveSession({ token: newToken, user: response.data.result.user ?? currentSession.user });
    return newToken;
  } catch {
    return null;
  }
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const shouldRefresh = error.response?.status === 401
      && original
      && !original._retried
      && original.headers?.['X-Skip-Refresh'] !== 'true';

    if (shouldRefresh) {
      original._retried = true;
      refreshPromise ??= refreshToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;

      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return client.request(original);
      }

      await clearSession();
      unauthorizedHandler?.();
    }

    const payload = error.response?.data;
    throw new ApiError(
      payload?.errorMessage || error.message || '网络请求失败',
      error.response?.status,
      payload?.errorCode,
    );
  },
);

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  if (!environment.isConfigured) {
    throw new ApiError('尚未配置后端地址，请设置 EXPO_PUBLIC_EZBK_API_URL');
  }

  const response = await client.request<ApiResponse<T>>(config);

  if (!response.data.success) {
    throw new ApiError('服务器返回失败状态');
  }

  return response.data.result;
}
