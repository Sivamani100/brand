"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface FAQ {
  q: string;
  a: string;
  category: string;
}

const FAQS: FAQ[] = [
  {
    q: "How do I create a collaboration card?",
    a: "Brands can create a card by going to the Dashboard, clicking 'Create Card', and filling out the campaign details, budget, niche tags, and requirements.",
    category: "Cards",
  },
  {
    q: "How do I apply for a collaboration card?",
    a: "Influencers can browse open cards, select a card of interest, and click 'Apply'. The two-step application process captures their proposed deliverables and budget.",
    category: "Applications",
  },
  {
    q: "How does the chat system work?",
    a: "Once a brand accepts an influencer's application, a chat room is created. Both parties can discuss campaign details, share media attachments, and track milestone progress.",
    category: "Chat",
  },
  {
    q: "What is the dispute process?",
    a: "If there is a disagreement regarding milestones or content quality, either party can click 'Raise Dispute' in the chat settings. A platform admin will step in to mediate.",
    category: "Safety",
  },
  {
    q: "How do I toggle dark/light theme?",
    a: "You can toggle the theme by clicking the Sun/Moon icon in the sidebar (desktop) or in the top header (mobile). Your preference is saved to your account.",
    category: "Account",
  },
  {
    q: "Is my personal data protected?",
    a: "Yes. Brand is fully GDPR-compliant. You can view, download a JSON export, or request permanent deletion of your data from your account privacy settings.",
    category: "Privacy",
  },
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<"faq" | "create" | "tickets">("faq");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>(FAQS);

  // Ticket Form States
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("account");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tickets List States
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const supabase = createClient() as any;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "tickets" || tab === "create" || tab === "faq") {
        setActiveTab(tab as any);
      }
    }
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredFaqs(FAQS);
    } else {
      setFilteredFaqs(
        FAQS.filter(
          (faq) =>
            faq.q.toLowerCase().includes(query) ||
            faq.a.toLowerCase().includes(query) ||
            faq.category.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery]);

  const fetchUserTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === "tickets") {
      fetchUserTickets();
    }
  }, [activeTab]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subject || !description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.from("support_tickets").insert({
        user_id: user?.id || null,
        email,
        category,
        subject,
        description,
        status: "open",
        priority: "normal",
      }).select().single();

      if (error) throw error;

      // Log ticket creation in audit log if user is logged in
      if (user) {
        await supabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "support.ticket_created",
          metadata: { ticket_id: data.id, ticket_number: data.ticket_number },
        });
      }

      toast.success(`Ticket ${data.ticket_number} created successfully!`);
      setSubject("");
      setDescription("");
      setActiveTab("tickets");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8 min-h-screen bg-black text-[var(--color-text-primary)]">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          Help & Support Center
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Find FAQs or open a support ticket to talk to our team.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-[var(--color-border)]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("faq")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "faq"
                ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            FAQs
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "create"
                ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Create a Ticket
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "tickets"
                ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            My Tickets
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "faq" && (
        <div className="space-y-6">
          <input
            type="text"
            className="w-full rounded-full bg-[#0d0d0d] border border-[var(--color-border)] px-5 py-3.5 text-sm outline-none input-focus-animate"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {filteredFaqs.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] col-span-2 text-center py-6 italic">
                No matching articles found.
              </p>
            ) : (
              filteredFaqs.map((faq, index) => (
                <div
                  key={index}
                  className="p-5 border border-[var(--color-border)] bg-[#0d0d0d] rounded-xl space-y-2"
                >
                  <span className="text-[10px] font-bold text-[rgba(251,251,239,0.4)] uppercase tracking-wider block">
                    {faq.category}
                  </span>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    {faq.q}
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <form onSubmit={handleSubmitTicket} className="max-w-xl mx-auto space-y-5 bg-[#0d0d0d] p-8 rounded-2xl border border-[var(--color-border)]">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@domain.com"
              className="w-full bg-[#141414] border border-[var(--color-border)] rounded-full px-4 py-3 text-xs outline-none input-focus-animate"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#141414] border border-[var(--color-border)] rounded-full px-4 py-3 text-xs outline-none appearance-none"
            >
              <option value="account">Account Setup</option>
              <option value="card">Campaign Cards</option>
              <option value="application">Applications</option>
              <option value="chat">Chat & Collaboration</option>
              <option value="billing">Billing & Fees</option>
              <option value="bug">Technical Issue / Bug</option>
              <option value="safety">Safety or Appeal</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
              Subject
            </label>
            <input
              type="text"
              required
              placeholder="Summary of the issue..."
              className="w-full bg-[#141414] border border-[var(--color-border)] rounded-full px-4 py-3 text-xs outline-none input-focus-animate"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
              Description
            </label>
            <textarea
              rows={5}
              required
              placeholder="Detail your request or issue..."
              className="w-full bg-[#141414] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-xs outline-none input-focus-animate"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--color-accent)] text-[var(--color-invert-text)] font-semibold text-xs py-3.5 rounded-full hover:opacity-90 transition-all scale-active cursor-pointer"
          >
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </form>
      )}

      {activeTab === "tickets" && (
        <div className="space-y-4">
          {loadingTickets ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-16 bg-[#0d0d0d] rounded-xl border border-[var(--color-border)]" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 border border-[var(--color-border)] bg-[#0d0d0d] rounded-2xl">
              <p className="text-xs text-[var(--color-text-muted)] italic">
                You haven&apos;t created any support tickets yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <a
                  href={`/support/my-tickets/${t.id}`}
                  key={t.id}
                  className="block p-5 border border-[var(--color-border)] bg-[#0d0d0d] hover:bg-[#141414] rounded-xl transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                        {t.ticket_number}: {t.subject}
                      </h4>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-semibold uppercase">
                        Category: {t.category} • Created: {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full capitalize ${
                        t.status === "open"
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : t.status === "resolved"
                          ? "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
