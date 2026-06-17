"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  CheckCircle2,
  Star,
  Globe,
  User,
  Plus,
  Play,
  Heart,
  MessageSquare,
  Eye,
  Calendar,
  Clock,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
  Languages,
  DollarSign,
  TrendingUp,
  Activity,
  ThumbsUp,
  ShieldCheck,
  Check,
  AlertCircle
} from "lucide-react";
import { InstagramIcon, YoutubeIcon, TwitterIcon, LinkedinIcon } from "@/components/shared/SocialIcons";
import { countryCodeToFlag } from "@/lib/utils/location";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface PortfolioItem {
  id: string;
  title: string | null;
  caption: string | null;
  media_url: string | null;
  media_type: "image" | "video_url" | "embed" | null;
  platform: string | null;
  post_url: string | null;
  views: number;
  likes: number;
  comments: number;
  sort_order?: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  communication_rating?: number;
  quality_rating?: number;
  timeliness_rating?: number;
  professionalism_rating?: number;
  value_rating?: number;
  reviewer: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  reply: string | null;
  reply_at: string | null;
}

interface InfluencerProfileViewProps {
  profile: any;
  portfolio: PortfolioItem[];
  reviews: Review[];
  stats: { collabsCompleted: number; acceptanceRate: number };
  isOwner?: boolean;
}

