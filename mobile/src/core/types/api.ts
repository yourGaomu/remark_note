export interface ApiResponse<T> {
  success: boolean;
  result: T;
}

export interface ApiErrorPayload {
  success?: boolean;
  errorCode?: number;
  errorMessage?: string;
  path?: string;
}

export class ApiError extends Error {
  public readonly status?: number;
  public readonly code?: number;

  public constructor(message: string, status?: number, code?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
