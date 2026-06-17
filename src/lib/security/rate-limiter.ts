import { createClient } from "@/lib/supabase/server";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // timestamp in ms
  retryAfter: number; // seconds to wait
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      // Clean trailing slashes if any
      const url = upstashUrl.replace(/\/$/, "");
      const res = await fetch(`${url}/multi`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["TTL", key],
        ]),
        // Prevents rate limiting hanging
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(1500) : undefined,
      });

      if (res.ok) {
        const [[incrRes], [ttlRes]] = await res.json();
        const count = parseInt(incrRes.result || "0", 10);
        let ttl = parseInt(ttlRes.result || "-1", 10);

        if (count === 1 && ttl === -1) {
          // Set expiry on first hit
          await fetch(`${url}/EXPIRE`, {
            method: "POST",
            headers: { Authorization: `Bearer ${upstashToken}` },
            body: JSON.stringify([key, windowSeconds]),
          });
          ttl = windowSeconds;
        }

        const remaining = Math.max(0, limit - count);
        const retryAfter = count > limit ? ttl : 0;
        const reset = Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000;

        return {
          success: count <= limit,
          limit,
          remaining,
          reset,
          retryAfter,
        };
      }
    } catch (err) {
      console.error("Upstash Redis Rate limiter failed, falling back to DB:", err);
    }
  }

  // Fallback to PostgreSQL
  try {
    const supabase = await createClient();
    
    // Call DB check function via raw RPC call (execute_sql fallback helper or standard rpc client)
    // We can call RPC function since it is exposed on public schema
    const { data, error } = await (supabase as any).rpc("check_db_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window: `${windowSeconds} seconds`,
    });

    if (error) throw error;
    
    const result = data as unknown as {
      success: boolean;
      hits: number;
      reset_at: string;
      retry_after: number;
    }[];

    if (result && result.length > 0) {
      const row = result[0];
      const resetTime = new Date(row.reset_at).getTime();
      return {
        success: row.success,
        limit,
        remaining: Math.max(0, limit - row.hits),
        reset: resetTime,
        retryAfter: row.retry_after,
      };
    }
  } catch (err) {
    console.error("Postgres Rate limiter fallback failed:", err);
  }

  // Soft fallback: Allow request if rate limiters fail to prevent locking users out
  return {
    success: true,
    limit,
    remaining: 1,
    reset: Date.now() + windowSeconds * 1000,
    retryAfter: 0,
  };
}
