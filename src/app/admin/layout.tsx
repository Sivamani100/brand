"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  LayoutGrid,
  Users,
  Layers,
  Inbox,
  MessageCircle,
  AlertOctagon,
  Settings,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Scale,
  ShieldAlert,
  Mail,
  Flag,
  FileText,
  LifeBuoy,
} from "lucide-react";
import toast from "react-hot-toast";
import { Sidebar } from "@/components/shared/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useUser();
  const supabase = createClient();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out.");
      return;
    }
    toast.success("Signed out successfully.");
    router.push("/auth/signin");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-[#fbfbef]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
      </div>
    );
  }

  // Double check client-side admin permission
  if (profile?.role !== "admin") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-center space-y-4 px-6">
        <AlertOctagon className="size-12 text-[#f87171]" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-sm text-[rgba(251,251,239,0.6)]">
          You do not have administrative permissions to view this panel.
        </p>
        <Link href="/dashboard" className="rounded-full bg-[#fbfbef] text-black px-6 py-2.5 text-xs font-bold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const adminNavItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutGrid },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Cards", href: "/admin/cards", icon: Layers },
    { label: "Applications", href: "/admin/applications", icon: Inbox },
    { label: "Rooms", href: "/admin/rooms", icon: MessageCircle },
    { label: "Verifications", href: "/admin/verifications", icon: ShieldCheck },
    { label: "Disputes", href: "/admin/disputes", icon: Scale },
    { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert },
    { label: "Email System", href: "/admin/emails", icon: Mail },
    { label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
    { label: "Reports", href: "/admin/reports", icon: AlertOctagon },
    { label: "Support Desk", href: "/admin/support", icon: LifeBuoy },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-black text-[#fbfbef] font-sans">
      <Sidebar
        role="admin"
        navItems={adminNavItems}
        unreadCounts={{ notifications: 0, messages: 0 }}
        onSignOut={handleSignOut}
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

      {/* Main Panel Content */}
      <div className={`flex-1 min-h-screen transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "pl-[240px]" : "pl-[76px]"
      }`}>
        <main className="p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
