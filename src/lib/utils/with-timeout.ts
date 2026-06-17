export class TimeoutError extends Error {
  timeoutMs: number;
  constructor(message = "Request timed out", timeoutMs: number) {
    super(message);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Request timed out"
): Promise<T> {
  let timeoutId: any;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage, timeoutMs));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeout,
  ]);
}

export const TIMEOUT_TIERS = {
  dbReadSimple: 8000,
  dbReadComplex: 15000,
  fileUploadBase: 60000, // progressive per MB
  aiAssist: 30000,
  edgeFunction: 20000,
  authOperation: 10000,
  realtimeSubscribe: 5000,
};
