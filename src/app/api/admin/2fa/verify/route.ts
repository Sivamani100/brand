import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyTOTP } from "@/lib/security/totp";

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || code.trim().length !== 6) {
      return NextResponse.json({ error: "Invalid 6-digit code format" }, { status: 400 });
    }

    // Fetch secret from profile
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("role, totp_secret")
      .eq("id", user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!profile.totp_secret) {
      return NextResponse.json({ error: "2FA secret not initialized" }, { status: 400 });
    }

    // Verify token
    const isValid = verifyTOTP(code.trim(), profile.totp_secret);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    // Mark 2FA as enabled
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        totp_enabled: true,
        totp_last_used: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    // Log to audit logs
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "security.2fa_enabled",
      metadata: { enabled: true },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("2FA verify API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
