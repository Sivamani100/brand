import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription, userAgent } = await req.json();
    if (!subscription) {
      return NextResponse.json({ error: "Missing subscription data" }, { status: 400 });
    }

    // Check if subscription already exists for this user to avoid duplicates
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("subscription->>endpoint", subscription.endpoint);

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, message: "Subscription already registered" });
    }

    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: session.user.id,
      subscription: subscription,
      user_agent: userAgent || null,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Push subscription saved" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Missing subscription endpoint" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id)
      .eq("subscription->>endpoint", subscription.endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Push subscription deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
