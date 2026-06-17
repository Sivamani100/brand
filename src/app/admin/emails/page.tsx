"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Mail, Edit2, Save, Plus, ArrowRight, FileCode } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  variables: string[];
  updated_at: string;
}

export default function EmailTemplatesPage() {
  const supabase = createClient() as any;
  const { profile } = useUser();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Form states
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [name, setName] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
    setSubject(tpl.subject);
    setHtmlBody(tpl.html_body);
    setName(tpl.name);
    setVariables(tpl.variables || []);
    setIsCreating(false);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);

      if (data && data.length > 0 && !selectedTemplate) {
        handleSelectTemplate(data[0]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch email templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateNewClick = () => {
    setSelectedTemplate(null);
    setSubject("");
    setHtmlBody("<p>Dear {{user_name}},</p>\n<p>Your content here.</p>");
    setName("");
    setVariables(["user_name"]);
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      if (isCreating) {
        const { error } = await supabase.from("email_templates").insert({
          name: name.trim().toLowerCase().replace(/\s+/g, "_"),
          subject: subject.trim(),
          html_body: htmlBody.trim(),
          variables,
          updated_by: profile?.id,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Log audit trail
        await supabase.from("audit_logs").insert({
          actor_id: profile?.id,
          actor_role: "admin",
          action: "email_template_create",
          target_type: "email_templates",
          metadata: { name },
        });

        toast.success("Template created successfully");
      } else {
        if (!selectedTemplate) return;

        const { error } = await supabase
          .from("email_templates")
          .update({
            subject: subject.trim(),
            html_body: htmlBody.trim(),
            variables,
            updated_by: profile?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedTemplate.id);

        if (error) throw error;

        // Log audit trail
        await supabase.from("audit_logs").insert({
          actor_id: profile?.id,
          actor_role: "admin",
          action: "email_template_update",
          target_type: "email_templates",
          target_id: selectedTemplate.id,
          metadata: { name: selectedTemplate.name },
        });

        toast.success("Template saved successfully");
      }

      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    }
  };

  return (
    <div className="space-y-8 text-[#fbfbef]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(251,251,239,0.1)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Email Templates</h1>
          <p className="text-sm text-[rgba(251,251,239,0.6)]">
            Manage HTML templates sent by automated system triggers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/emails/broadcast"
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1c1c1c] text-[#fbfbef] border border-[rgba(251,251,239,0.15)] rounded-full px-5 py-2.5 text-xs font-bold transition-all"
          >
            <span>Broadcast Campaigns</span>
            <ArrowRight className="size-4" />
          </Link>
          <button
            onClick={handleCreateNewClick}
            className="flex items-center gap-2 bg-[#fbfbef] hover:bg-[rgba(251,251,239,0.9)] text-black rounded-full px-5 py-2.5 text-xs font-bold transition-all"
          >
            <Plus className="size-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Template Sidebar List */}
          <div className="lg:col-span-1 space-y-3 bg-[#0d0d0d] p-5 rounded-2xl border border-[rgba(251,251,239,0.1)] h-fit">
            <h2 className="text-xs font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider mb-4">Templates</h2>
            {templates.length === 0 ? (
              <p className="text-xs text-[rgba(251,251,239,0.4)] italic">No templates defined yet.</p>
            ) : (
              templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl border transition-all ${
                    selectedTemplate?.id === tpl.id && !isCreating
                      ? "bg-[#1c1c1c] border-[#fbfbef] text-[#fbfbef]"
                      : "bg-[#141414] border-[rgba(251,251,239,0.08)] text-[rgba(251,251,239,0.7)] hover:bg-[#1a1a1a] hover:text-[#fbfbef]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs font-mono">{tpl.name}</div>
                    <div className="text-[11px] text-[rgba(251,251,239,0.5)] truncate max-w-[180px]">{tpl.subject}</div>
                  </div>
                  <Mail className="size-4 text-[rgba(251,251,239,0.3)]" />
                </button>
              ))
            )}
          </div>

          {/* Template Editor Form */}
          <div className="lg:col-span-2 bg-[#0d0d0d] p-6 rounded-2xl border border-[rgba(251,251,239,0.1)]">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider border-b border-[rgba(251,251,239,0.08)] pb-3">
                <Edit2 className="size-4" />
                <span>{isCreating ? "Create New Template" : `Edit Template: ${selectedTemplate?.name}`}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">Template Name (Identifier)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isCreating}
                    placeholder="e.g. welcome_brand"
                    className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-2.5 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none disabled:opacity-50 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">Supported Variables (comma-separated)</label>
                  <input
                    type="text"
                    value={variables.join(", ")}
                    onChange={(e) => setVariables(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    placeholder="e.g. user_name, action_url"
                    className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-2.5 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Welcome to our platform!"
                  required
                  className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-2.5 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">HTML Body</label>
                  <span className="text-[10px] text-[rgba(251,251,239,0.4)] flex items-center gap-1 font-mono">
                    <FileCode className="size-3" />
                    HTML tags are supported
                  </span>
                </div>
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  rows={12}
                  required
                  className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl p-4 text-xs font-mono text-[#fbfbef] focus:border-[#fbfbef] outline-none"
                />
              </div>

              {/* Variable Tokens Helper Box */}
              {variables.length > 0 && (
                <div className="p-4 bg-[#141414] border border-[rgba(251,251,239,0.08)] rounded-xl">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[rgba(251,251,239,0.5)] mb-2">Available Replacement Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((v) => (
                      <span key={v} className="bg-black/60 px-2.5 py-1 rounded text-[10px] text-yellow-500 border border-yellow-500/20 font-mono">
                        {"{{"}
                        {v}
                        {"}}"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#fbfbef] hover:bg-[rgba(251,251,239,0.9)] text-black rounded-xl py-3 text-xs font-bold transition-all shadow-md"
              >
                <Save className="size-4" />
                <span>{isCreating ? "Create Template" : "Save Changes"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
