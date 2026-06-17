"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, UserCheck, ShieldAlert, Ban, Trash2, ShieldCheck, Mail, Building, User } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "brand" | "influencer" | "admin" | "suspended">("all");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load users list.");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !currentStatus })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update verification status.");
    } else {
      toast.success("Verification badge status updated.");
      fetchUsers();
    }
    setActionLoading(false);
  };

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success(currentStatus ? "User suspended." : "User activated.");
      fetchUsers();
    }
    setActionLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this user? This will remove all their data from the database.");
    if (!confirm) return;

    setActionLoading(true);
    // Since we delete auth.users cascade, we should delete from auth.users (requires service role / admin APIs).
    // In our client, we can delete from profiles where RLS allows, or trigger cascade.
    // Let's delete the profile directly first.
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      toast.error("Failed to delete user profile: RLS restrictions apply.");
    } else {
      toast.success("User deleted successfully.");
      fetchUsers();
    }
    setActionLoading(false);
  };

  const filteredUsers = users.filter((u) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = u.display_name?.toLowerCase().includes(q);
      const matchCompany = u.company_name?.toLowerCase().includes(q);
      if (!matchName && !matchCompany) return false;
    }

    // Filter type
    if (filter === "all") return true;
    if (filter === "suspended") return !u.is_active;
    return u.role === filter;
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

  const filters: ("all" | "brand" | "influencer" | "admin" | "suspended")[] = [
    "all",
    "brand",
    "influencer",
    "admin",
    "suspended",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Platform Users
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Manage brand accounts, creator profiles, and verification badges
        </p>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[rgba(251,251,239,0.4)]" />
          <input
            type="text"
            placeholder="Search by contact name or company name..."
            className="w-full rounded-full bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] pl-11 pr-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
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

      {/* Users table */}
      <div className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.4)] uppercase font-semibold">
              <th className="p-4">Contact</th>
              <th className="p-4">Role</th>
              <th className="p-4">Details</th>
              <th className="p-4">Status</th>
              <th className="p-4">Verification</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(251,251,239,0.05)]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[rgba(251,251,239,0.4)]">
                  No users found matching the selected query.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#141414]/30 transition-colors">
                  {/* Contact */}
                  <td className="p-4 flex items-center gap-3">
                    <div className="size-8 rounded-full border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-[#fbfbef] flex items-center gap-1">
                        <Link href={`/admin/users/${user.id}`} className="hover:underline">
                          {user.display_name}
                        </Link>
                        {user.is_verified && (
                          <span className="size-3 flex items-center justify-center text-[8px] bg-[#fbfbef] text-black rounded-full font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[rgba(251,251,239,0.4)] block mt-0.5">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                      user.role === "admin"
                        ? "bg-[#f87171] text-black"
                        : user.role === "brand"
                        ? "bg-[#c084fc] text-black"
                        : "bg-[#38bdf8] text-black"
                    }`}>
                      {user.role}
                    </span>
                  </td>

                  {/* Details */}
                  <td className="p-4">
                    {user.role === "brand" ? (
                      <span className="text-[11px] text-[rgba(251,251,239,0.8)] font-semibold flex items-center gap-1">
                        <Building className="size-3.5 text-[rgba(251,251,239,0.4)]" />
                        {user.company_name || "Company"} ({user.industry})
                      </span>
                    ) : (
                      <span className="text-[11px] text-[rgba(251,251,239,0.8)] font-semibold">
                        {user.platforms?.join(", ") || "No platforms"} • {user.follower_count?.toLocaleString()} followers
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      user.is_active ? "text-[#4ade80]" : "text-[#f87171]"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-[#4ade80]" : "bg-[#f87171]"}`} />
                      {user.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>

                  {/* Verification */}
                  <td className="p-4">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleToggleVerify(user.id, !!user.is_verified)}
                      className={`text-[10px] font-bold border rounded-full px-3 py-1 flex items-center gap-1.5 scale-active transition-all ${
                        user.is_verified
                          ? "border-[#fbfbef] bg-[#fbfbef] text-black"
                          : "border-[rgba(251,251,239,0.2)] text-[rgba(251,251,239,0.6)] hover:border-white"
                      }`}
                    >
                      <ShieldCheck className="size-3.5" />
                      <span>{user.is_verified ? "Verified" : "Verify"}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right flex justify-end gap-1.5">
                    {/* Suspend toggle */}
                    <button
                      disabled={actionLoading}
                      onClick={() => handleToggleSuspend(user.id, !!user.is_active)}
                      className={`p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] scale-active ${
                        user.is_active
                          ? "text-[#facc15] hover:bg-[#262614]"
                          : "text-[#4ade80] hover:bg-[#142614]"
                      }`}
                      title={user.is_active ? "Suspend User" : "Activate User"}
                    >
                      <Ban className="size-3.5" />
                    </button>

                    {/* Delete account */}
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#f87171] hover:bg-[#261414] scale-active"
                      title="Delete User"
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
