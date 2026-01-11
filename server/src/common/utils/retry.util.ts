/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides retry logic for transient failures with exponential backoff.
 * Supports configurable retry attempts, delays, and error filtering.
 */

import { Logger } from '@nestjs/common';
import { GmailErrorType, classifyGmailError, isRetryableError } from './gmail-error.util';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // in milliseconds
  maxDelay?: number; // in milliseconds
  backoffMultiplier?: number;
  retryableErrors?: GmailErrorType[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 8000, // 8 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    GmailErrorType.AUTH_ERROR, // Can retry after token refresh
    GmailErrorType.RATE_LIMIT_ERROR,
    GmailErrorType.NETWORK_ERROR,
  ],
  onRetry: () => {},
};

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  logger?: Logger,
): Promise<T> {
  const opts: Required<RetryOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    onRetry: options.onRetry || DEFAULT_OPTIONS.onRetry,
  };

  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(error)) {
        if (logger) {
          logger.debug(`Error is not retryable, stopping: ${err.message}`);
        }
        throw error;
      }

      // Check if error type is in retryable list
      const classified = classifyGmailError(error);
      if (!opts.retryableErrors.includes(classified.type)) {
        if (logger) {
          logger.debug(`Error type ${classified.type} is not in retryable list, stopping: ${err.message}`);
        }
        throw error;
      }

      // Don't retry on last attempt
      if (attempt >= opts.maxAttempts) {
        if (logger) {
          logger.warn(`Max retry attempts (${opts.maxAttempts}) reached, giving up: ${err.message}`);
        }
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      if (logger) {
        logger.debug(
          `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms delay. Error: ${err.message}`,
        );
      }

      opts.onRetry(attempt, err);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry decorator for class methods
 */
export function Retryable(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = (this as any).logger as Logger | undefined;
      return retryWithBackoff(() => originalMethod.apply(this, args), options, logger);
    };

    return descriptor;
  };
}

