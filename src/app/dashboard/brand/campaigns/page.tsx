"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Calendar,
  Trophy,
  Users,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface Campaign {
  id: string;
  title: string;
  cover_url: string | null;
  description: string | null;
  outcome_blurb: string | null;
  influencer_ids: string[] | null;
  campaign_start: string | null;
  campaign_end: string | null;
}

interface InfluencerSelect {
  id: string;
  display_name: string;
}

export default function CampaignShowcaseBuilderPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [influencers, setInfluencers] = useState<InfluencerSelect[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [outcomeBlurb, setOutcomeBlurb] = useState("");
  const [selectedInfluencerIds, setSelectedInfluencerIds] = useState<string[]>([]);
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");

  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadCampaignsAndInfluencers();
  }, [user]);

  async function loadCampaignsAndInfluencers() {
    setLoading(true);
    try {
      // 1. Fetch campaigns
      const { data: camps, error: campError } = await supabase
        .from("brand_campaigns")
        .select("*")
        .eq("brand_id", user?.id)
        .order("created_at", { ascending: false });

      if (campError) throw campError;
      setCampaigns(camps || []);

      // 2. Fetch influencer profiles for selection tagging
      const { data: infs, error: infError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("role", "influencer");

      if (infError) throw infError;
      setInfluencers(infs || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTitle("");
    setCoverUrl("");
    setDescription("");
    setOutcomeBlurb("");
    setSelectedInfluencerIds([]);
    setCampaignStart("");
    setCampaignEnd("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (camp: Campaign) => {
    setEditingId(camp.id);
    setTitle(camp.title);
    setCoverUrl(camp.cover_url || "");
    setDescription(camp.description || "");
    setOutcomeBlurb(camp.outcome_blurb || "");
    setSelectedInfluencerIds(camp.influencer_ids || []);
    setCampaignStart(camp.campaign_start || "");
    setCampaignEnd(camp.campaign_end || "");
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    setUploadingFile(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/camp_${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("card-covers")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("card-covers").getPublicUrl(filePath);
      setCoverUrl(urlData.publicUrl);
      toast.success("Cover image uploaded!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload cover image");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        brand_id: user.id,
        title,
        cover_url: coverUrl || null,
        description: description || null,
        outcome_blurb: outcomeBlurb || null,
        influencer_ids: selectedInfluencerIds,
        campaign_start: campaignStart || null,
        campaign_end: campaignEnd || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("brand_campaigns")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Campaign updated successfully");
      } else {
        const { error } = await supabase
          .from("brand_campaigns")
          .insert(payload);

        if (error) throw error;
        toast.success("Campaign added to showcase");
      }

      setIsModalOpen(false);
      loadCampaignsAndInfluencers();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save campaign");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign showcase?")) return;
    try {
      const { error } = await supabase.from("brand_campaigns").delete().eq("id", id);
      if (error) throw error;
      toast.success("Campaign deleted");
      loadCampaignsAndInfluencers();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete campaign");
    }
  };

  const toggleInfluencerSelection = (id: string) => {
    setSelectedInfluencerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef]">My Campaign Showcase</h1>
          <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1">
            Display your past completed campaigns on your public brand profile page.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="rounded-full bg-[#fbfbef] text-black hover:bg-[#eaeaea] px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Add Past Campaign</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-video bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[rgba(251,251,239,0.2)] rounded-3xl max-w-md mx-auto">
          <Trophy className="size-12 text-[rgba(251,251,239,0.2)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#fbfbef]">No Campaigns Showcased</h3>
          <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1 mb-6">
            Add past collaboration campaigns to impress potential creators.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="rounded-full bg-[#fbfbef] text-black px-6 py-2.5 text-xs font-bold"
          >
            Create Showcase Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="group flex flex-col justify-between bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl overflow-hidden shadow-sm hover:border-[rgba(251,251,239,0.35)] transition-all duration-300"
            >
              <div>
                {/* Cover Banner */}
                <div className="aspect-video w-full bg-[#141414] relative overflow-hidden flex items-center justify-center">
                  {camp.cover_url ? (
                    <img src={camp.cover_url} alt={camp.title} className="size-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-[rgba(251,251,239,0.3)]">No cover image</span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <h4 className="font-extrabold text-base text-[#fbfbef] truncate">{camp.title}</h4>
                  <p className="text-xs text-[rgba(251,251,239,0.6)] line-clamp-2 leading-relaxed min-h-[32px]">
                    {camp.description || "No description provided."}
                  </p>

                  {/* Outcome */}
                  {camp.outcome_blurb && (
                    <div className="bg-[#141414] rounded-xl p-3 border border-[rgba(251,251,239,0.05)]">
                      <span className="text-[9px] uppercase tracking-wide font-extrabold text-[rgba(251,251,239,0.4)] block mb-1">
                        Outcome / Results
                      </span>
                      <p className="text-xs font-bold text-[#4ade80]">{camp.outcome_blurb}</p>
                    </div>
                  )}

                  {/* Date range */}
                  {(camp.campaign_start || camp.campaign_end) && (
                    <div className="text-[10px] text-[rgba(251,251,239,0.4)] flex items-center gap-1 font-semibold">
                      <Calendar className="size-3" />
                      <span>
                        {camp.campaign_start ? new Date(camp.campaign_start).toLocaleDateString() : ""} -{" "}
                        {camp.campaign_end ? new Date(camp.campaign_end).toLocaleDateString() : "Ongoing"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="px-5 pb-5 pt-2 border-t border-[rgba(251,251,239,0.05)] grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOpenEditModal(camp)}
                  className="rounded-full bg-[#141414] hover:bg-[#1c1c1c] border border-[rgba(251,251,239,0.15)] text-[#fbfbef] py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Edit2 className="size-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteCampaign(camp.id)}
                  className="rounded-full hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-red-400 py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Trash2 className="size-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#fbfbef]">
                {editingId ? "Edit Showcase Campaign" : "Add Showcase Campaign"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[rgba(251,251,239,0.6)] hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-1.5">
                  Campaign Cover Image
                </label>
                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-2 bg-[#141414] border border-[rgba(251,251,239,0.2)] hover:bg-[#1c1c1c] text-[#fbfbef] px-4 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-colors">
                    <Upload className="size-4" />
                    <span>{uploadingFile ? "Uploading..." : "Upload Cover"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingFile}
                      onChange={handleImageUpload}
                    />
                  </label>
                  <span className="text-[10px] text-[rgba(251,251,239,0.4)] truncate flex-1">
                    {coverUrl ? "Cover image loaded" : "No image selected"}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-1.5">
                  Campaign Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Winter Clothes Launch Campaign"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the campaign brief and goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-2xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] outline-none"
                />
              </div>

              {/* Outcome Blurb */}
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-1.5">
                  Outcome Blurb (Key metrics achieved)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2.1M Impressions, 50K Link Clicks, 15% CTR boost"
                  value={outcomeBlurb}
                  onChange={(e) => setOutcomeBlurb(e.target.value)}
                  className="block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] outline-none font-semibold text-[#4ade80]"
                />
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={campaignStart}
                    onChange={(e) => setCampaignStart(e.target.value)}
                    className="block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={campaignEnd}
                    onChange={(e) => setCampaignEnd(e.target.value)}
                    className="block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] outline-none"
                  />
                </div>
              </div>

              {/* Influencers Selection */}
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-2">
                  Tag Participating Influencers
                </label>
                <div className="border border-[rgba(251,251,239,0.15)] bg-[#141414] rounded-2xl p-4 max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {influencers.length === 0 ? (
                    <p className="text-xs text-[rgba(251,251,239,0.4)]">No influencers found to tag.</p>
                  ) : (
                    influencers.map((inf) => {
                      const isSelected = selectedInfluencerIds.includes(inf.id);
                      return (
                        <button
                          key={inf.id}
                          type="button"
                          onClick={() => toggleInfluencerSelection(inf.id)}
                          className={`w-full text-left rounded-xl px-3 py-2 text-xs font-semibold hover:bg-black/40 flex items-center justify-between transition-colors ${
                            isSelected ? "text-[#fbfbef] bg-black/35" : "text-[rgba(251,251,239,0.6)]"
                          }`}
                        >
                          <span>{inf.display_name}</span>
                          {isSelected && <Check className="size-4 text-[#fbfbef]" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[rgba(251,251,239,0.05)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-[#141414] px-5 py-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="rounded-full bg-[#fbfbef] px-6 py-2 text-xs font-bold text-black disabled:opacity-50"
                >
                  Save Showcase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
