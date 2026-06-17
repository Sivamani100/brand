import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/support/export - List user's export requests OR download a specific export
export async function GET(request: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      // List user's data export requests
      const { data, error } = await supabase
        .from("data_export_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data || []);
    }

    // Download a specific export request
    const { data: exportRequest, error: reqError } = await supabase
      .from("data_export_requests")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (reqError || !exportRequest) {
      return NextResponse.json({ error: "Export request not found" }, { status: 404 });
    }

    // Check expiration
    if (new Date(exportRequest.expires_at) < new Date()) {
      return NextResponse.json({ error: "Export link has expired (24h limit)" }, { status: 410 });
    }

    // Update status to processing (simulated on-the-fly assembly)
    await supabase
      .from("data_export_requests")
      .update({ status: "processing" })
      .eq("id", id);

    // Fetch all user PII data
    // 1. Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // 2. Cards
    const { data: cards } = await supabase
      .from("cards")
      .select("*")
      .eq("brand_id", user.id);

    // 3. Applications
    const { data: applications } = await supabase
      .from("applications")
      .select("*")
      .eq("influencer_id", user.id);

    // 4. Rooms
    const { data: rooms } = await supabase
      .from("rooms")
      .select("*")
      .or(`brand_id.eq.${user.id},influencer_id.eq.${user.id}`);

    // 5. Messages
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("sender_id", user.id);

    // 6. Support Tickets
    const { data: supportTickets } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id);

    // 7. Login History
    const { data: loginHistory } = await supabase
      .from("login_history")
      .select("*")
      .eq("user_id", user.id);

    // Assemble PII
    const piiPayload = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: profile || null,
      cards: cards || [],
      applications: applications || [],
      rooms: rooms || [],
      messages: messages || [],
      support_tickets: supportTickets || [],
      login_history: loginHistory || [],
    };

    // Mark completed
    await supabase
      .from("data_export_requests")
      .update({ status: "completed" })
      .eq("id", id);

    // Audit Log the download action
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "gdpr.data_exported",
      metadata: { request_id: id },
    });

    return new Response(JSON.stringify(piiPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="brand-data-export-${id}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process export download" }, { status: 500 });
  }
}

// POST /api/support/export - Trigger a new data export request
export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Insert new export request
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiration
    
    const { data: newRequest, error } = await supabase
      .from("data_export_requests")
      .insert({
        user_id: user.id,
        status: "completed", // We generate dynamically, so it's ready immediately
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;

    // Set dynamic download URL pointing back to GET route with ID
    const downloadUrl = `/api/support/export?id=${newRequest.id}`;
    
    const { data: updatedRequest, error: updateError } = await supabase
      .from("data_export_requests")
      .update({ download_url: downloadUrl })
      .eq("id", newRequest.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log request in audit log
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "gdpr.export_requested",
      metadata: { request_id: newRequest.id },
    });

    return NextResponse.json(updatedRequest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to initiate data export" }, { status: 500 });
  }
}
