import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

/**
 * API Key Management Routes
 * GET  /api/keys — List user's API keys (prefix only)
 * POST /api/keys — Create a new API key
 * DELETE /api/keys — Revoke an API key
 *
 * NOTE: api_keys and audit_logs tables are created by migration 20260619_extension4_schema.sql.
 * The generated types (database.types.ts) won't include these until supabase gen types is re-run.
 * We use `any` casts on new-table queries until then.
 */

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateApiKey(env: string, role: string): string {
  const random = crypto.randomBytes(16).toString("hex");
  return `il_${env}_${role}_${random}`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at, rate_limit_per_minute")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ keys: data || [] });
  } catch (err) {
    console.error("API keys GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, scopes, expires_at } = body;

    if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "Name and at least one scope are required." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Check key limit (max 10 per user)
    const { count } = await db
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if ((count || 0) >= 10) {
      return NextResponse.json(
        { error: "Maximum of 10 active API keys allowed. Revoke an existing key first." },
        { status: 400 }
      );
    }

    // Generate the key
    const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
    const rawKey = generateApiKey(env, profile.role);
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = hashKey(rawKey);

    const { data: insertedKey, error } = await db
      .from("api_keys")
      .insert({
        user_id: user.id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
        expires_at: expires_at || null,
      })
      .select("id, name, key_prefix, scopes, expires_at, created_at")
      .single();

    if (error) throw error;

    // Audit log
    await db.from("audit_logs").insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: "api_key.created",
      target_type: "api_key",
      target_id: insertedKey.id,
      metadata: { name, scopes },
    });

    // Return the raw key ONE TIME (will never be shown again)
    return NextResponse.json({
      key: insertedKey,
      rawKey,
      message: "Copy this key now. You won't be able to see it again.",
    });
  } catch (err) {
    console.error("API keys POST error:", err);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json(
        { error: "Key ID is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Soft-revoke: set is_active = false
    const { error } = await db
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) throw error;

    // Audit log
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    await db.from("audit_logs").insert({
      actor_id: user.id,
      actor_role: profile?.role || "unknown",
      action: "api_key.revoked",
      target_type: "api_key",
      target_id: keyId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API keys DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
