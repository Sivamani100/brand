"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import toast from "react-hot-toast";
import { stopImpersonation } from "@/lib/utils/impersonation";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Sidebar } from "@/components/shared/Sidebar";
import { AppBar } from "@/components/shared/AppBar";
import { BottomBar } from "@/components/shared/BottomBar";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { KeyboardShortcutsModal } from "@/components/shared/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { getNavItems } from "@/lib/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, loading, isImpersonating } = useUser();
  const supabase = createClient();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // --- Realtime unread counts ---
  useEffect(() => {
    if (!user) return;

    async function fetchCounts() {
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setUnreadNotifications(notifCount || 0);

      const { data: userRooms } = await supabase
        .from("rooms")
        .select("id")
        .or(`brand_id.eq.${user.id},influencer_id.eq.${user.id}`);

      const roomIds = userRooms?.map((r) => r.id) || [];
      if (roomIds.length > 0) {
        const { count: msgCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("room_id", roomIds)
          .neq("sender_id", user.id)
          .eq("is_read", false);

        setUnreadMessages(msgCount || 0);
      }
    }

    fetchCounts();

    const channel = supabase
      .channel("realtime-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchCounts())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Failed to sign out."); return; }
    toast.success("Signed out successfully.");
    router.push("/auth/signin");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg text-text-primary">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent mx-auto" />
          <p className="text-sm font-sans tracking-wide text-text-secondary">Loading your environment...</p>
        </div>
      </div>
    );
  }

  const role = (profile?.role || "influencer") as "brand" | "influencer";
  const unreadCounts = { notifications: unreadNotifications, messages: unreadMessages };
  const { sidebarItems, bottomItems } = getNavItems(role, unreadCounts);

  return (
    <DashboardShell
      role={role}
      sidebarItems={sidebarItems}
      bottomItems={bottomItems}
      unreadCounts={unreadCounts}
      onSignOut={handleSignOut}
      isVerified={!!profile?.is_verified}
      avatarUrl={profile?.avatar_url}
      displayName={profile?.display_name || profile?.company_name}
      isImpersonating={!!isImpersonating}
      profile={profile}
      user={user}
      pathname={pathname}
      router={router}
    >
      {children}
    </DashboardShell>
  );
}

/** Inner shell that renders the layout chrome and initialises keyboard shortcuts. */
function DashboardShell({ role, sidebarItems, bottomItems, unreadCounts, onSignOut, isVerified, avatarUrl, displayName, isImpersonating, profile, user, pathname, router, children }: {
  role: "brand" | "influencer"; sidebarItems: any[]; bottomItems: any[]; unreadCounts: { notifications: number; messages: number };
  onSignOut: () => void; isVerified: boolean; avatarUrl?: string | null; displayName?: string | null;
  isImpersonating: boolean; profile: any; user: any; pathname: string; router: any; children: React.ReactNode;
}) {
  useKeyboardShortcuts({ role });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div className="flex min-h-screen bg-bg text-text-primary font-sans">
      <Sidebar
        role={role}
        navItems={sidebarItems}
        unreadCounts={unreadCounts}
        onSignOut={onSignOut}
        isVerified={isVerified}
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

      <div className={`flex-1 flex flex-col pb-[72px] md:pb-0 min-h-screen transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "md:pl-[240px]" : "md:pl-[76px]"
      }`}>
        {isImpersonating && (
          <div className="w-full bg-red-600 text-white text-xs md:text-sm font-semibold py-2.5 px-6 flex items-center justify-between z-40 border-b border-red-700 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span>Viewing workspace as <strong>{profile?.display_name || profile?.company_name || user?.email || "User"}</strong> (Impersonation Mode)</span>
            </div>
            <button onClick={() => { const userId = profile?.id; stopImpersonation(); toast.success("Stopped impersonation"); router.push(userId ? `/admin/users/${userId}` : "/admin/users"); setTimeout(() => { window.location.reload(); }, 100); }} className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors shadow-sm">Exit</button>
          </div>
        )}

        <AppBar role={role} unreadNotifications={unreadCounts.notifications} avatarUrl={avatarUrl} displayName={displayName} />

        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          <Breadcrumbs className="mb-4" />
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2, ease: "easeOut" }} className="h-full">
              <ErrorBoundary fallbackLevel="page">{children}</ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomBar items={bottomItems} />
      <GlobalSearch role={role} />
      <KeyboardShortcutsModal />
    </div>
  );
}
