import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirm !== "DELETE") {
      return NextResponse.json({ error: 'Confirmation must match "DELETE"' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Audit Log the deletion action before we lock the account
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "gdpr.account_erasure",
      metadata: { deleted_at: now },
    });

    // 2. Soft-delete user records across tables
    // Cards
    await supabase
      .from("cards")
      .update({ deleted_at: now })
      .eq("brand_id", user.id);

    // Applications
    await supabase
      .from("applications")
      .update({ deleted_at: now })
      .eq("influencer_id", user.id);

    // Messages
    await supabase
      .from("messages")
      .update({ deleted_at: now })
      .eq("sender_id", user.id);

    // Rooms (as brand or influencer)
    await supabase
      .from("rooms")
      .update({ deleted_at: now })
      .or(`brand_id.eq.${user.id},influencer_id.eq.${user.id}`);

    // Reviews (written or received)
    await supabase
      .from("reviews")
      .update({ deleted_at: now })
      .or(`reviewer_id.eq.${user.id},reviewed_id.eq.${user.id}`);

    // Portfolio Items
    await supabase
      .from("portfolio_items")
      .update({ deleted_at: now })
      .eq("owner_id", user.id);

    // 3. Deactivate/Suspend Profile (causes middleware account deactivation redirects)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_active: false, updated_at: now })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // 4. Terminate active sessions / Sign Out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: "Account successfully deactivated and queued for erasure." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process account erasure request" }, { status: 500 });
  }
}
