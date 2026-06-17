import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const details = {
    database: "unknown",
    storage: "unknown",
    timestamp: new Date().toISOString(),
  };

  try {
    const supabase = (await createClient()) as any;

    // 1. Check database connectivity (lightweight select)
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();
    const dbLatency = Date.now() - dbStart;
    
    if (dbError) {
      details.database = `error: ${dbError.message}`;
    } else {
      details.database = `healthy (${dbLatency}ms)`;
    }

    // 2. Check storage container checks
    const storageStart = Date.now();
    const { error: storageError } = await supabase.storage.listBuckets();
    const storageLatency = Date.now() - storageStart;

    if (storageError) {
      details.storage = `error: ${storageError.message}`;
    } else {
      details.storage = `healthy (${storageLatency}ms)`;
    }

    // Determine overall health status
    const isDegraded = dbError || storageError;
    const status = isDegraded ? "degraded" : "healthy";
    const statusCode = isDegraded ? 503 : 200;

    return NextResponse.json(
      {
        status,
        ...details,
      },
      {
        status: statusCode,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "degraded",
        error: err.message || String(err),
        ...details,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
