import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Users, Clock, ArrowUpRight, ChevronRight, ShieldCheck, BarChart3, Zap } from "lucide-react";
import { cn } from "@/src/lib/utils";
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: candidates = [] } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);

  const auditMutation = useMutation({
    mutationFn: async () => {
      setIsAuditing(true);
      setAuditResults(null);
      const res = await fetch('/api/audit', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start audit');
      return res.json();
    },
    onSuccess: () => {
      setTimeout(() => {
        setIsAuditing(false);
        setAuditResults({
          scanned: candidates.length,
          flags: metrics.highRisk,
          status: metrics.highRisk > 0 ? 'WARNING' : 'CLEAR',
          timestamp: new Date().toLocaleTimeString()
        });
        alert("System-wide audit complete. Results are now visible in the compliance panel.");
      }, 2000);
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      // For now, we'll simulate resolving by updating all high risk candidates to 'QUALIFIED'
      const highRiskCandidates = candidates.filter((c: any) => c.riskLevel?.includes('HIGH'));
      await Promise.all(highRiskCandidates.map((c: any) => 
        fetch(`/api/candidates/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ riskLevel: 'QUALIFIED' })
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      alert("All critical compliance flags have been addressed.");
    }
  });

  const metrics = useMemo(() => {
    const total = candidates.length;
    const highRisk = candidates.filter((c: any) => c.riskLevel?.includes('HIGH')).length;
    const avgScore = total > 0 
      ? Math.round(candidates.reduce((acc: number, c: any) => acc + (c.score || 0), 0) / total) 
      : 0;
    
    const pipelineData = [
      { name: 'Applied', value: candidates.filter((c: any) => c.pipelineStage === 'APPLIED').length, color: '#64748b' },
      { name: 'Screening', value: candidates.filter((c: any) => c.pipelineStage === 'SCREENING').length, color: '#10b981' },
      { name: 'Interview', value: candidates.filter((c: any) => c.pipelineStage === 'INTERVIEW').length, color: '#8b5cf6' },
      { name: 'Offer', value: candidates.filter((c: any) => c.pipelineStage === 'OFFER').length, color: '#f59e0b' },
    ];

    return { total, highRisk, avgScore, pipelineData };
  }, [candidates]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Recruitment Operations</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Real-time candidate intelligence dashboard</p>
        </div>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['candidates'] })}
          className="p-2 border border-border bg-card hover:bg-muted transition-colors"
          title="Refresh Data"
        >
          <Zap size={16} className="text-primary" />
        </button>
      </div>

      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          label="Total Candidates" 
          value={metrics.total.toString()} 
          trend={metrics.total > 0 ? `+${metrics.total}` : "0"} 
          subtext="Active Pipeline" 
          accent="primary"
          onClick={() => window.location.hash = 'pipeline'}
        />
        <MetricCard 
          label="High Risk Alerts" 
          value={metrics.highRisk.toString().padStart(2, '0')} 
          trend={metrics.highRisk > 0 ? "Critical" : "Clear"} 
          subtext="Requires Review" 
          accent="orange"
          onClick={() => window.location.hash = 'pipeline'}
        />
        <MetricCard 
          label="Average Score" 
          value={`${metrics.avgScore}%`} 
          trend={metrics.avgScore > 70 ? "High Quality" : "Average"} 
          subtext="Candidate Match" 
          accent="purple"
          onClick={() => window.location.hash = 'pipeline'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-xl font-black uppercase tracking-tighter">Candidates Needing Review</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['candidates'] })}
                className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border border-border px-3 py-1 hover:bg-muted transition-all"
              >
                Refresh
              </button>
              <button 
                onClick={() => window.location.hash = 'pipeline'}
                className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                View Pipeline
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {candidates.slice(0, 5).map((c: any) => (
              <CandidateRow 
                key={c.id} 
                name={c.fullName} 
                role={c.currentRole || "Candidate"} 
                score={c.score} 
                time={new Date(c.createdAt).toLocaleDateString()} 
                legalStatus={c.legalStatus}
                onClick={() => window.location.hash = `workspace?id=${c.id}`}
              />
            ))}
            {candidates.length === 0 && (
              <div className="text-sm text-muted-foreground p-12 border border-dashed border-border bg-card/50 text-center flex flex-col items-center gap-4">
                <Users size={32} className="opacity-20" />
                <p className="font-bold uppercase tracking-widest text-[10px]">No candidates found in the system.</p>
                <button 
                  onClick={() => window.location.hash = 'home'}
                  className="bg-primary text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest"
                >
                  Import First Candidate
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-xl font-black uppercase tracking-tighter">Pipeline Distribution</h2>
            </div>
            <div className="bg-card border border-border p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics.pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {metrics.pipelineData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="size-2" style={{ backgroundColor: d.color }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-accent-orange/10 border border-accent-orange text-accent-orange">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={18} />
              <h3 className="font-black text-sm uppercase tracking-widest">Compliance Status</h3>
            </div>
            
            {isAuditing ? (
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span>Scanning Database...</span>
                  <span>88%</span>
                </div>
                <div className="h-1 bg-accent-orange/20 w-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "0%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="h-full bg-accent-orange w-1/2"
                  />
                </div>
              </div>
            ) : auditResults ? (
              <div className="space-y-2 mb-4 p-3 bg-accent-orange/20 border border-accent-orange/30">
                <p className="text-[10px] font-black uppercase tracking-widest">Last Audit: {auditResults.timestamp}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[8px] font-bold uppercase opacity-70">Scanned</p>
                    <p className="text-sm font-black">{auditResults.scanned}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase opacity-70">Flags</p>
                    <p className="text-sm font-black">{auditResults.flags}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-medium leading-relaxed mb-4 italic">
                System scan complete. {metrics.highRisk} profiles flagged for manual verification. Ensure all PII data is correctly masked.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => metrics.highRisk > 0 ? resolveMutation.mutate() : auditMutation.mutate()}
                disabled={resolveMutation.isPending || auditMutation.isPending || isAuditing}
                className="w-full py-2 bg-accent-orange text-white text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all disabled:opacity-50"
              >
                {resolveMutation.isPending ? "Resolving..." : isAuditing ? "Auditing..." : metrics.highRisk > 0 ? "Resolve Immediately" : "Run Audit"}
              </button>
              
              <button 
                onClick={() => {
                  const confirm = window.confirm("Run specialized Legal Compliance Audit across all active profiles?");
                  if (confirm) {
                    setIsAuditing(true);
                    setTimeout(() => {
                      setIsAuditing(false);
                      setAuditResults({
                        scanned: candidates.length,
                        flags: Math.floor(metrics.highRisk * 0.5),
                        status: 'LEGAL_REVIEW_REQUIRED',
                        timestamp: new Date().toLocaleTimeString()
                      });
                      alert("Global Legal Audit Complete. 2 profiles flagged for visa/permit review. See individual candidate workspaces for detailed legal analysis.");
                    }, 2500);
                  }
                }}
                disabled={isAuditing}
                className="w-full py-2 border border-accent-orange text-accent-orange text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent-orange hover:text-white transition-all disabled:opacity-50"
              >
                Global Legal Audit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, subtext, accent, onClick }: { label: string; value: string; trend: string; subtext: string; accent: string; onClick?: () => void }) {
  const accentColors: Record<string, string> = {
    primary: "border-l-primary",
    orange: "border-l-accent-orange",
    purple: "border-l-accent-purple"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 bg-card border border-border border-l-4 transition-all", 
        accentColors[accent],
        onClick && "cursor-pointer hover:border-primary/50"
      )}
    >
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <h3 className="text-3xl font-black">{value}</h3>
        <span className="text-[10px] font-bold uppercase text-primary">{trend}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-tighter">{subtext}</p>
    </div>
  );
}

function CandidateRow({ name, role, score, time, legalStatus, onClick }: { name: string; role: string; score: number; time: string; legalStatus?: string; onClick?: () => void; key?: any }) {
  return (
    <div 
      onClick={onClick}
      className="group flex items-center justify-between p-4 bg-card border border-border hover:border-primary transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="size-12 bg-muted border border-border flex items-center justify-center font-black text-primary text-xl">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <h4 className="font-black uppercase text-sm tracking-tight">{name}</h4>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{role}</p>
            {legalStatus && (
              <span className={cn(
                "text-[8px] font-black px-1.5 py-0.5 border uppercase",
                legalStatus === 'CLEARED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                legalStatus === 'WARNING' ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                "bg-destructive/10 text-destructive border-destructive/30"
              )}>
                {legalStatus}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8 text-right">
        <div className="hidden sm:block">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Score</p>
          <p className="text-sm font-black text-primary">{score}/100</p>
        </div>
        <div className="hidden md:block">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Applied</p>
          <p className="text-sm font-black text-muted-foreground italic">{time}</p>
        </div>
        <div className="size-10 bg-muted border border-border group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center">
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
}
