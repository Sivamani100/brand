import { createClient } from "./client";
import { mapError, AppError } from "@/lib/errors/types";

const supabase = createClient();

export const triggerSessionExpiredModal = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("brand:session-expired"));
  }
};

export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any | null }>
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      const appErr = mapError(error);
      if (appErr.code === "SESSION_EXPIRED") {
        // Attempt silent refresh
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          triggerSessionExpiredModal();
          return { data: null, error: appErr };
        }
        // Retry original query once after refresh
        const retryResult = await queryFn();
        return {
          data: retryResult.data,
          error: retryResult.error ? mapError(retryResult.error) : null,
        };
      }
      return { data: null, error: appErr };
    }

    return { data, error: null };
  } catch (e) {
    const appErr = mapError(e);
    if (appErr.code === "SESSION_EXPIRED") {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        triggerSessionExpiredModal();
        return { data: null, error: appErr };
      }
      try {
        const retryResult = await queryFn();
        return {
          data: retryResult.data,
          error: retryResult.error ? mapError(retryResult.error) : null,
        };
      } catch (retryErr) {
        return { data: null, error: mapError(retryErr) };
      }
    }
    return { data: null, error: appErr };
  }
}
