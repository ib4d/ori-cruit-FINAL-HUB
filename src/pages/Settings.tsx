import React, { useState, useEffect } from "react";
import { User, Settings as SettingsIcon, Shield, Bell, Database, Globe } from "lucide-react";
import { cn } from "@/src/lib/utils";

export default function Settings() {
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("settings_displayName") || "abad1982");
  const [email, setEmail] = useState(() => localStorage.getItem("settings_email") || "abad1982@gmail.com");
  const [minScore, setMinScore] = useState(() => Number(localStorage.getItem("settings_minScore")) || 75);
  const [aiDepth, setAiDepth] = useState<"STANDARD" | "DEEP" | "EXTREME">(() => (localStorage.getItem("settings_aiDepth") as any) || "EXTREME");
  const [twoFactor, setTwoFactor] = useState(() => localStorage.getItem("settings_twoFactor") !== "false");
  const [dataRetention, setDataRetention] = useState(() => localStorage.getItem("settings_dataRetention") || "24 MONTHS");
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem("settings_emailAlerts") !== "false");
  const [systemSounds, setSystemSounds] = useState(() => localStorage.getItem("settings_systemSounds") === "true");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("settings_displayName", displayName);
    localStorage.setItem("settings_email", email);
    localStorage.setItem("settings_minScore", minScore.toString());
    localStorage.setItem("settings_aiDepth", aiDepth);
    localStorage.setItem("settings_twoFactor", twoFactor.toString());
    localStorage.setItem("settings_dataRetention", dataRetention);
    localStorage.setItem("settings_emailAlerts", emailAlerts.toString());
    localStorage.setItem("settings_systemSounds", systemSounds.toString());
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">System Parameters & Settings</h1>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Configure recruitment thresholds and security policies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SettingsSection 
          icon={<User size={20} />} 
          title="Profile Settings" 
          description="Manage your account information and preferences."
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Display Name</span>
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-muted border border-border text-xs px-2 py-1 w-32 text-right focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Email</span>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted border border-border text-xs px-2 py-1 w-48 text-right focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection 
          icon={<SettingsIcon size={20} />} 
          title="System Parameters" 
          description="Global recruitment thresholds and AI scoring weights."
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Min Score Threshold</span>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={minScore} 
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-24 accent-primary"
                />
                <span className="text-xs font-black text-primary w-8 text-right">{minScore}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">AI Analysis Depth</span>
              <select 
                value={aiDepth} 
                onChange={(e) => setAiDepth(e.target.value as any)}
                className="bg-muted border border-border text-xs font-black text-primary px-2 py-1 outline-none"
              >
                <option value="STANDARD">STANDARD</option>
                <option value="DEEP">DEEP</option>
                <option value="EXTREME">EXTREME</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection 
          icon={<Shield size={20} />} 
          title="Security & Privacy" 
          description="2FA, data retention, and access control."
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Two-Factor Auth</span>
              <button 
                onClick={() => setTwoFactor(!twoFactor)}
                className={cn("text-xs font-black px-2 py-1 border transition-colors", twoFactor ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-muted text-muted-foreground border-border")}
              >
                {twoFactor ? "ACTIVE" : "DISABLED"}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Data Retention</span>
              <select 
                value={dataRetention} 
                onChange={(e) => setDataRetention(e.target.value)}
                className="bg-muted border border-border text-xs text-muted-foreground px-2 py-1 outline-none"
              >
                <option value="6 MONTHS">6 MONTHS</option>
                <option value="12 MONTHS">12 MONTHS</option>
                <option value="24 MONTHS">24 MONTHS</option>
                <option value="INDEFINITE">INDEFINITE</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection 
          icon={<Bell size={20} />} 
          title="Notifications" 
          description="Configure system alerts and email updates."
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">Email Alerts</span>
              <button 
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={cn("text-xs font-black px-2 py-1 border transition-colors", emailAlerts ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border")}
              >
                {emailAlerts ? "ENABLED" : "DISABLED"}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase">System Sounds</span>
              <button 
                onClick={() => setSystemSounds(!systemSounds)}
                className={cn("text-xs font-black px-2 py-1 border transition-colors", systemSounds ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border")}
              >
                {systemSounds ? "ACTIVE" : "MUTED"}
              </button>
            </div>
          </div>
        </SettingsSection>
      </div>
      
      <div className="flex justify-end pt-8">
        <button 
          onClick={handleSave}
          className={cn(
            "px-8 py-3 text-xs font-black uppercase tracking-widest transition-all",
            isSaved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground hover:brightness-110"
          )}
        >
          {isSaved ? "Saved Successfully" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

function SettingsSection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border p-6 space-y-4 hover:border-primary transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted border border-border text-primary">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
          <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
        </div>
      </div>
      <div className="pt-4 border-t border-border">
        {children}
      </div>
    </div>
  );
}
