import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";
    
    // Simple User Agent Parsing Heuristics
    let deviceType: "mobile" | "desktop" | "tablet" = "desktop";
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      deviceType = "tablet";
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) {
      deviceType = "mobile";
    }

    let browser = "Unknown Browser";
    if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";
    else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";

    let os = "Unknown OS";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS")) os = "MacOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

    // Geolocation Lookup with 2-second timeout
    let country = "Local Network";
    let city = "Local Network";
    const isLocal = ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");
    
    if (!isLocal) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}`, { 
          signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(2000) : undefined 
        });
        const geoData = await geoRes.json();
        if (geoData && geoData.status === "success") {
          country = geoData.country || "Unknown Country";
          city = geoData.city || "Unknown City";
        }
      } catch (err) {
        console.error("IP Geolocation lookup failed:", err);
      }
    }

    // Suspicious Login Detection (different country than last 3 logins)
    const { data: history } = await supabase
      .from("login_history")
      .select("country, user_agent")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    let isSuspicious = false;
    if (history && history.length > 0) {
      const knownCountries = new Set(history.map((h: any) => h.country));
      if (!knownCountries.has(country)) {
        isSuspicious = true;
      }
    }

    // Insert to login history
    const { error: insertError } = await supabase.from("login_history").insert({
      user_id: user.id,
      ip_address: isLocal ? "127.0.0.1" : ip,
      country,
      city,
      user_agent: userAgent.substring(0, 255),
      device_type: deviceType,
      browser,
      os,
      is_suspicious: isSuspicious,
    });

    if (insertError) {
      console.error("Failed to insert login history:", insertError);
    }

    // Insert into audit logs
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: isSuspicious ? "auth.suspicious_login" : "auth.signin",
      metadata: { ip, country, city, userAgent, isSuspicious },
      ip_address: isLocal ? "127.0.0.1" : ip,
      user_agent: userAgent,
    });

    if (auditError) {
      console.error("Failed to insert login audit log:", auditError);
    }

    return NextResponse.json({ success: true, isSuspicious });
  } catch (err: any) {
    console.error("Error in after-signin route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