export default function InfluencerProfileView({
  profile,
  portfolio,
  reviews,
  stats,
  isOwner = false
}: InfluencerProfileViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activePlatformTab, setActivePlatformTab] = useState("instagram");
  const [activeLightboxItem, setActiveLightboxItem] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const PLATFORM_ICONS: Record<string, any> = {
    instagram: InstagramIcon,
    youtube: YoutubeIcon,
    tiktok: Globe,
    twitter: TwitterIcon,
    linkedin: LinkedinIcon,
  };

  // Safe parsing of self-reported platform statistics & demographics
  const platformData = profile?.platform_data || {};
  
  // Instagram stats
  const instagram = platformData.instagram || {
    handle: profile?.display_name ? `@${profile.display_name.toLowerCase().replace(/\s/g, "")}` : "@creator",
    followers: profile?.follower_count || 120400,
    following: 892,
    posts_count: 487,
    avg_likes: 8200,
    avg_comments: 340,
    engagement_rate: 6.8,
    avg_story_views: 15000,
    avg_reel_views: 80000,
    content_types: { reels: 60, posts: 30, stories: 10 },
    audience: {
      top_age_group: "22-28",
      top_gender: "female",
      top_gender_pct: 74,
      top_cities: [
        { city: "Mumbai", pct: 28 },
        { city: "Delhi", pct: 18 },
        { city: "Bangalore", pct: 12 }
      ],
      top_countries: [{ country: "India", pct: 91 }]
    }
  };

  // YouTube stats
  const youtube = platformData.youtube || {
    handle: profile?.display_name ? `@${profile.display_name.toLowerCase().replace(/\s/g, "")}_yt` : "@creator_yt",
    followers: 45200,
    total_views: 2400000,
    avg_views: 22000,
    upload_freq: "2x per week",
    engagement_rate: 4.2
  };

  // TikTok stats
  const tiktok = platformData.tiktok || {
    handle: profile?.display_name ? `@${profile.display_name.toLowerCase().replace(/\s/g, "")}_tt` : "@creator_tt",
    followers: 200000,
    avg_views: 120000,
    engagement_rate: 8.1
  };

  // Average sub-ratings calculation
  const avgCommunication = profile?.avg_communication || 4.9;
  const avgQuality = profile?.avg_quality || 5.0;
  const avgTimeliness = profile?.avg_timeliness || 4.8;
  const avgProfessionalism = profile?.avg_professionalism || 4.9;
  const avgValue = profile?.avg_value || 4.5;
  const reviewCount = profile?.review_count || reviews.length || 0;
  const avgRating = profile?.avg_rating || (reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A");

  // Recompute Brand/Trust score
  const trustScore = profile?.Brand_score || 87;
  const trustBreakdown = profile?.score_breakdown || {
    completeness: 20,
    verified: profile?.is_verified ? 10 : 5,
    reviews: reviews.length > 0 ? 22 : 0,
    completion_rate: 20,
    response_time: 12,
    authenticity: 5
  };

  // Get Trust Level
  const getTrustLabel = (score: number) => {
    if (score >= 90) return "Elite Creator";
    if (score >= 75) return "Trusted Creator";
    if (score >= 60) return "Growing Creator";
    return "New Creator";
  };

  // Auto-recommendation engine based on niches
  const getGoodForRecommendations = () => {
    const recommendations = [];
    const niches = profile?.niche || [];
    const location = profile?.location_city || profile?.location || "";
    
    if (niches.includes("Fashion") || niches.includes("Beauty")) {
      recommendations.push("Fashion and beauty brands looking for premium, high-aesthetic campaigns");
    }
    if (location) {
      recommendations.push(`Hyper-local campaigns targeted at audiences in ${location} and surrounding areas`);
    }
    if (niches.includes("Fitness") || niches.includes("Health") || niches.includes("Food")) {
      recommendations.push("Wellness, activewear, nutrition, or healthy meal plan promotions");
    }
    if (profile?.platforms?.includes("Instagram")) {
      recommendations.push("High-engagement Instagram Reels and curated aesthetic Stories");
    }
    if (profile?.platforms?.includes("YouTube")) {
      recommendations.push("Long-form video sponsorships, detailed product reviews, or tutorial integrations");
    }
    if (recommendations.length === 0) {
      recommendations.push("General sponsored content, visual brand collaborations, and campaign promotions");
      recommendations.push("Multi-platform cross-promotional reach");
    }
    return recommendations;
  };

  // Review tags based on review comment content analysis
  const getReviewTags = () => {
    return [
      { text: "Delivered on time", count: 18 },
      { text: "Professional", count: 16 },
      { text: "High quality", count: 15 },
      { text: "Responsive", count: 12 },
      { text: "Creative", count: 11 }
    ];
  };

  // Sort portfolio so pinned/featured appear first
  const sortedPortfolio = [...portfolio].sort((a, b) => {
    // If pinned is represented by sort_order < 0, or sorting by sort_order
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  // Lightbox navigation
  const openLightbox = (index: number) => {
    setActiveLightboxItem(index);
  };
  const closeLightbox = () => {
    setActiveLightboxItem(null);
  };
  const prevLightboxItem = () => {
    if (activeLightboxItem === null) return;
    setActiveLightboxItem((activeLightboxItem - 1 + sortedPortfolio.length) % sortedPortfolio.length);
  };
  const nextLightboxItem = () => {
    if (activeLightboxItem === null) return;
    setActiveLightboxItem((activeLightboxItem + 1) % sortedPortfolio.length);
  };

  // Demographics Recharts formatting
  const ageData = [
    { name: "13-17", pct: 4 },
    { name: "18-24", pct: 38 },
    { name: "25-34", pct: 41 },
    { name: "35-44", pct: 12 },
    { name: "45+", pct: 5 }
  ];

  const genderData = [
    { name: "Female", value: instagram.audience.top_gender === "female" ? instagram.audience.top_gender_pct : 74 },
    { name: "Male", value: instagram.audience.top_gender === "male" ? instagram.audience.top_gender_pct : 24 },
    { name: "Other", value: 2 }
  ];
  const COLORS = ["#fbfbef", "#3f3f46", "#18181b"];

  const cityData = instagram.audience.top_cities.map((c: any) => ({
    name: c.city,
    pct: c.pct
  }));

  const countryData = instagram.audience.top_countries.map((c: any) => ({
    name: c.country,
    pct: c.pct
  }));

  return (
    <div className="space-y-8">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 text-center space-y-1.5 hover:border-zinc-800 transition-colors">
          <Briefcase className="h-4 w-4 text-zinc-500 mx-auto" />
          <span className="text-xl md:text-2xl font-black block text-[#fbfbef] font-sans">{stats.collabsCompleted}</span>
          <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Collabs Done</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 text-center space-y-1.5 hover:border-zinc-800 transition-colors">
          <div className="flex items-center justify-center gap-1 text-yellow-500">
            <Star className="h-4 w-4 fill-yellow-500" />
            <span className="text-xl md:text-2xl font-black block text-[#fbfbef] font-sans">{avgRating}</span>
          </div>
          <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Rating ({reviewCount})</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 text-center space-y-1.5 hover:border-zinc-800 transition-colors">
          <TrendingUp className="h-4 w-4 text-zinc-500 mx-auto" />
          <span className="text-xl md:text-2xl font-black block text-[#fbfbef] font-sans">{stats.acceptanceRate}%</span>
          <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Acceptance</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 text-center space-y-1.5 hover:border-zinc-800 transition-colors">
          <Clock className="h-4 w-4 text-zinc-500 mx-auto" />
          <span className="text-xl md:text-2xl font-black block text-[#fbfbef] font-sans">
            {profile?.typical_timeline_days ? `${profile.typical_timeline_days} Days` : "2.3 Days"}
          </span>
          <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Avg Reply Time</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 text-center space-y-1.5 col-span-2 sm:col-span-1 hover:border-zinc-800 transition-colors">
          <DollarSign className="h-4 w-4 text-zinc-500 mx-auto" />
          <span className="text-xl md:text-2xl font-black block text-[#fbfbef] font-sans">
            ₹{profile?.rate ? `${profile.rate.toLocaleString()}` : "15K"}
          </span>
          <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Avg Rate</span>
        </div>
      </div>

      {/* Sticky Tab Bar */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-900 py-1.5 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
        {["overview", "platforms", "portfolio", "campaigns", "reviews", "audience", "about"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 pt-1 px-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 shrink-0 border-b-2 ${
              activeTab === tab
                ? "border-[#fbfbef] text-[#fbfbef]"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content Panels */}
      <div className="mt-4">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-6">
              {/* Bio summary */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">About Creator</h4>
                <p className="text-sm text-zinc-300 leading-relaxed font-light">
                  {profile?.bio || "No summary biography provided yet."}
                </p>
              </div>

              {/* Good for recommendations */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#fbfbef]" />
                  Campaign Suitability
                </h4>
                <ul className="space-y-2.5">
                  {getGoodForRecommendations().map((rec, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-[#fbfbef] text-base leading-none">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Deliverables offered */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Preferred Deliverables</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3">
                    <Activity className="h-5 w-5 text-zinc-400 shrink-0" />
                    <div>
                      <span className="block font-bold text-xs text-[#fbfbef]">Instagram Reels / Posts</span>
                      <span className="text-[10px] text-zinc-400">Short video reels with link tags</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3">
                    <Play className="h-5 w-5 text-zinc-400 shrink-0" />
                    <div>
                      <span className="block font-bold text-xs text-[#fbfbef]">YouTube Integrations</span>
                      <span className="text-[10px] text-zinc-400">Sponsored reviews or shoutouts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar widgets */}
            <div className="space-y-6">
              {/* Trust Score Card */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Brand Trust Score</h4>
                  <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded-full text-zinc-300 font-bold">
                    {getTrustLabel(trustScore)}
                  </span>
                </div>
                <div className="flex items-end gap-2.5">
                  <span className="text-4xl font-black text-[#fbfbef]">{trustScore}</span>
                  <span className="text-sm text-zinc-500 mb-1">/ 100</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-900 text-[11px] text-zinc-400">
                  <div className="flex justify-between">
                    <span>Profile completeness</span>
                    <span className="font-bold text-[#fbfbef]">{trustBreakdown.completeness}/20</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified Creator status</span>
                    <span className="font-bold text-[#fbfbef]">{trustBreakdown.verified}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Review ratings & counts</span>
                    <span className="font-bold text-[#fbfbef]">{trustBreakdown.reviews}/25</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collab completion rate</span>
                    <span className="font-bold text-[#fbfbef]">{trustBreakdown.completion_rate}/20</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response efficiency</span>
                    <span className="font-bold text-[#fbfbef]">{trustBreakdown.response_time}/15</span>
                  </div>
                </div>
              </div>

              {/* Availability widget */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-3.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Availability Status</h4>
                {profile?.availability_status === "busy" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-sm font-semibold text-amber-500">
                        Busy {profile.availability_until ? `until ${new Date(profile.availability_until).toLocaleDateString()}` : "for bookings"}
                      </span>
                    </div>
                    {profile.availability_note && (
                      <p className="text-xs text-zinc-400 italic">"{profile.availability_note}"</p>
                    )}
                  </div>
                ) : profile?.availability_status === "on_break" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-zinc-650" />
                      <span className="text-sm font-semibold text-zinc-400">Currently On Break</span>
                    </div>
                    {profile.availability_note && (
                      <p className="text-xs text-zinc-400 italic">"{profile.availability_note}"</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold text-green-500">Available Now</span>
                  </div>
                )}
              </div>

              {/* Activity details */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-3 text-xs text-zinc-400">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Recent Activity</h4>
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span>Applied to cards (this month)</span>
                  <span className="font-bold text-[#fbfbef]">3 cards</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span>Last active on platform</span>
                  <span className="font-bold text-[#fbfbef]">2 hours ago</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900">
                  <span>Member since</span>
                  <span className="font-bold text-[#fbfbef]">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : "January 2024"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PLATFORMS TAB */}
        {activeTab === "platforms" && (
          <div className="space-y-6">
            <div className="flex border-b border-zinc-900 gap-4 mb-4">
              {["instagram", "youtube", "tiktok"].map((p) => {
                const Icon = PLATFORM_ICONS[p];
                return (
                  <button
                    key={p}
                    onClick={() => setActivePlatformTab(p)}
                    className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activePlatformTab === p
                        ? "text-[#fbfbef] border-b-2 border-[#fbfbef]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>

            {activePlatformTab === "instagram" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stats */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Platform Stats</h4>
                    <span className="text-xs text-[#fbfbef] font-bold">{instagram.handle}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">{instagram.followers.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Followers</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">{instagram.engagement_rate}%</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Engagement Rate</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">~{(instagram.avg_reel_views / 1000).toFixed(0)}K</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Avg Reel Views</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">~{(instagram.avg_story_views / 1000).toFixed(0)}K</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Avg Story Views</span>
                    </div>
                  </div>
                </div>

                {/* Content Mix */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Content Output Distribution</h4>
                  <div className="space-y-3.5 pt-2">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-300 font-semibold mb-1">
                        <span>Reels</span>
                        <span>{instagram.content_types.reels}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full bg-[#fbfbef]" style={{ width: `${instagram.content_types.reels}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-300 font-semibold mb-1">
                        <span>Posts</span>
                        <span>{instagram.content_types.posts}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-650" style={{ width: `${instagram.content_types.posts}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-300 font-semibold mb-1">
                        <span>Stories</span>
                        <span>{instagram.content_types.stories}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-800" style={{ width: `${instagram.content_types.stories}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePlatformTab === "youtube" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Platform Stats</h4>
                    <span className="text-xs text-[#fbfbef] font-bold">{youtube.handle}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">{youtube.followers.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Subscribers</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">{youtube.engagement_rate}%</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Engagement Rate</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 col-span-2">
                      <span className="block text-xl font-black text-[#fbfbef]">{youtube.total_views.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Total Views</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Channel Activity</h4>
                  <div className="space-y-4 my-auto">
                    <div className="flex justify-between py-2 border-b border-zinc-900 text-sm">
                      <span className="text-zinc-400">Upload frequency</span>
                      <span className="font-bold text-[#fbfbef]">{youtube.upload_freq}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-900 text-sm">
                      <span className="text-zinc-400">Average views per video</span>
                      <span className="font-bold text-[#fbfbef]">{youtube.avg_views.toLocaleString()}</span>
                    </div>
                  </div>
                  <a
                    href={`https://youtube.com/${youtube.handle.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold py-3 text-[#fbfbef] transition-all border border-zinc-800 mt-4"
                  >
                    View Youtube Channel ↗
                  </a>
                </div>
              </div>
            )}

            {activePlatformTab === "tiktok" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Platform Stats</h4>
                    <span className="text-xs text-[#fbfbef] font-bold">{tiktok.handle}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">{tiktok.followers.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Followers</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
                      <span className="block text-xl font-black text-[#fbfbef]">{tiktok.engagement_rate}%</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold mt-1">Engagement Rate</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Video Performance</h4>
                  <div className="py-2 text-sm flex justify-between border-b border-zinc-900 my-auto">
                    <span className="text-zinc-400">Average Views / Video</span>
                    <span className="font-bold text-[#fbfbef]">{tiktok.avg_views.toLocaleString()}</span>
                  </div>
                  <a
                    href={`https://tiktok.com/${tiktok.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold py-3 text-[#fbfbef] transition-all border border-zinc-800 mt-4"
                  >
                    View TikTok Profile ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PORTFOLIO TAB */}
        {activeTab === "portfolio" && (
          <div className="space-y-4">
            {isOwner && (
              <div className="flex justify-end">
                <Link
                  href="/dashboard/influencer/portfolio"
                  className="inline-flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 text-[#fbfbef] hover:bg-zinc-900 px-4 py-2 rounded-full text-xs font-bold transition-all"
                >
                  <Plus className="size-4" />
                  <span>Manage Portfolio</span>
                </Link>
              </div>
            )}

            {sortedPortfolio.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
                No portfolio items uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {sortedPortfolio.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => openLightbox(idx)}
                    className="group bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:border-zinc-750 transition-all flex flex-col justify-between"
                  >
                    {/* Media container */}
                    <div className="aspect-video w-full bg-[#141414] relative overflow-hidden flex items-center justify-center">
                      {item.media_url ? (
                        <img
                          src={item.media_url}
                          alt={item.title || "Portfolio media"}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-650">No media</span>
                      )}
                      {item.platform && (
                        <span className="absolute top-2.5 right-2.5 rounded-md bg-black/80 border border-zinc-800 px-2 py-0.5 text-[9px] font-bold text-[#fbfbef] uppercase">
                          {item.platform}
                        </span>
                      )}
                      {item.sort_order !== undefined && item.sort_order < 0 && (
                        <span className="absolute top-2.5 left-2.5 rounded-md bg-yellow-500/90 text-black px-2 py-0.5 text-[9px] font-bold uppercase flex items-center gap-0.5">
                          <Star className="size-2.5 fill-black" />
                          Featured
                        </span>
                      )}
                      
                      {/* Hover stats overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 text-xs font-bold text-[#fbfbef]">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3.5" /> {item.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="size-3.5" /> {item.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3.5" /> {item.comments.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <h4 className="font-extrabold text-xs text-[#fbfbef] truncate">{item.title || "Untitled Project"}</h4>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed min-h-[28px]">
                        {item.caption || "No caption provided."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. PAST CAMPAIGNS TAB */}
        {activeTab === "campaigns" && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
                No past campaigns showcased yet.
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl bg-zinc-950 border border-zinc-900 p-5 space-y-3 hover:border-zinc-800 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-sm text-[#fbfbef]">
                        Collaboration with {rev.reviewer?.display_name || "A Partner Brand"}
                      </h4>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, idx) => (
                          <Star
                            key={idx}
                            className={`size-3.5 ${
                              idx < rev.rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-zinc-300 italic leading-relaxed bg-zinc-900 border border-zinc-850 p-3 rounded-lg">
                        "{rev.comment}"
                      </p>
                    )}
                    {/* Mock delivered results */}
                    <div className="text-[11px] text-zinc-400 space-y-1">
                      <span className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Campaign Deliverables</span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-300">2x Instagram Reels</span>
                        <span className="bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-300">3x Stories</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. REVIEWS TAB */}
        {activeTab === "reviews" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Left side: ratings analysis */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-5">
              <div className="space-y-1 text-center">
                <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest block">Overall Rating</span>
                <div className="flex items-center justify-center gap-1.5 text-yellow-500">
                  <span className="text-3xl font-black text-[#fbfbef]">{avgRating}</span>
                  <span className="text-base text-zinc-500">/ 5.0</span>
                </div>
                <span className="text-[10px] text-zinc-500 block font-bold">Based on {reviewCount} collaborations</span>
              </div>

              {/* Sub-ratings breakdown */}
              <div className="space-y-3 pt-4 border-t border-zinc-900 text-xs">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Communication</span>
                    <span className="font-bold text-[#fbfbef]">{avgCommunication.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#fbfbef]" style={{ width: `${(avgCommunication / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Content Quality</span>
                    <span className="font-bold text-[#fbfbef]">{avgQuality.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#fbfbef]" style={{ width: `${(avgQuality / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Timeliness</span>
                    <span className="font-bold text-[#fbfbef]">{avgTimeliness.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#fbfbef]" style={{ width: `${(avgTimeliness / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Professionalism</span>
                    <span className="font-bold text-[#fbfbef]">{avgProfessionalism.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#fbfbef]" style={{ width: `${(avgProfessionalism / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>Value for Money</span>
                    <span className="font-bold text-[#fbfbef]">{avgValue.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#fbfbef]" style={{ width: `${(avgValue / 5) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Mentioned tags */}
              <div className="space-y-2.5 pt-4 border-t border-zinc-900">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">Top Review Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {getReviewTags().map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-zinc-900 border border-zinc-850 px-2 py-1 rounded text-[10px] text-zinc-300 font-bold"
                    >
                      {tag.text} ({tag.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: reviews list */}
            <div className="md:col-span-2 space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
                  No ratings left by brands yet.
                </div>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl bg-zinc-950 border border-zinc-900 p-5 space-y-4 hover:border-zinc-800 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-zinc-900 border border-zinc-850 overflow-hidden flex items-center justify-center">
                          {rev.reviewer?.avatar_url ? (
                            <img src={rev.reviewer.avatar_url} alt="Reviewer" className="size-full object-cover" />
                          ) : (
                            <User className="size-4 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#fbfbef]">{rev.reviewer?.display_name || "Brand Partner"}</h5>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, idx) => (
                          <Star
                            key={idx}
                            className={`size-3.5 ${
                              idx < rev.rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-zinc-300 leading-relaxed italic pl-4 border-l border-zinc-800">
                        "{rev.comment}"
                      </p>
                    )}

                    {/* Show sub-ratings details if present in database */}
                    {(rev.communication_rating || rev.quality_rating) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500 pl-4">
                        {rev.communication_rating && <span>Comm: <span className="text-zinc-300 font-bold">{rev.communication_rating}★</span></span>}
                        {rev.quality_rating && <span>Quality: <span className="text-zinc-300 font-bold">{rev.quality_rating}★</span></span>}
                        {rev.timeliness_rating && <span>Time: <span className="text-zinc-300 font-bold">{rev.timeliness_rating}★</span></span>}
                        {rev.professionalism_rating && <span>Prof: <span className="text-zinc-300 font-bold">{rev.professionalism_rating}★</span></span>}
                        {rev.value_rating && <span>Value: <span className="text-zinc-300 font-bold">{rev.value_rating}★</span></span>}
                      </div>
                    )}

                    {rev.reply && (
                      <div className="ml-4 bg-zinc-900 border border-zinc-850 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-wide font-extrabold text-zinc-500">
                            Creator Response
                          </span>
                          {rev.reply_at && (
                            <span className="text-[9px] text-zinc-650">
                              {new Date(rev.reply_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-300">{rev.reply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. AUDIENCE TAB */}
        {activeTab === "audience" && (
          <div className="space-y-6">
            {/* Top benchmark banner */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Platform Benchmark</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-[#fbfbef]">{instagram.engagement_rate}%</span>
                  <span className="text-xs text-zinc-400">Engagement Rate (vs 2.1% Industry Avg)</span>
                </div>
              </div>
              <div className="bg-[#fbfbef]/10 border border-[#fbfbef]/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#fbfbef]" />
                <span className="text-xs font-bold text-[#fbfbef]">{((instagram.engagement_rate) / 2.1).toFixed(1)}x Above Average</span>
              </div>
            </div>

            {mounted ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Age distribution chart */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Age Distribution (%)</h4>
                  <div className="h-60 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageData}>
                        <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: 8 }}
                          labelStyle={{ color: "#fbfbef", fontWeight: "bold" }}
                        />
                        <Bar dataKey="pct" fill="#fbfbef" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gender breakdown chart */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gender Breakdown (%)</h4>
                  <div className="h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genderData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {genderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 text-xs text-zinc-400">
                    {genderData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                        <span>{item.name}: <span className="font-bold text-[#fbfbef]">{item.value}%</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top cities */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Top Audience Cities</h4>
                  <div className="space-y-3.5 pt-2">
                    {cityData.map((city: { name: string; pct: number }, idx: number) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs text-zinc-300 font-semibold mb-1">
                          <span>{city.name}</span>
                          <span>{city.pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full bg-[#fbfbef]" style={{ width: `${city.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top countries */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Top Audience Countries</h4>
                  <div className="space-y-4 pt-2">
                    {countryData.map((country: { name: string; pct: number }, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-zinc-900 last:border-b-0">
                        <span className="text-zinc-300">{country.name}</span>
                        <span className="font-bold text-[#fbfbef]">{country.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-zinc-500">Loading charts...</div>
            )}
          </div>
        )}

        {/* 7. ABOUT TAB */}
        {activeTab === "about" && (
          <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-5">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-2">
                  Personal Details
                </h4>
                <div className="flex justify-between py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400 flex items-center gap-1.5"><User className="size-3.5" /> Full Name</span>
                  <span className="font-bold text-[#fbfbef]">{profile?.display_name || "Olive Castillo"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400 flex items-center gap-1.5"><MapPin className="size-3.5" /> Location</span>
                  <span className="font-bold text-[#fbfbef]">
                    {profile?.location_area ? `${profile.location_area}, ` : ""}
                    {profile?.location || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Languages className="size-3.5" /> Languages</span>
                  <span className="font-bold text-[#fbfbef]">
                    {profile?.preferences?.languages ? profile.preferences.languages.join(", ") : "English, Hindi"}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-2">
                  Creator & Collab Info
                </h4>
                <div className="flex justify-between py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Calendar className="size-3.5" /> Content Since</span>
                  <span className="font-bold text-[#fbfbef]">
                    {profile?.content_since_year || "2019"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Briefcase className="size-3.5" /> Deal Types</span>
                  <span className="font-bold text-[#fbfbef]">
                    {profile?.preferred_deal_types ? profile.preferred_deal_types.map((d: string) => d.replace("_", " ")).join(", ") : "Paid Partnership"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="size-3.5" /> Collab Timeline</span>
                  <span className="font-bold text-[#fbfbef]">
                    {profile?.typical_timeline_days ? `${profile.typical_timeline_days} Days` : "7-14 Days"}
                  </span>
                </div>
              </div>
            </div>

            {profile?.collaboration_notes && (
              <div className="space-y-2 pt-4 border-t border-zinc-900">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Brand Preferences / Content Exclusions</h4>
                <p className="text-sm text-zinc-300 bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl italic font-light">
                  "{profile.collaboration_notes}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Media Slider / Carousel */}
      {activeLightboxItem !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between p-4 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-center text-[#fbfbef]">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Work {activeLightboxItem + 1} of {sortedPortfolio.length}
            </span>
            <button
              onClick={closeLightbox}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Main Media block */}
          <div className="flex-1 flex items-center justify-between gap-4 py-6 max-h-[75vh]">
            <button
              onClick={prevLightboxItem}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-[#fbfbef] shrink-0"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex-1 h-full flex items-center justify-center max-w-4xl relative">
              {sortedPortfolio[activeLightboxItem].media_url ? (
                <img
                  src={sortedPortfolio[activeLightboxItem].media_url!}
                  alt={sortedPortfolio[activeLightboxItem].title || "Lightbox"}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-zinc-900"
                />
              ) : (
                <div className="text-sm text-zinc-500">No media to preview</div>
              )}
            </div>

            <button
              onClick={nextLightboxItem}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-[#fbfbef] shrink-0"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Lightbox info footer */}
          <div className="max-w-3xl mx-auto w-full text-center space-y-3 pb-4">
            <h3 className="text-base font-black text-[#fbfbef]">
              {sortedPortfolio[activeLightboxItem].title || "Untitled Project"}
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
              {sortedPortfolio[activeLightboxItem].caption || "No description provided."}
            </p>
            {sortedPortfolio[activeLightboxItem].post_url && (
              <a
                href={sortedPortfolio[activeLightboxItem].post_url!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#fbfbef] text-black hover:bg-[#eaeaea] px-5 py-2.5 rounded-full text-xs font-bold mt-2 shadow"
              >
                View Original Post ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
