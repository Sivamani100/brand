"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, Trash2, ArrowRight, User, Building, Inbox, Eye } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminApplicationsPage() {
  const supabase = createClient();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected" | "withdrawn">("all");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        card:cards(id, title, category, brand_id),
        influencer:profiles!applications_influencer_id_fkey(display_name, avatar_url, role)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applications list.");
    } else {
      // Fetch Brand Profile for each card since nested joins in Supabase require proper joins or subsequent requests
      const brandIds = Array.from(new Set(data?.map((app: any) => app.card?.brand_id).filter(Boolean)));
      
      const brandsMap: Record<string, string> = {};
      if (brandIds.length > 0) {
        const { data: brandsData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", brandIds);
        
        brandsData?.forEach((b: any) => {
          brandsMap[b.id] = b.display_name;
        });
      }

      const formatted = data?.map((app: any) => ({
        ...app,
        brandName: app.card?.brand_id ? brandsMap[app.card.brand_id] || "Unknown Brand" : "Unknown Brand",
      })) || [];

      setApplications(formatted);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleDeleteApplication = async (appId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this application? This action is permanent.");
    if (!confirm) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", appId);

    if (error) {
      toast.error("Failed to delete application.");
    } else {
      toast.success("Application deleted successfully.");
      fetchApplications();
    }
    setActionLoading(false);
  };

  const filteredApps = applications.filter((app) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCard = app.card?.title?.toLowerCase().includes(q);
      const matchInfluencer = app.influencer?.display_name?.toLowerCase().includes(q);
      const matchBrand = app.brandName?.toLowerCase().includes(q);
      if (!matchCard && !matchInfluencer && !matchBrand) return false;
    }

    // Filter status
    if (filter === "all") return true;
    return app.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="h-12 w-full bg-[#0d0d0d] rounded-full" />
        <div className="h-96 bg-[#0d0d0d] rounded-2xl" />
      </div>
    );
  }

  const filters: ("all" | "pending" | "accepted" | "rejected" | "withdrawn")[] = [
    "all",
    "pending",
    "accepted",
    "rejected",
    "withdrawn",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Applications Moderation
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Monitor all influencer pitches and submission rates
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[rgba(251,251,239,0.4)]" />
          <input
            type="text"
            placeholder="Search by card name, influencer name, or brand name..."
            className="w-full rounded-full bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] pl-11 pr-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 pb-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
                filter === f
                  ? "bg-[#fbfbef] text-black font-bold"
                  : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.4)] uppercase font-semibold">
              <th className="p-4">Influencer</th>
              <th className="p-4">Campaign Card</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Status</th>
              <th className="p-4">Proposed Rate</th>
              <th className="p-4">Submitted At</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(251,251,239,0.05)]">
            {filteredApps.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[rgba(251,251,239,0.4)]">
                  No applications found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-[#141414]/30 transition-colors">
                  {/* Influencer Profile info */}
                  <td className="p-4 flex items-center gap-3">
                    <div className="size-8 rounded-full border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
                      {app.influencer?.avatar_url ? (
                        <img src={app.influencer.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </div>
                    <div>
                      <Link href={`/admin/users/${app.influencer_id}`} className="font-bold text-[#fbfbef] hover:underline">
                        {app.influencer?.display_name || "Unknown"}
                      </Link>
                    </div>
                  </td>

                  {/* Campaign Card */}
                  <td className="p-4">
                    {app.card ? (
                      <Link href={`/admin/cards/${app.card.id}`} className="font-semibold text-[#fbfbef] hover:underline">
                        {app.card.title}
                      </Link>
                    ) : (
                      <span className="text-[rgba(251,251,239,0.4)]">Deleted Card</span>
                    )}
                  </td>

                  {/* Brand Owner */}
                  <td className="p-4 font-semibold text-[#fbfbef]">
                    {app.card?.brand_id ? (
                      <Link href={`/admin/users/${app.card.brand_id}`} className="hover:underline">
                        {app.brandName}
                      </Link>
                    ) : (
                      <span>N/A</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      app.status === "accepted"
                        ? "text-[#4ade80]"
                        : app.status === "rejected"
                        ? "text-[#f87171]"
                        : app.status === "withdrawn"
                        ? "text-[rgba(251,251,239,0.4)]"
                        : "text-[#facc15]"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        app.status === "accepted"
                          ? "bg-[#4ade80]"
                          : app.status === "rejected"
                          ? "bg-[#f87171]"
                          : app.status === "withdrawn"
                          ? "bg-[rgba(251,251,239,0.4)]"
                          : "bg-[#facc15]"
                      }`} />
                      {app.status}
                    </span>
                  </td>

                  {/* Proposed Rate */}
                  <td className="p-4 font-semibold text-[#fbfbef]">
                    {app.proposed_rate || "Discuss / Default"}
                  </td>

                  {/* Applied date */}
                  <td className="p-4 text-[rgba(251,251,239,0.6)]">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right flex justify-end gap-1.5">
                    {app.card && (
                      <Link
                        href={`/admin/cards/${app.card.id}`}
                        className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#fbfbef] hover:bg-[#1c1c1c] scale-active"
                        title="View Campaign Detail"
                      >
                        <Eye className="size-3.5" />
                      </Link>
                    )}
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDeleteApplication(app.id)}
                      className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#f87171] hover:bg-[#261414] scale-active"
                      title="Delete Application"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
