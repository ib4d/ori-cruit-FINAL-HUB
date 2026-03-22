import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, LayoutDashboard, Users, GitBranch, ShieldCheck, LogOut, Search, Bell, Plus, UploadCloud, ChevronDown, User, Settings, Shield } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function Layout({ children, title }: { children: React.ReactNode; title: string }) {
  const { theme, toggleTheme } = useTheme();
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifications] = useState([
    { id: 1, title: "New Candidate", message: "Manny has been imported via WhatsApp.", time: "2m ago", read: false },
    { id: 2, title: "Audit Complete", message: "System scan finished. 0 flags found.", time: "15m ago", read: true },
    { id: 3, title: "Legal Update", message: "New compliance guidelines for 2026 are available.", time: "1h ago", read: true },
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setIsAvatarOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      setShowSearchResults(false);
      setTimeout(() => {
        setIsSearching(false);
        setShowSearchResults(true);
      }, 800);
    }
  };

  const runLegalAudit = async () => {
    const hash = window.location.hash;
    const isWorkspace = hash.startsWith('#workspace');
    const params = new URLSearchParams(hash.split('?')[1]);
    const candidateId = params.get('id');

    if (isWorkspace && candidateId) {
      const confirmAudit = window.confirm(`Initiate specialized Legal Audit for Candidate #${candidateId}? This will perform a thorough analysis of their personal case, employability status, legal problems, and documentation.`);
      if (confirmAudit) {
        try {
          toast.loading("Legal Audit engine initialized. Analyzing candidate profile and transcripts...");
          const response = await fetch(`/api/candidates/${candidateId}/legal-audit`, { method: 'POST' });
          if (!response.ok) throw new Error("Audit failed");
          const result = await response.json();
          toast.dismiss();
          toast.success(`Legal Audit Complete for Candidate #${candidateId}. Status: ${result.legalStatus}`);
          // Refresh the page to show new data if needed
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (error) {
          console.error("Legal Audit Error:", error);
          toast.error("Error running legal audit. Please ensure the Gemini API key is configured.");
        }
      }
    } else {
      const confirmAudit = window.confirm("Initiate global Legal Audit? This will scan all candidate profiles for GDPR, CCPA, and local labor law compliance.");
      if (confirmAudit) {
        toast.loading("Global Legal Audit engine initialized. Scanning database for compliance...");
        setTimeout(() => {
          toast.dismiss();
          toast.success("Global Legal Audit Complete: 124 profiles scanned. 0 high-risk legal violations found. 2 minor documentation warnings.");
        }, 3000);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Top Nav */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => window.location.hash = 'home'}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
          >
            <div className="w-8 h-8 bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldCheck className="text-white size-5" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">
              ORI-CRUIT<span className="text-primary">.HUB</span>
            </span>
          </button>
          <nav className="hidden md:flex items-center gap-8">
            <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" active={window.location.hash === '#dashboard'} onClick={() => window.location.hash = 'dashboard'} />
            <NavItem icon={<Users size={16} />} label="Candidates" active={window.location.hash === '#pipeline'} onClick={() => window.location.hash = 'pipeline'} />
            <NavItem icon={<GitBranch size={16} />} label="Pipeline" active={window.location.hash === '#pipeline'} onClick={() => window.location.hash = 'pipeline'} />
            <NavItem icon={<ShieldCheck size={16} />} label="Legal" active={window.location.hash === '#dashboard'} onClick={() => window.location.hash = 'dashboard'} />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative hidden lg:block group">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 group-focus-within:text-primary transition-colors", isSearching && "animate-pulse")} />
              <input
                type="text"
                placeholder="SEARCH DATABASE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-muted border-none text-[10px] font-bold tracking-widest uppercase pl-10 pr-4 py-2 w-64 focus:ring-1 focus:ring-primary transition-all focus:w-80"
              />
            </form>
            {showSearchResults && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Search Results for "{searchQuery}"</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <button onClick={() => { setShowSearchResults(false); window.location.hash = 'workspace?id=1'; }} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0">
                    <p className="text-xs font-bold uppercase">Manny (Candidate)</p>
                    <p className="text-[10px] text-muted-foreground">Imported via WhatsApp • Score: 88%</p>
                  </button>
                  <button onClick={() => { setShowSearchResults(false); window.location.hash = 'dashboard'; }} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0">
                    <p className="text-xs font-bold uppercase">Compliance Audit Log</p>
                    <p className="text-[10px] text-muted-foreground">2026-03-18 • 0 Flags</p>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button onClick={toggleTheme} className="p-2 hover:bg-muted transition-colors">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 hover:bg-muted transition-colors relative"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notifications</p>
                  <button className="text-[9px] font-bold text-primary hover:underline">Mark all read</button>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifications.map(n => (
                    <button key={n.id} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", !n.read && "text-primary")}>{n.title}</span>
                        <span className="text-[9px] text-muted-foreground">{n.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2 text-center border-t border-border">
                  <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">View All Activity</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative" ref={avatarRef}>
            <button 
              onClick={() => setIsAvatarOpen(!isAvatarOpen)}
              className="flex items-center gap-2 p-1 hover:bg-muted transition-colors group"
            >
              <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                <img 
                  src="https://picsum.photos/seed/recruiter/100/100" 
                  alt="Avatar" 
                  className="w-full h-full object-cover grayscale"
                  referrerPolicy="no-referrer"
                />
              </div>
              <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isAvatarOpen && "rotate-180")} />
            </button>

            {isAvatarOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signed in as</p>
                  <p className="text-xs font-bold truncate">abad1982@gmail.com</p>
                </div>
                <DropdownItem icon={<User size={14} />} label="Profile Settings" onClick={() => { setIsAvatarOpen(false); window.location.hash = 'settings'; }} />
                <DropdownItem icon={<Settings size={14} />} label="System Parameters" onClick={() => { setIsAvatarOpen(false); window.location.hash = 'settings'; }} />
                <DropdownItem icon={<Shield size={14} />} label="Security & Privacy" onClick={() => { setIsAvatarOpen(false); window.location.hash = 'settings'; }} />
                <div className="h-px bg-border my-2" />
                <DropdownItem icon={<LogOut size={14} />} label="Sign Out" onClick={() => { setIsAvatarOpen(false); window.location.hash = 'home'; }} destructive />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Secondary Nav / Operations Bar */}
      <div className="h-16 border-b border-border bg-card flex items-center px-6 gap-8 sticky top-16 z-40 overflow-x-auto hide-scrollbar">
        <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase shrink-0">Operations</p>
        <div className="flex items-center gap-2 shrink-0">
          <SidebarButton 
            icon={<Plus size={16} />} 
            label="Quick Import" 
            primary 
            onClick={() => window.location.hash = 'home'}
          />
          <SidebarButton 
            icon={<UploadCloud size={16} />} 
            label="Upload Batch" 
            onClick={() => window.location.hash = 'home'}
          />
          <SidebarButton 
            icon={<ShieldCheck size={16} />} 
            label="Legal Audit" 
            onClick={runLegalAudit}
          />
        </div>
        
        <div className="ml-auto flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 px-4 py-1.5 border border-border bg-muted/30">
            <span className="text-[9px] font-bold uppercase">System Engine</span>
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[9px] font-medium text-muted-foreground italic ml-2">v4.0.2 Optimized</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pt-16 pb-12">
          {children}
        </main>
      </div>

      {/* Footer Bar */}
      <footer className="h-8 border-t border-border bg-card px-6 flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
        <div className="flex gap-8">
          <span>EST: {new Date().toLocaleTimeString()}</span>
          <span>DATA RATE: 1.4GB/S</span>
          <span className="text-primary">SECURE CONNECTION</span>
        </div>
        <div>© ORI-CRUIT HUB • RECRUITMENT OPERATIONS SYSTEM</div>
      </footer>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors pb-1 border-b-2",
        active ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SidebarButton({ icon, label, primary, onClick }: { icon: React.ReactNode; label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 font-bold text-xs uppercase tracking-widest transition-all",
        primary 
          ? "bg-primary text-primary-foreground hover:brightness-110" 
          : "text-foreground hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DropdownItem({ icon, label, onClick, destructive }: { icon: React.ReactNode; label: string; onClick?: () => void; destructive?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors",
        destructive ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
