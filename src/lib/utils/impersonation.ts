/**
 * Impersonation helper utilities
 */

export function startImpersonation(targetUserId: string) {
  // Set cookie for 1 hour
  document.cookie = `impersonated_user_id=${targetUserId}; path=/; max-age=3600; SameSite=Lax`;
}

export function stopImpersonation() {
  // Clear cookie
  document.cookie = "impersonated_user_id=; path=/; max-age=0; SameSite=Lax";
}

export function getImpersonatedUserId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )impersonated_user_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
