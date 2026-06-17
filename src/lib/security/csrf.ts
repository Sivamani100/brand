export function generateCsrfToken(): string {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Safe fallback for server-side evaluation/compilation
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = "csrf-token=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    const c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function setCsrfCookie() {
  if (typeof window === "undefined") return;
  let token = getCsrfTokenFromCookie();
  if (!token) {
    token = generateCsrfToken();
    document.cookie = `csrf-token=${token};path=/;SameSite=Strict;Secure`;
  }
}
