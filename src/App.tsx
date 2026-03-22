import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./components/ThemeProvider";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";

import { ChevronLeft, ChevronRight } from "lucide-react";

const queryClient = new QueryClient();

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "dashboard" | "pipeline" | "workspace" | "settings">("home");

  // Simple routing simulation
  useEffect(() => {
    const handleHashChange = () => {
      const hashString = window.location.hash.replace("#", "");
      const [path] = hashString.split("?");
      if (["home", "dashboard", "pipeline", "workspace", "settings"].includes(path)) {
        setCurrentPage(path as any);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case "home": return <Home />;
      case "dashboard": return <Layout title="Dashboard"><Dashboard /></Layout>;
      case "pipeline": return <Layout title="Pipeline"><Pipeline /></Layout>;
      case "workspace": return <Layout title="Workspace"><Workspace /></Layout>;
      case "settings": return <Layout title="Settings"><Settings /></Layout>;
      default: return <Home />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <Toaster position="bottom-right" />
          <div className="fixed bottom-6 left-6 z-9999 flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border p-1.5 shadow-2xl rounded-none">
          <div className="flex gap-1 border-r border-border pr-1 mr-1">
            <NavButton onClick={() => window.history.back()}><ChevronLeft size={14} /></NavButton>
            <NavButton onClick={() => window.history.forward()}><ChevronRight size={14} /></NavButton>
          </div>
          <NavButton active={currentPage === "home"} onClick={() => window.location.hash = "home"}>Home</NavButton>
          <NavButton active={currentPage === "dashboard"} onClick={() => window.location.hash = "dashboard"}>Dash</NavButton>
          <NavButton active={currentPage === "pipeline"} onClick={() => window.location.hash = "pipeline"}>Pipe</NavButton>
          <NavButton active={currentPage === "workspace"} onClick={() => window.location.hash = "workspace"}>Work</NavButton>
        </div>
        {renderPage()}
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function NavButton({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center min-w-[32px] ${
        active ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

