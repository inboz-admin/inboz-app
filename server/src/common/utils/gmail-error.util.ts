/**
 * Gmail API Error Classification Utility
 * 
 * Classifies Gmail API errors into categories for appropriate handling:
 * - AUTH_ERROR: Invalid/expired token (needs refresh)
 * - SCOPE_ERROR: Insufficient permissions (needs re-auth)
 * - RATE_LIMIT_ERROR: Rate limited (retry with backoff)
 * - NETWORK_ERROR: Transient network issues (retry)
 * - PERMANENT_ERROR: Unrecoverable (skip account)
 */

export enum GmailErrorType {
  AUTH_ERROR = 'AUTH_ERROR',
  REFRESH_TOKEN_ERROR = 'REFRESH_TOKEN_ERROR', // Refresh token itself is invalid/expired
  SCOPE_ERROR = 'SCOPE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMANENT_ERROR = 'PERMANENT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ClassifiedError {
  type: GmailErrorType;
  message: string;
  retryable: boolean;
  originalError: Error;
}

/**
 * Classify a Gmail API error
 */
export function classifyGmailError(error: Error | unknown): ClassifiedError {
  const err = error instanceof Error ? error : new Error(String(error));
  const errorMessage = err.message.toLowerCase();
  const errorStack = err.stack?.toLowerCase() || '';

  // REFRESH_TOKEN_ERROR: Refresh token is invalid/expired/revoked (needs re-auth, don't retry)
  if (
    errorMessage.includes('invalid_grant') ||
    errorMessage.includes('invalid refresh token') ||
    errorMessage.includes('refresh token expired') ||
    errorMessage.includes('refresh token revoked') ||
    errorMessage.includes('token has been expired or revoked') ||
    errorMessage.includes('invalid_request') && errorMessage.includes('refresh')
  ) {
    return {
      type: GmailErrorType.REFRESH_TOKEN_ERROR,
      message: err.message,
      retryable: false, // Cannot retry - user must re-authenticate
      originalError: err,
    };
  }

  // AUTH_ERROR: Invalid/expired access token (can try refresh)
  if (
    errorMessage.includes('invalid authentication credentials') ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('token expired') ||
    errorMessage.includes('access token') ||
    errorMessage.includes('authentication credential') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('401')
  ) {
    return {
      type: GmailErrorType.AUTH_ERROR,
      message: err.message,
      retryable: true, // Can retry after token refresh
      originalError: err,
    };
  }

  // SCOPE_ERROR: Insufficient permissions
  if (
    errorMessage.includes('metadata scope') ||
    errorMessage.includes('insufficient permission') ||
    errorMessage.includes('permission denied') ||
    errorMessage.includes('scope') ||
    errorMessage.includes('format full') ||
    errorMessage.includes('403') ||
    errorMessage.includes('forbidden')
  ) {
    return {
      type: GmailErrorType.SCOPE_ERROR,
      message: err.message,
      retryable: false, // Needs user re-authentication
      originalError: err,
    };
  }

  // RATE_LIMIT_ERROR: Rate limited
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('quota exceeded') ||
    errorMessage.includes('user rate limit') ||
    errorMessage.includes('429') ||
    errorMessage.includes('too many requests')
  ) {
    return {
      type: GmailErrorType.RATE_LIMIT_ERROR,
      message: err.message,
      retryable: true, // Can retry with backoff
      originalError: err,
    };
  }

  // NETWORK_ERROR: Transient network issues
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('eai_again') ||
    errorMessage.includes('socket') ||
    errorStack.includes('socket') ||
    errorStack.includes('network')
  ) {
    return {
      type: GmailErrorType.NETWORK_ERROR,
      message: err.message,
      retryable: true, // Can retry
      originalError: err,
    };
  }

  // PERMANENT_ERROR: Unrecoverable errors
  if (
    errorMessage.includes('not found') ||
    errorMessage.includes('404') ||
    errorMessage.includes('invalid argument') ||
    errorMessage.includes('bad request') ||
    errorMessage.includes('400') ||
    errorMessage.includes('500') ||
    errorMessage.includes('internal server error')
  ) {
    return {
      type: GmailErrorType.PERMANENT_ERROR,
      message: err.message,
      retryable: false, // Don't retry
      originalError: err,
    };
  }

  // UNKNOWN_ERROR: Default fallback
  return {
    type: GmailErrorType.UNKNOWN_ERROR,
    message: err.message,
    retryable: false, // Don't retry unknown errors by default
    originalError: err,
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error | unknown): boolean {
  const classified = classifyGmailError(error);
  return classified.retryable;
}

/**
 * Check if an error requires token refresh
 */
export function requiresTokenRefresh(error: Error | unknown): boolean {
  const classified = classifyGmailError(error);
  return classified.type === GmailErrorType.AUTH_ERROR;
}

/**
 * Check if an error requires user re-authentication
 */
export function requiresReAuth(error: Error | unknown): boolean {
  const classified = classifyGmailError(error);
  return classified.type === GmailErrorType.SCOPE_ERROR || 
         classified.type === GmailErrorType.REFRESH_TOKEN_ERROR;
}

/**
 * Check if an error indicates refresh token failure (user must re-authenticate)
 */
export function isRefreshTokenError(error: Error | unknown): boolean {
  const classified = classifyGmailError(error);
  return classified.type === GmailErrorType.REFRESH_TOKEN_ERROR;
}

