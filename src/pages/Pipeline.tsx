import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { MoreHorizontal, Calendar, AlertCircle, User, ShieldCheck, Filter, Plus, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { socket } from "@/src/lib/socket";

const COLUMNS = [
  { id: "APPLIED", label: "Applied", color: "bg-slate-500" },
  { id: "SCREENING", label: "Screening", color: "bg-primary" },
  { id: "INTERVIEW", label: "Interview", color: "bg-accent-purple" },
  { id: "OFFER", label: "Offer", color: "bg-accent-orange" },
];

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCandidate, setNewCandidate] = useState({ fullName: '', currentRole: '', pipelineStage: 'APPLIED' });

  const { data: pipeline = { applied: [], screening: [], interview: [], offer: [] } } = useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const res = await fetch('/api/pipeline');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: stage })
      });
      if (!res.ok) throw new Error('Failed to update stage');
      return res.json();
    },
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline'] });
      await queryClient.cancelQueries({ queryKey: ['candidates'] });
      const previousPipeline = queryClient.getQueryData<any>(['pipeline']);
      const previousCandidates = queryClient.getQueryData<any>(['candidates']);

      queryClient.setQueryData(['pipeline'], (oldData: any) => {
        if (!oldData) return oldData;
        const cloned = JSON.parse(JSON.stringify(oldData));
        for (const key in cloned) {
          cloned[key] = cloned[key].filter((item: any) => item.id !== id);
        }
        const lowerStage = stage.toLowerCase();
        if (cloned[lowerStage]) {
          const moving = previousCandidates?.find((item: any) => item.id === id);
          if (moving) {
            cloned[lowerStage] = [...cloned[lowerStage], { ...moving, pipelineStage: stage }];
          }
        }
        return cloned;
      });

      queryClient.setQueryData(['candidates'], (oldData: any[]) => {
        if (!oldData) return oldData;
        return oldData.map((candidate: any) => candidate.id === id ? { ...candidate, pipelineStage: stage } : candidate);
      });

      return { previousPipeline, previousCandidates };
    },
    onError: (_err, _variables, context: any) => {
      toast.error('Pipeline update failed. Rolling back...');
      if (context?.previousPipeline) queryClient.setQueryData(['pipeline'], context.previousPipeline);
      if (context?.previousCandidates) queryClient.setQueryData(['candidates'], context.previousCandidates);
    },
    onSuccess: () => {
      toast.success('Pipeline updated successfully');
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    }
  });

  const createCandidateMutation = useMutation({
    mutationFn: async (candidate: typeof newCandidate) => {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate)
      });
      if (!res.ok) throw new Error('Failed to create candidate');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setIsModalOpen(false);
      setNewCandidate({ fullName: '', currentRole: '', pipelineStage: 'APPLIED' });
    }
  });

  const clearColumnMutation = useMutation({
    mutationFn: async (stage: string) => {
      // Find all candidates in this stage
      const res = await fetch('/api/candidates');
      const all = await res.json();
      const inStage = all.filter((c: any) => c.pipelineStage === stage);
      await Promise.all(inStage.map((c: any) => 
        fetch(`/api/candidates/${c.id}`, { method: 'DELETE' })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    }
  });

  const currentQuarter = `Q${Math.floor((new Date().getMonth() + 3) / 3)}`;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const unsubscribe = socket.on("CANDIDATE_UPDATED", () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    const id = e.dataTransfer.getData("candidateId");
    if (id) {
      updateStageMutation.mutate({ id, stage });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sub Header */}
      <div className="bg-card border-b border-border px-10 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Engineering Pipeline</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            <span className="size-1.5 bg-emerald-500" />
            Operational View • {currentQuarter} {currentYear} Hiring Cycle
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="FILTER CANDIDATES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border border-border pl-9 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:ring-0 transition-colors w-64"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 text-sm font-bold uppercase tracking-widest hover:brightness-110 transition-all"
          >
            <Plus size={16} />
            New Candidate
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto custom-scrollbar bg-background/50">
        <div className="flex h-full p-6 gap-6 min-w-max">
          {COLUMNS.map((col) => {
            const columnCandidates = (pipeline[col.id.toLowerCase() as keyof typeof pipeline] || []).filter((c: any) => 
              c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (c.currentRole && c.currentRole.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            
            return (
              <div 
                key={col.id} 
                className="w-80 flex flex-col gap-4"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5", col.color)} />
                    <h3 className="font-bold uppercase tracking-tight text-sm">{col.label}</h3>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5">
                      {columnCandidates.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm(`Clear all candidates in ${col.label}?`)) {
                        clearColumnMutation.mutate(col.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Clear Column"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {columnCandidates.map((c: any) => (
                    <CandidateCard 
                      key={c.id}
                      id={c.id}
                      name={c.fullName} 
                      role={c.currentRole || "Candidate"} 
                      risk={c.riskLevel || "UNKNOWN"} 
                      time={new Date(c.createdAt).toLocaleDateString()} 
                      active={col.id === "SCREENING"} 
                      legalStatus={c.legalStatus}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Candidate Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold uppercase tracking-tight">Add New Candidate</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                createCandidateMutation.mutate(newCandidate);
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={newCandidate.fullName}
                    onChange={(e) => setNewCandidate({ ...newCandidate, fullName: e.target.value })}
                    className="w-full bg-background border border-border p-3 text-sm font-bold uppercase tracking-tight focus:border-primary focus:ring-0 transition-colors"
                    placeholder="E.G. JOHN DOE"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Role</label>
                  <input 
                    type="text" 
                    value={newCandidate.currentRole}
                    onChange={(e) => setNewCandidate({ ...newCandidate, currentRole: e.target.value })}
                    className="w-full bg-background border border-border p-3 text-sm font-bold uppercase tracking-tight focus:border-primary focus:ring-0 transition-colors"
                    placeholder="E.G. SENIOR SOFTWARE ENGINEER"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Initial Stage</label>
                  <select 
                    value={newCandidate.pipelineStage}
                    onChange={(e) => setNewCandidate({ ...newCandidate, pipelineStage: e.target.value })}
                    className="w-full bg-background border border-border p-3 text-sm font-bold uppercase tracking-tight focus:border-primary focus:ring-0 transition-colors"
                  >
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={createCandidateMutation.isPending}
                  className="w-full bg-primary text-primary-foreground py-4 text-sm font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {createCandidateMutation.isPending ? "Creating..." : "Create Candidate"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CandidateCard({ id, name, role, risk, time, active, legalStatus }: { id: string; name: string; role: string; risk: string; time: string; active?: boolean; legalStatus?: string; key?: any }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("candidateId", id);
  };

  return (
    <motion.div 
      draggable
      onDragStart={handleDragStart}
      whileHover={{ y: -2 }}
      className={cn(
        "bg-card border border-border p-4 transition-all cursor-pointer group active:opacity-50",
        active ? "border-primary border-l-4" : "border-l-4 border-l-muted-foreground/30"
      )}
      onClick={() => window.location.hash = `workspace?id=${id}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className={cn("font-bold text-sm group-hover:text-primary transition-colors", active && "text-primary")}>{name}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-bold uppercase tracking-widest">{role}</p>
        </div>
        <span className="text-[9px] uppercase font-bold text-muted-foreground">{time}</span>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          <span className="bg-muted text-foreground text-[9px] font-bold px-2 py-0.5 border border-border">
            {risk}
          </span>
          {legalStatus && (
            <span className={cn(
              "text-[9px] font-bold px-2 py-0.5 border uppercase",
              legalStatus === 'CLEARED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
              legalStatus === 'WARNING' ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
              "bg-destructive/10 text-destructive border-destructive/30"
            )}>
              {legalStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className={cn("text-muted-foreground", legalStatus === 'CLEARED' && "text-emerald-500")} />
          <div className="size-7 bg-muted border border-border flex items-center justify-center overflow-hidden">
            <User size={14} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
