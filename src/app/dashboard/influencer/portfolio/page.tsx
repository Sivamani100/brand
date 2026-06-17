"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Globe,
  Star,
  Eye,
  Settings,
  EyeOff,
  Move,
  Grid,
} from "lucide-react";
import toast from "react-hot-toast";

interface PortfolioItem {
  id: string;
  title: string | null;
  caption: string | null;
  media_url: string | null;
  media_type: "image" | "video_url" | "embed";
  platform: string | null;
  post_url: string | null;
  views: number;
  likes: number;
  comments: number;
  sort_order: number;
}

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Twitter/X", "LinkedIn"];

export default function PortfolioBuilderPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview Mode
  const [previewMode, setPreviewMode] = useState(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [mediaType, setMediaType] = useState<"image" | "video_url">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [views, setViews] = useState(0);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);



  async function loadPortfolio() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("owner_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setPortfolio((data as unknown as PortfolioItem[]) || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load portfolio items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPortfolio();
  }, [user]);

  const handleOpenAddModal = () => {
    if (portfolio.length >= 20) {
      toast.error("You can add a maximum of 20 portfolio items.");
      return;
    }
    setEditingId(null);
    setTitle("");
    setCaption("");
    setPlatform("Instagram");
    setMediaType("image");
    setMediaUrl("");
    setPostUrl("");
    setViews(0);
    setLikes(0);
    setComments(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PortfolioItem) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setCaption(item.caption || "");
    setPlatform(item.platform || "Instagram");
    setMediaType(item.media_type === "image" ? "image" : "video_url");
    setMediaUrl(item.media_url || "");
    setPostUrl(item.post_url || "");
    setViews(item.views);
    setLikes(item.likes);
    setComments(item.comments);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    setUploadingFile(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/portfolio_${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("card-covers")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("card-covers").getPublicUrl(filePath);
      setMediaUrl(urlData.publicUrl);
      toast.success("Image uploaded!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload image");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("portfolio_items")
          .update({
            title,
            caption,
            platform,
            media_type: mediaType,
            media_url: mediaUrl,
            post_url: postUrl,
            views: Number(views),
            likes: Number(likes),
            comments: Number(comments),
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Portfolio item updated");
      } else {
        // Insert
        const nextSortOrder = portfolio.length > 0 ? Math.max(...portfolio.map((p) => p.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from("portfolio_items")
          .insert({
            owner_id: user.id,
            owner_role: "influencer",
            title,
            caption,
            platform,
            media_type: mediaType,
            media_url: mediaUrl,
            post_url: postUrl,
            views: Number(views),
            likes: Number(likes),
            comments: Number(comments),
            sort_order: nextSortOrder,
          });

        if (error) throw error;
        toast.success("Portfolio item added");
      }

      setIsModalOpen(false);
      loadPortfolio();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save portfolio item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio item?")) return;
    try {
      const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
      if (error) throw error;
      toast.success("Item deleted");
      loadPortfolio();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete item");
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (index: number) => {
    if (previewMode) return;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...portfolio];
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, removed);
    setPortfolio(reordered);
    setDragIndex(null);

    // Save order
    try {
      const updates = reordered.map((item, idx) =>
        supabase
          .from("portfolio_items")
          .update({ sort_order: idx })
          .eq("id", item.id)
      );
      await Promise.all(updates);
      toast.success("Display order saved");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save reordered items");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">My Portfolio Builder</h1>
          <p className="text-sm text-text-secondary mt-1">
            Build and showcase your work. Add up to 20 images or videos with metrics.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="rounded-full border border-border-strong bg-surface-2 hover:bg-surface-3 text-text-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {previewMode ? (
              <>
                <EyeOff className="size-3.5" />
                <span>Exit Preview</span>
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                <span>Preview Profile Mode</span>
              </>
            )}
          </button>

          {!previewMode && (
            <button
              onClick={handleOpenAddModal}
              className="rounded-full bg-accent text-invert-text hover:opacity-90 px-5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Add Item ({portfolio.length}/20)</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-video bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : portfolio.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border-strong rounded-3xl max-w-md mx-auto">
          <Grid className="size-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary">No Portfolio Items</h3>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            Showcase your best campaigns, posts, and visual outcomes to brands.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="rounded-full bg-accent text-invert-text px-6 py-2.5 text-xs font-semibold"
          >
            Create First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {portfolio.map((item, idx) => (
            <div
              key={item.id}
              draggable={!previewMode}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              className={`group flex flex-col justify-between bg-surface border border-border-strong rounded-2xl overflow-hidden shadow-sm transition-all duration-300 relative ${
                !previewMode ? "cursor-grab active:cursor-grabbing hover:border-[rgba(251,251,239,0.35)]" : ""
              }`}
            >
              {/* Media Thumbnail */}
              <div className="aspect-video w-full bg-surface-2 relative overflow-hidden flex items-center justify-center">
                {item.media_url ? (
                  <img src={item.media_url} alt="Portfolio Media" className="size-full object-cover" />
                ) : (
                  <span className="text-[10px] text-text-muted">No media uploaded</span>
                )}

                {item.platform && (
                  <span className="absolute top-3 right-3 rounded-full bg-black/80 border border-border px-2.5 py-0.5 text-[9px] font-semibold text-text-primary uppercase">
                    {item.platform}
                  </span>
                )}

                {/* Move Icon for drag reordering in Builder Mode */}
                {!previewMode && (
                  <div className="absolute top-3 left-3 bg-black/80 border border-border p-1 rounded-md text-text-secondary group-hover:text-text-primary transition-opacity">
                    <Move className="size-3.5" />
                  </div>
                )}
              </div>

              {/* Information */}
              <div className="p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-text-primary truncate">{item.title || "Untitled Project"}</h4>
                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed min-h-[32px]">
                  {item.caption || "No caption details."}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-1 pt-2.5 border-t border-border text-center text-[9px] font-semibold text-text-muted">
                  <div>
                    <span className="block text-text-primary font-black">{item.views.toLocaleString()}</span>
                    <span>Views</span>
                  </div>
                  <div>
                    <span className="block text-text-primary font-black">{item.likes.toLocaleString()}</span>
                    <span>Likes</span>
                  </div>
                  <div>
                    <span className="block text-text-primary font-black">{item.comments.toLocaleString()}</span>
                    <span>Comments</span>
                  </div>
                </div>
              </div>

              {/* Action buttons or URL in Preview */}
              <div className="px-4 pb-4 pt-1">
                {previewMode ? (
                  item.post_url ? (
                    <a
                      href={item.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center rounded-xl bg-surface-2 hover:bg-surface-3 text-[10px] font-semibold py-1.5 transition-colors border border-border text-text-primary"
                    >
                      View Original Post
                    </a>
                  ) : (
                    <div className="text-center text-[10px] font-semibold text-text-muted py-1.5">
                      No link provided
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="rounded-full bg-surface-2 hover:bg-surface-3 border border-border text-text-primary py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Edit2 className="size-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="rounded-full hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-red-400 py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Trash2 className="size-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal Sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 border border-border-strong shadow-glow space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-text-primary">
                {editingId ? "Edit Portfolio Item" : "Add Portfolio Item"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Media Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2.5 text-xs text-text-primary outline-none"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="General">General/Web</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Media Type
                  </label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as any)}
                    className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2.5 text-xs text-text-primary outline-none"
                  >
                    <option value="image">Upload Image</option>
                    <option value="video_url">Video Embed URL</option>
                  </select>
                </div>
              </div>

              {/* Upload file or URL */}
              {mediaType === "image" ? (
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Image File
                  </label>
                  <div className="flex gap-3 items-center">
                    <label className="flex items-center gap-2 bg-surface-2 border border-border-strong hover:bg-surface-3 text-text-primary px-4 py-2.5 rounded-full text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="size-4" />
                      <span>{uploadingFile ? "Uploading..." : "Upload File"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFile}
                        onChange={handleImageUpload}
                      />
                    </label>
                    <span className="text-[10px] text-text-muted truncate flex-1">
                      {mediaUrl ? "Image loaded successfully" : "No image selected"}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Video Embed URL (YouTube/Vimeo/etc.)
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    required
                    className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2.5 text-xs text-text-primary outline-none"
                  />
                </div>
              )}

              {/* Title & Caption */}
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer Fitness Reels Collection"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2.5 text-xs text-text-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                  Caption / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell brands about what you accomplished..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="block w-full rounded-2xl bg-surface-2 border border-border-strong px-4 py-2.5 text-xs text-text-primary outline-none"
                />
              </div>

              {/* Links & Metrics */}
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                  Original Post Link
                </label>
                <input
                  type="url"
                  placeholder="https://instagram.com/p/..."
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2.5 text-xs text-text-primary outline-none"
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                    Views
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={views}
                    onChange={(e) => setViews(Number(e.target.value))}
                    required
                    className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2 text-xs text-text-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                    Likes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={likes}
                    onChange={(e) => setLikes(Number(e.target.value))}
                    required
                    className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2 text-xs text-text-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                    Comments
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={comments}
                    onChange={(e) => setComments(Number(e.target.value))}
                    required
                    className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2 text-xs text-text-primary outline-none font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-surface-2 px-5 py-2 text-xs font-semibold text-text-secondary border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile || !mediaUrl}
                  className="rounded-full bg-accent px-6 py-2 text-xs font-semibold text-invert-text disabled:opacity-50"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
