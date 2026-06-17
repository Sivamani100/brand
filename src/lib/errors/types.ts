export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export type ErrorCode =
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'ACCOUNT_SUSPENDED'
  | 'EMAIL_NOT_VERIFIED'
  | 'NETWORK_OFFLINE'
  | 'REQUEST_TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'PARSE_ERROR'
  | 'CARD_LIMIT_REACHED'
  | 'APPLICATION_EXISTS'
  | 'ROOM_CLOSED'
  | 'INVITE_EXPIRED'
  | 'UNKNOWN';

export class AppError extends Error {
  code: ErrorCode;
  technicalDetail?: string;
  severity: ErrorSeverity;
  retryable: boolean;
  retryAfter?: number;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      technicalDetail?: string;
      severity?: ErrorSeverity;
      retryable?: boolean;
      retryAfter?: number;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.technicalDetail = options?.technicalDetail;
    this.severity = options?.severity || 'error';
    this.retryable = options?.retryable ?? false;
    this.retryAfter = options?.retryAfter;
  }
}

export function mapError(error: any): AppError {
  if (error instanceof AppError) return error;

  const msg = error?.message || error?.toString() || 'An unknown error occurred';
  const code = error?.code || '';

  // Supabase/Postgrest Error Code mapping
  if (code === 'PGRST301' || msg.includes('JWT expired') || msg.includes('session_expired')) {
    return new AppError('SESSION_EXPIRED', 'Your session has expired.', { severity: 'fatal' });
  }
  if (code === '42501' || msg.includes('permission denied') || error?.status === 403) {
    return new AppError('FORBIDDEN', 'You do not have permission to perform this action.', { severity: 'warning' });
  }
  if (error?.status === 401 || msg.includes('unauthorized')) {
    return new AppError('UNAUTHORIZED', 'You must be signed in to perform this action.');
  }
  if (error?.status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    const retryAfter = error?.headers?.get?.('retry-after') ? parseInt(error.headers.get('retry-after'), 10) : 60;
    return new AppError('RATE_LIMITED', 'Too many requests. Please slow down.', {
      severity: 'warning',
      retryable: true,
      retryAfter,
    });
  }
  if (msg.includes('timeout') || msg.includes('abort') || code === 'REQUEST_TIMEOUT') {
    return new AppError('REQUEST_TIMEOUT', 'The request timed out. Please check your connection and try again.', {
      severity: 'error',
      retryable: true,
    });
  }
  if (msg.includes('offline') || msg.includes('TypeError: fetch') || code === 'NETWORK_ERROR') {
    return new AppError('NETWORK_OFFLINE', 'No internet connection detected. Please reconnect and retry.', {
      severity: 'error',
      retryable: true,
    });
  }

  // Business logic error checks
  if (msg.includes('card limit reached') || code === 'CARD_LIMIT_REACHED') {
    return new AppError('CARD_LIMIT_REACHED', 'Daily card limit reached.');
  }
  if (msg.includes('application already exists') || code === 'APPLICATION_EXISTS') {
    return new AppError('APPLICATION_EXISTS', 'You have already applied to this card.');
  }

  return new AppError('UNKNOWN', msg, { technicalDetail: error?.stack || JSON.stringify(error) });
}
