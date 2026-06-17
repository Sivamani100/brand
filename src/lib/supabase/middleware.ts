import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  // 1. Request ID Generation & Propagation
  let requestId = request.headers.get("x-request-id");
  if (!requestId) {
    requestId = Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  request.headers.set("x-request-id", requestId);
  response.headers.set("x-request-id", requestId);

  const url = request.nextUrl.clone();

  // 2. CSRF Protection for mutating API calls
  const method = request.method.toUpperCase();
  if (url.pathname.startsWith("/api") && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfCookie = request.cookies.get("csrf-token")?.value;
    const csrfHeader = request.headers.get("X-CSRF-Token");
    
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return new NextResponse(JSON.stringify({ error: "CSRF validation failed" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "x-request-id": requestId,
        },
      });
    }
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Fetch current user from auth token
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch maintenance mode settings
  const { data: maintSettings } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .maybeSingle();
  const maintenance = maintSettings?.value as any;

  // 3. Not signed in: redirect protected routes to signin or maintenance
  if (!user) {
    if (maintenance?.enabled) {
      if (url.pathname !== "/maintenance" && url.pathname !== "/auth/signin" && !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api")) {
        url.pathname = "/maintenance";
        return NextResponse.redirect(url);
      }
    } else {
      if (url.pathname === "/maintenance") {
        url.pathname = "/auth/signin";
        return NextResponse.redirect(url);
      }
    }

    if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin")) {
      url.pathname = "/auth/signin";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 4. Signed in: fetch profile to check role, onboarding, active status, and 2FA settings
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role, onboarding_complete, onboarding_step, is_active, totp_enabled")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const onboardingComplete = profile?.onboarding_complete;
  const onboardingStep = profile?.onboarding_step || 0;
  const isActive = profile?.is_active ?? true;
  const totpEnabled = profile?.totp_enabled ?? false;

  // 5. Account Lockout check (for suspended users)
  if (!isActive) {
    if (url.pathname !== "/auth/suspended" && !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api")) {
      url.pathname = "/auth/suspended";
      return NextResponse.redirect(url);
    }
    if (url.pathname === "/auth/suspended") {
      return response;
    }
  } else if (url.pathname === "/auth/suspended") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 6. Admin 2FA Redirection
  if (role === "admin" && !totpEnabled) {
    if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/setup-2fa") {
      url.pathname = "/admin/setup-2fa";
      return NextResponse.redirect(url);
    }
  }

  // 7. IP Allowlisting for Admin panel
  if (url.pathname.startsWith("/admin")) {
    const { data: ipSettings } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "admin_ip_allowlist")
      .maybeSingle();

    const allowlist = ipSettings?.value as any;
    if (allowlist?.enabled) {
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
      const allowedIps = allowlist.ips || [];
      const isAllowed = allowedIps.some((allowed: string) => {
        if (allowed.includes("/")) {
          const [allowedIp] = allowed.split("/");
          return clientIp.startsWith(allowedIp.substring(0, allowedIp.lastIndexOf(".")));
        }
        return clientIp === allowed;
      });

      if (!isAllowed) {
        return new NextResponse("Access Denied: IP Address not allowlisted", {
          status: 403,
          headers: { "x-request-id": requestId },
        });
      }
    }
  }

  // Maintenance redirect for logged in non-admins
  if (maintenance?.enabled && role !== "admin") {
    if (url.pathname !== "/maintenance" && !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api")) {
      url.pathname = "/maintenance";
      return NextResponse.redirect(url);
    }
  } else if (!maintenance?.enabled) {
    if (url.pathname === "/maintenance") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Onboarding gate (skip for admin)
  if (role !== "admin" && !onboardingComplete) {
    if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin")) {
      url.pathname = `/onboarding/step-${onboardingStep + 1}`;
      return NextResponse.redirect(url);
    }
    if (url.pathname.startsWith("/onboarding/step-")) {
      const match = url.pathname.match(/\/onboarding\/step-(\d+)/);
      if (match) {
        const reqStep = parseInt(match[1], 10);
        if (reqStep > onboardingStep + 1) {
          url.pathname = `/onboarding/step-${onboardingStep + 1}`;
          return NextResponse.redirect(url);
        }
      }
    }
  } else {
    if (url.pathname.startsWith("/onboarding")) {
      if (role === "admin") {
        url.pathname = "/admin";
      } else if (role === "brand") {
        url.pathname = "/dashboard/brand";
      } else {
        url.pathname = "/dashboard/influencer";
      }
      return NextResponse.redirect(url);
    }
  }

  // Admin protection
  if (url.pathname.startsWith("/admin") && role !== "admin") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Cross-dashboard protection
  if (url.pathname.startsWith("/dashboard/brand") && role !== "brand") {
    url.pathname = "/dashboard/influencer";
    return NextResponse.redirect(url);
  }

  if (url.pathname.startsWith("/dashboard/influencer") && role !== "influencer") {
    url.pathname = "/dashboard/brand";
    return NextResponse.redirect(url);
  }

  // Redirect signed-in users away from auth pages (unless accessing /auth/suspended)
  if (url.pathname.startsWith("/auth") && url.pathname !== "/auth/suspended") {
    if (role === "admin") {
      url.pathname = "/admin";
    } else if (role === "brand") {
      url.pathname = "/dashboard/brand";
    } else {
      url.pathname = "/dashboard/influencer";
    }
    return NextResponse.redirect(url);
  }

  return response;
}
