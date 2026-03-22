# ORI-CRUIT Hub

A modern recruitment platform built with React, Node.js, Express, and SQLite.

## Features

- **Candidate Pipeline**: Manage candidates across different stages (Applied, Screening, Interview, Offer).
- **Candidate Workspace**: Detailed view of candidate profiles, transcripts, and legal compliance.
- **AI Legal Audit**: Integrated with Gemini API to perform automated legal and employability audits based on candidate transcripts.
- **Real-time Updates**: WebSockets ensure that all connected clients see updates instantly.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Prerequisites

- Node.js 22+
- npm

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Production Deployment

### Option 1: Node.js

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

### Option 2: Docker

1. Build the Docker image:
   ```bash
   docker build -t oricruit-hub .
   ```

2. Run the Docker container:
   ```bash
   docker run -p 3000:3000 -e GEMINI_API_KEY=your_gemini_api_key_here -v $(pwd)/data:/app/data oricruit-hub
   ```
   *Note: The `-v $(pwd)/data:/app/data` flag ensures that your SQLite database is persisted on your host machine.*

## Architecture

- **Frontend**: React 19, Tailwind CSS, shadcn/ui components, Framer Motion, TanStack Query.
- **Backend**: Express.js, native WebSockets (`ws`).
- **Database**: SQLite (`better-sqlite3`).
- **AI**: Google Gemini API (`@google/genai`).
