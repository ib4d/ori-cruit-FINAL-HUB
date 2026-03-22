import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ShieldCheck, Search, Bell, LayoutDashboard, Download, Users, Settings, HelpCircle, MessageSquare, Link as LinkIcon, Verified, Trash2, CheckCircle2, Loader2, ChevronRight, X, Menu, Gavel } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import React, { useEffect, useState, useCallback } from "react";
import { socket } from "@/src/lib/socket";
import { Sparkles } from "lucide-react";

export default function Workspace() {
  const queryClient = useQueryClient();
  const [urlId, setUrlId] = useState<string | null>(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('?id=')) {
        setUrlId(hash.split('?id=')[1]);
      } else {
        setUrlId(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const { data: candidates, isLoading: isCandidatesLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const activeId = urlId || (candidates && candidates.length > 0 ? candidates[0].id : null);

  const { data: candidate, isLoading: isCandidateLoading } = useQuery({
    queryKey: ['candidate', activeId],
    queryFn: async () => {
      if (!activeId) return null;
      const res = await fetch(`/api/candidates/${activeId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!activeId
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!activeId) return;
      const res = await fetch(`/api/candidates/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update candidate');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', activeId] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    }
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async () => {
      if (!activeId) return;
      const res = await fetch(`/api/candidates/${activeId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete candidate');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      window.location.hash = 'pipeline';
    }
  });

  useEffect(() => {
    const unsubscribe = socket.on("CANDIDATE_UPDATED", (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      if (updated.id === activeId) {
        if (updated.deleted) {
          window.location.hash = 'pipeline';
        } else {
          queryClient.invalidateQueries({ queryKey: ['candidate', activeId] });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    });
    return unsubscribe;
  }, [queryClient, activeId]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    updateCandidateMutation.mutate({ [field]: value });
  }, [updateCandidateMutation]);

  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      if (!activeId) return;
      
      const res = await fetch(`/api/candidates/${activeId}/reanalyze`, {
        method: 'POST'
      });
      
      if (!res.ok) throw new Error('Failed to update after re-analysis');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', activeId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    }
  });

  const [newNote, setNewNote] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!candidate) return;
      const res = await fetch(`/api/candidates/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcripts: [
            ...candidate.transcripts,
            {
              id: crypto.randomUUID(),
              sender: 'Recruiter Note',
              content,
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
      if (!res.ok) throw new Error('Failed to add note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', activeId] });
      setNewNote("");
    }
  });

  const handleDownload = () => {
    if (!candidate) return;
    const text = candidate.transcripts
      .map((t: any) => `[${t.timestamp}] ${t.sender}: ${t.content}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${candidate.fullName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(() => {
      toast.error("Unable to copy link to clipboard.");
    });
  };

  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      if (!candidate) return;
      const currentTags = JSON.parse(candidate.tags || '[]');
      if (currentTags.includes(tag)) return;
      const newTags = [...currentTags, tag];
      const res = await fetch(`/api/candidates/${activeId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags })
      });
      if (!res.ok) throw new Error('Failed to add tag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', activeId] });
    }
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      if (!candidate) return;
      const currentTags = JSON.parse(candidate.tags || '[]');
      const newTags = currentTags.filter((t: string) => t !== tag);
      const res = await fetch(`/api/candidates/${activeId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags })
      });
      if (!res.ok) throw new Error('Failed to remove tag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', activeId] });
    }
  });

  const runLegalAuditMutation = useMutation({
    mutationFn: async () => {
      if (!activeId) return;
      const res = await fetch(`/api/candidates/${activeId}/legal-audit`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to run legal audit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', activeId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    }
  });

  const isLoading = isCandidatesLoading || (!!activeId && isCandidateLoading);
// ... (rest of the component)

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-background">
        <Loader2 className="size-8 animate-spin mb-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest">Loading Candidate Profile...</p>
      </div>
    );
  }

  if (!candidate && urlId) {
    return (
      <div className="h-full flex items-center justify-center text-destructive bg-background">
        <p className="text-xs font-bold uppercase tracking-widest">Candidate not found.</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-background">
        <p className="text-xs font-bold uppercase tracking-widest">No candidate selected. Please import a chat.</p>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Rail */}
        <aside className="hidden md:flex w-16 flex-col items-center border-r border-border bg-card py-6 gap-8 shrink-0">
          <div className="flex flex-col gap-6">
            <RailIcon icon={<LayoutDashboard size={20} />} active onClick={() => window.location.hash = 'dashboard'} />
            <RailIcon icon={<Download size={20} />} onClick={handleDownload} />
            <RailIcon icon={<Users size={20} />} onClick={() => window.location.hash = 'pipeline'} />
            <RailIcon icon={<Settings size={20} />} onClick={() => toast("Settings coming soon...", { icon: '⚙️' })} />
          </div>
          <div className="mt-auto">
            <RailIcon icon={<HelpCircle size={20} />} onClick={() => toast("Help documentation is available at docs.ori-cruit.com", { icon: 'ℹ️' })} />
          </div>
        </aside>

        {/* Mobile Sidebar Backdrop */}
        {showSidebar && (
          <div 
            className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar: Candidate List */}
        <aside className={cn(
          "absolute inset-y-0 left-0 z-20 w-64 border-r border-border bg-card/95 backdrop-blur flex flex-col overflow-hidden shrink-0 transition-transform duration-300 lg:relative lg:translate-x-0",
          showSidebar ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recent Imports</h3>
            <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setShowSidebar(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {candidates?.map((c: any) => (
              <button
                key={c.id}
                onClick={() => window.location.hash = `workspace?id=${c.id}`}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors flex items-center justify-between group",
                  activeId === c.id 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="truncate pr-2">
                  <div className="truncate">{c.fullName}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70 truncate">{c.currentRole || "Candidate"}</div>
                </div>
                {activeId === c.id && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
          {/* Center Panel: Transcript */}
          <section className="flex-1 flex flex-col bg-background overflow-hidden min-w-0 border-b xl:border-b-0">
          <div className="border-b border-border bg-card px-4 lg:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                className="lg:hidden p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground border border-border rounded-sm"
                onClick={() => setShowSidebar(true)}
              >
                <Menu size={16} />
              </button>
              <div>
                <h1 className="text-sm font-black uppercase tracking-widest truncate max-w-[150px] sm:max-w-xs">Conversation Transcript</h1>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-widest truncate">
                  WhatsApp Business API • {new Date(candidate.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <span className="hidden sm:inline-block bg-primary/10 border border-primary/30 px-3 py-1 text-[10px] font-black text-primary uppercase">{candidate.pipelineStage}</span>
              <span className="bg-muted border border-border px-2 sm:px-3 py-1 text-[10px] font-black text-muted-foreground">ID: WA_{candidate.id.substring(0, 6)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
            {candidate.transcripts?.length > 0 ? (
              candidate.transcripts.map((t: any) => (
                <Message 
                  key={t.id}
                  sender={t.sender} 
                  time={new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                  content={t.content} 
                  isBot={t.sender.toLowerCase().includes('bot') || t.sender.toLowerCase().includes('recruiter')}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center italic">No transcript available.</div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newNote && addNoteMutation.mutate(newNote)}
                placeholder="ADD A RECRUITER NOTE..."
                className="flex-1 bg-background border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest focus:border-primary focus:ring-0 transition-colors"
              />
              <button 
                onClick={() => newNote && addNoteMutation.mutate(newNote)}
                disabled={addNoteMutation.isPending || !newNote}
                className="bg-primary text-primary-foreground px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
              >
                {addNoteMutation.isPending ? "..." : "ADD NOTE"}
              </button>
            </div>
          </div>
        </section>

          {/* Right Rail: Analysis */}
          <aside className="w-full xl:w-96 flex flex-col border-l-0 xl:border-l border-border bg-card overflow-hidden shrink-0 h-[50vh] xl:h-auto">
          <div className="p-6 border-b border-border flex justify-between items-start">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest mb-1">Entity Extraction</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verify and correct identified data.</p>
            </div>
            <button 
              onClick={() => reanalyzeMutation.mutate()}
              disabled={reanalyzeMutation.isPending}
              className="p-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              title="Re-analyze with AI"
            >
              {reanalyzeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <Section title="Personal Identity">
              <Field label="Full Name" value={candidate.fullName} verified onChange={(v) => handleFieldChange('fullName', v)} />
              <Field label="Email Address" value={candidate.email || "Not provided"} onChange={(v) => handleFieldChange('email', v)} />
              <Field label="Phone Number" value={candidate.phone || "Not provided"} onChange={(v) => handleFieldChange('phone', v)} />
            </Section>

            <Section title="Professional Context">
              <Field label="Current Role" value={candidate.currentRole || "Not provided"} onChange={(v) => handleFieldChange('currentRole', v)} />
              <Field label="Pipeline Stage" value={candidate.pipelineStage} onChange={(v) => handleFieldChange('pipelineStage', v)} />
              <Field label="Risk Level" value={candidate.riskLevel} onChange={(v) => handleFieldChange('riskLevel', v)} />
              <Field label="Score" value={candidate.score?.toString() || "0"} onChange={(v) => handleFieldChange('score', v)} />
            </Section>

            {candidate.legalAudit ? (
              <Section title="Legal Compliance">
                <div className="space-y-4 p-4 bg-muted/50 border border-border rounded-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} className={
                        candidate.legalStatus === 'CLEARED' ? "text-emerald-500" :
                        candidate.legalStatus === 'WARNING' ? "text-amber-500" :
                        "text-destructive"
                      } />
                      Status
                    </span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 border uppercase rounded-sm",
                      candidate.legalStatus === 'CLEARED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                      candidate.legalStatus === 'WARNING' ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                      "bg-destructive/10 text-destructive border-destructive/30"
                    )}>
                      {candidate.legalStatus}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Employability</p>
                    <p className="text-[10px] font-bold leading-relaxed">{candidate.legalAudit.employabilityStatus}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Legal Analysis</p>
                    <p className="text-[10px] font-bold leading-relaxed">{candidate.legalAudit.personalCaseDescription}</p>
                  </div>

                  {candidate.legalAudit.missingDocuments?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-destructive uppercase tracking-widest flex items-center gap-1.5">
                        <X size={12} /> Missing Documents
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {candidate.legalAudit.missingDocuments.map((doc: string, i: number) => (
                          <li key={i} className="text-[10px] font-bold text-destructive/80">{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Gavel size={12} /> Recommendation
                    </p>
                    <p className="text-[10px] font-black italic">{candidate.legalAudit.recommendation}</p>
                  </div>
                </div>
              </Section>
            ) : (
              <Section title="Legal Compliance">
                <div className="p-6 border border-dashed border-border flex flex-col items-center justify-center text-center gap-3 bg-muted/20">
                  <ShieldCheck size={24} className="text-muted-foreground/50" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">No Audit Found</p>
                    <p className="text-[9px] text-muted-foreground mt-1">Run an AI-powered legal audit to verify compliance.</p>
                  </div>
                  <button 
                    onClick={() => runLegalAuditMutation.mutate()}
                    disabled={runLegalAuditMutation.isPending}
                    className="mt-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {runLegalAuditMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Gavel size={12} />}
                    {runLegalAuditMutation.isPending ? "Auditing..." : "Run Legal Audit"}
                  </button>
                </div>
              </Section>
            )}

            <Section title="System Tags">
              <div className="flex flex-wrap gap-2">
                {JSON.parse(candidate.tags || '[]').map((tag: string) => (
                  <Tag 
                    key={tag} 
                    label={tag} 
                    active 
                    onRemove={() => removeTagMutation.mutate(tag)}
                  />
                ))}
                {isAddingTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagValue.trim()) {
                          addTagMutation.mutate(newTagValue.trim().toUpperCase());
                          setNewTagValue("");
                          setIsAddingTag(false);
                        } else if (e.key === 'Escape') {
                          setIsAddingTag(false);
                          setNewTagValue("");
                        }
                      }}
                      onBlur={() => {
                        if (newTagValue.trim()) {
                          addTagMutation.mutate(newTagValue.trim().toUpperCase());
                        }
                        setIsAddingTag(false);
                        setNewTagValue("");
                      }}
                      className="border border-primary px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-background w-24 focus:outline-none"
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsAddingTag(true)}
                    className="border border-dashed border-border px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    + ADD TAG
                  </button>
                )}
              </div>
            </Section>
          </div>

          <div className="p-6 border-t border-border bg-muted/30 flex flex-col gap-3">
            <button 
              onClick={() => {
                if (confirm("Are you sure you want to discard this session?")) {
                  deleteCandidateMutation.mutate();
                }
              }}
              disabled={deleteCandidateMutation.isPending}
              className="w-full border border-border bg-card py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-muted transition-colors disabled:opacity-50"
            >
              {deleteCandidateMutation.isPending ? "Discarding..." : "Discard Session"}
            </button>
            <button 
              onClick={() => window.location.hash = 'pipeline'}
              className="w-full bg-primary text-primary-foreground py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all"
            >
              Approve & Create Profile
            </button>
          </div>
        </aside>
        </div>
      </div>
    </div>
  );
}

function RailIcon({ icon, active, onClick }: { icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
    >
      {icon}
    </button>
  );
}

function Message({ sender, time, content, isBot, link }: { sender: string; time: string; content: string; isBot?: boolean; link?: string; key?: any }) {
  return (
    <div className={cn("flex gap-4 max-w-2xl", isBot && "ml-auto flex-row-reverse")}>
      <div className={cn(
        "h-8 w-8 shrink-0 flex items-center justify-center border font-black text-[10px]",
        isBot ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground"
      )}>
        {sender[0]}
      </div>
      <div className={cn("flex flex-col gap-1.5", isBot && "items-end")}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest">{sender}</span>
          <span className="text-[9px] text-muted-foreground">{time}</span>
        </div>
        <div className={cn(
          "p-4 text-sm leading-relaxed border",
          isBot ? "bg-primary/5 border-primary/20 text-foreground" : "bg-card border-border text-foreground"
        )}>
          {content}
        </div>
        {link && (
          <div className="mt-2 bg-muted border border-primary/20 p-2 flex items-center gap-3">
            <LinkIcon size={14} className="text-primary" />
            <span className="text-xs text-primary underline truncate cursor-pointer font-bold uppercase tracking-tight">{link}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
        {title}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, verified, onChange }: { label: string; value: string; verified?: boolean; onChange?: (val: string) => void }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</label>
      <div className="flex border border-border bg-background p-2 group focus-within:border-primary transition-colors">
        <input 
          className="w-full bg-transparent border-none text-xs font-bold uppercase tracking-tight focus:ring-0 p-0" 
          type="text" 
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            if (localValue !== value && onChange) {
              onChange(localValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && localValue !== value && onChange) {
              onChange(localValue);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {verified && <Verified size={14} className="text-primary" />}
      </div>
    </div>
  );
}

function Tag({ label, active, onRemove }: { label: string; active?: boolean; onRemove?: () => void; key?: any }) {
  return (
    <span className={cn(
      "px-2 py-1 text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 group",
      active ? "bg-primary/20 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"
    )}>
      {label}
      {active && onRemove && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-50 hover:opacity-100 hover:text-destructive transition-all"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
