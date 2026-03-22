Project Prompt: "HireFlow Pro - Production-Ready AI Recruitment CRM"
Objective: Build a high-performance, full-stack recruitment CRM designed for intensive daily use. The system must feature real-time data persistence, robust error handling, and a scalable architecture optimized for Vercel and Supabase/PostgreSQL.
1. Core Architecture & Tech Stack
Framework: Next.js 14+ (App Router) with TypeScript (Strict Mode).
Database & Auth: Supabase (PostgreSQL) for persistent storage and built-in Auth.
ORM: Prisma for type-safe database queries and migrations.
State Management: TanStack Query (React Query) for server-state synchronization and caching.
Styling: Tailwind CSS (Mobile-first, Desktop-optimized).
AI Engine: Google Gemini SDK (@google/genai) implemented via Next.js API Routes (Server-side only).
2. Database Schema (Persistence Layer)
Candidates Table: id (UUID), fullName, email (Unique), phone, currentRole, pipelineStage (Enum), score (Int), riskLevel (String), tags (JSONB), experienceYears (Float), createdAt.
Transcripts Table: id, candidateId (FK), sender, content, timestamp, isSystemGenerated (Bool).
Notes Table: id, candidateId (FK), authorId, text, createdAt.
3. Critical "Intensive Use" Features
Secure AI Parsing: Implement a backend API route /api/import that handles file uploads (PDF/Images/TXT). It must use Gemini to extract structured data and perform an upsert (Update or Insert) in the database based on the candidate's email to prevent duplicates.
Optimistic UI Updates: Use TanStack Query to implement optimistic updates for pipeline stage changes (drag-and-drop). The UI should update immediately, with a rollback mechanism if the database write fails.
Real-Time Sync: Integrate Supabase Realtime so that if multiple recruiters are using the app, the pipeline board updates instantly for everyone.
Robust Error Boundaries: Implement global and component-level Error Boundaries. Every API call must have a try/catch block with user-friendly toast notifications (using sonner or react-hot-toast).
Loading States: Use Skeleton screens and Lucide-React spinners for all asynchronous actions to ensure the app feels "snappy" during intensive use.
4. UI/UX Design (High-Density Dashboard)
Theme: "Dark Luxury" (Background: #0A0A0A, Primary: #10B981 Emerald).
Pipeline Board: A high-density Kanban board with horizontal scrolling. Each card must show a "Strength Score" and "Risk Badge".
Candidate Workspace: A split-view layout.
Left: Profile details with inline editing.
Right: Scrollable chat transcript with a "Legal Audit" overlay that highlights compliance risks using AI.
5. Vercel Deployment & Distribution Instructions
Environment Variables: Use DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and GEMINI_API_KEY.
Deployment Flow:
Initialize Supabase project and run Prisma migrations (npx prisma migrate dev).
Connect GitHub repo to Vercel.
Add Environment Variables in Vercel Dashboard.
Deploy.
