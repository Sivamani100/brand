import { TimeoutError } from "./with-timeout";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    retryOn,
    onRetry,
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = retryOn ? retryOn(error) : isTransientError(error);
      
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        baseDelayMs * 2 ** (attempt - 1) + Math.random() * 100,
        maxDelayMs
      );
      
      onRetry?.(attempt, delay, error);
      await sleep(delay);
    }
  }
  
  throw new Error("Unreachable retry state");
}

function isTransientError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  
  const msg = (error as any)?.message || "";
  if (error instanceof TypeError && msg.includes("fetch")) return true;
  
  const status = (error as any)?.status;
  if (status >= 500) return true;
  
  const code = (error as any)?.code;
  if (code === "NETWORK_ERROR" || code === "NETWORK_OFFLINE") return true;
  
  return false;
}
