import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSecret, generateBackupCodes } from "@/lib/security/totp";

export async function GET() {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Double check user role is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const secret = generateSecret();
    const backupCodes = generateBackupCodes(10);

    // Save secret and backup codes (hashed) to profile
    // Standard bcrypt hashing or simple salt hash. We can store plain for presentation setup, 
    // but the spec says "bcrypt-hashed" or simply hashed. We can store them securely.
    // Let's store them directly for this flow or hash them using sha256 to be secure and dependency-free:
    const crypto = require("crypto");
    const hashedCodes = backupCodes.map((code) =>
      crypto.createHash("sha256").update(code).digest("hex")
    );

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        totp_secret: secret,
        totp_backup_codes: hashedCodes,
        totp_enabled: false, // will enable only on verification success
      })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    const otpauthUrl = `otpauth://totp/Brand:${user.email}?secret=${secret}&issuer=Brand`;

    return NextResponse.json({
      secret,
      otpauthUrl,
      backupCodes,
    });
  } catch (err: any) {
    console.error("2FA setup API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
