import { motion } from "framer-motion";
import { UploadCloud, ShieldCheck, Zap, ArrowRight, MessageSquare, Database, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import React, { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (filesData: Array<{ mimeType: string, data: string } | string>) => {
      const results = [];
      for (const fileData of filesData) {
        // Send file data to backend to parse and save
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Import failed with status ${res.status}`);
        }
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: (data) => {
      if (data.length === 1) {
        window.location.hash = `workspace?id=${data[0].candidateId}`;
      } else {
        alert(`Successfully imported ${data.length} candidates.`);
        window.location.hash = 'pipeline';
      }
    },
    onError: (error) => {
      alert(`Failed to process export: ${error.message}`);
    }
  });

  const handleFiles = (files: FileList | File[]) => {
    const filePromises = Array.from(files).map(file => {
      return new Promise<{ mimeType: string, data: string } | string>((resolve, reject) => {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        const isText = file.type === 'text/plain' || file.name.endsWith('.txt');

        if (!isImage && !isPdf && !isText) {
          reject(new Error(`Unsupported file type: ${file.name}. Please upload a .txt, PDF, or image file.`));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (isImage || isPdf) {
            const base64Data = result.split(',')[1];
            resolve({ mimeType: file.type, data: base64Data });
          } else {
            resolve(result);
          }
        };
        reader.onerror = reject;
        
        if (isImage || isPdf) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    });

    Promise.all(filePromises)
      .then(filesData => {
        importMutation.mutate(filesData);
      })
      .catch(err => alert(err.message));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-primary rounded-full blur-[160px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-accent-purple rounded-full blur-[160px]" />
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase font-black tracking-[0.2em] mb-8">
              AI-Powered Recruitment Operations
            </div>
            <h1 className="text-6xl md:text-8xl font-black editorial-track leading-[0.9] mb-8 uppercase italic">
              Turn Chats <br /> 
              <span className="text-gradient dark:text-gradient-dark">Into Pipeline</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Instantly transform messy WhatsApp chat exports, resumes, and documents into structured candidate profiles. 
              The premium intake cockpit for high-performance recruitment teams.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto group"
          >
            <input 
              type="file" 
              accept=".txt,image/*,application/pdf" 
              multiple
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => e.target.files && handleFiles(e.target.files)} 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                "relative border-2 border-dashed border-border bg-card/50 p-12 text-center transition-colors duration-500 cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "group-hover:border-primary/50"
              )}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="w-16 h-16 bg-background border border-border flex items-center justify-center mb-2">
                  {importMutation.isPending ? (
                    <Loader2 className="text-primary size-8 animate-spin" />
                  ) : (
                    <UploadCloud className="text-primary size-8" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">
                    {importMutation.isPending ? "Processing..." : "Drop your export"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {importMutation.isPending 
                      ? "AI is extracting candidate data and reconstructing the profile..." 
                      : <span>Drag your WhatsApp chat log, PDF, or image here or <span className="text-primary underline">browse files</span></span>
                    }
                  </p>
                  {importMutation.isError && (
                    <p className="text-destructive text-sm font-bold mt-2">
                      Error: {importMutation.error?.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-8 mt-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                    <ShieldCheck size={14} /> Legal Verification
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                    <Zap size={14} /> Instant Extraction
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <FeatureCard 
              icon={<MessageSquare className="text-primary" />}
              title="Intake Cockpit"
              description="Document import → candidate structuring → legal verification → pipeline routing."
              accent="primary"
              onClick={() => fileInputRef.current?.click()}
            />
            <FeatureCard 
              icon={<Database className="text-accent-purple" />}
              title="Ops Hub"
              description="Recruitment operations system of record. Centralized, structured, and searchable."
              accent="purple"
              onClick={() => window.location.hash = 'dashboard'}
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-accent-orange" />}
              title="Legal Readiness"
              description="Automated compliance checks and document verification for every candidate."
              accent="orange"
              onClick={() => window.location.hash = 'dashboard'}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-4xl font-black uppercase italic editorial-track mb-20">The Ecosystem</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <Step number="01" title="Import" text="Upload WhatsApp chat logs, resumes (PDF), or images directly into the importer." />
            <Step number="02" title="Extract" text="AI identifies skills, seniority, and contact data instantly." />
            <Step number="03" title="Verify" text="Automated legal and document readiness checks." />
            <Step number="04" title="Sync" text="One-click activation into the ORI-CRUIT Hub pipeline." />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, accent, onClick }: { icon: React.ReactNode; title: string; description: string; accent: string; onClick?: () => void }) {
  const accentColors: Record<string, string> = {
    primary: "bg-primary",
    purple: "bg-accent-purple",
    orange: "bg-accent-orange"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card border border-border p-8 hover:bg-muted/50 transition-all group relative overflow-hidden",
        onClick && "cursor-pointer"
      )}
    >
      <div className={cn("absolute top-0 left-0 w-1 h-0 group-hover:h-full transition-all duration-300", accentColors[accent])} />
      <div className="w-12 h-12 bg-muted border border-border flex items-center justify-center mb-12">
        {icon}
      </div>
      <h3 className="text-2xl font-black uppercase italic mb-4 leading-tight group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="relative">
      <div className="text-8xl font-black text-foreground/5 absolute -top-10 -left-4 pointer-events-none">{number}</div>
      <div className="relative z-10">
        <h4 className="text-lg font-black uppercase mb-4 text-primary">{title}</h4>
        <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
