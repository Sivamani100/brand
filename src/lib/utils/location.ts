/**
 * Converts a two-letter country code (ISO 3166-1 alpha-2) to a flag emoji.
 * Example: "IN" -> "🇮🇳", "US" -> "🇺🇸"
 */
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "📍";
  return code.toUpperCase().replace(/./g, (char) =>
    String.fromCodePoint(127397 + char.charCodeAt(0))
  );
}

/**
 * Pre-formats a display string for a location.
 */
export function formatLocationDisplay(city: string, state: string, country: string, countryCode: string): string {
  if (countryCode === "IN") {
    return `${city}, ${state}`;
  }
  return `${city}, ${country}`;
}
