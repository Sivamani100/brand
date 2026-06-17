export interface CursorData {
  id: string;
  createdAt: string;
}

export function encodeCursor(id: string, createdAt: string): string {
  const jsonStr = JSON.stringify({ id, createdAt });
  if (typeof window !== "undefined") {
    return btoa(jsonStr);
  }
  return Buffer.from(jsonStr).toString("base64");
}

export function decodeCursor(cursor: string | null): CursorData | null {
  if (!cursor) return null;
  try {
    const jsonStr = typeof window !== "undefined" 
      ? atob(cursor) 
      : Buffer.from(cursor, "base64").toString("utf-8");
    return JSON.parse(jsonStr) as CursorData;
  } catch (err) {
    console.error("Failed to decode cursor:", err);
    return null;
  }
}
