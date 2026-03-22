import { Router } from "express";
import { db } from "./db.ts";
import crypto from "crypto";
import { broadcast } from "./ws.ts";
import { GoogleGenAI, Type } from "@google/genai";
import { parseCandidateData } from "./gemini.ts";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export const apiRouter = Router();

apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ORI-CRUIT Hub API", version: "4.0.2" });
});

apiRouter.get("/debug-env", (req, res) => {
  res.json({
    geminiKey: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 5)}...` : null,
    apiKey: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 5)}...` : null,
    allKeys: Object.keys(process.env).filter(k => k.includes('KEY') || k.includes('GEMINI'))
  });
});

apiRouter.get("/debug-env2", (req, res) => {
  res.json({
    geminiKey: process.env.GEMINI_API_KEY,
    nextGeminiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  });
});

apiRouter.get("/debug-env3", (req, res) => {
  res.json(process.env);
});

apiRouter.get("/candidates", (req, res) => {
  try {
    const candidates = db.prepare("SELECT * FROM candidates ORDER BY createdAt DESC").all();
    res.json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

apiRouter.get("/pipeline", (req, res) => {
  try {
    const candidates = db.prepare("SELECT * FROM candidates").all();
    
    // Group by stage
    const pipeline = {
      applied: candidates.filter((c: any) => c.pipelineStage === 'APPLIED'),
      screening: candidates.filter((c: any) => c.pipelineStage === 'SCREENING'),
      interview: candidates.filter((c: any) => c.pipelineStage === 'INTERVIEW'),
      offer: candidates.filter((c: any) => c.pipelineStage === 'OFFER'),
    };
    
    res.json(pipeline);
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

apiRouter.post("/import", async (req, res) => {
  try {
    const { fileData } = req.body;
    if (!fileData) return res.status(400).json({ error: "No fileData provided" });

    const parsed = await parseCandidateData(fileData);
    
    let candidateId;
    
    // Try to find an existing candidate by email, phone, or name
    const existingCandidate = db.prepare(`
      SELECT * FROM candidates 
      WHERE (email != '' AND email = ?) 
         OR (phone != '' AND phone = ?) 
         OR (fullName != '' AND fullName = ?)
    `).get(parsed.email || null, parsed.phone || null, parsed.fullName || null) as any;

    if (existingCandidate) {
      candidateId = existingCandidate.id;
      
      // Merge tags
      let mergedTags = [];
      try {
        const existingTags = existingCandidate.tags ? JSON.parse(existingCandidate.tags) : [];
        const newTags = parsed.tags || [];
        mergedTags = Array.from(new Set([...existingTags, ...newTags]));
      } catch (e) {
        mergedTags = parsed.tags || [];
      }

      // Update existing candidate
      db.prepare(`
        UPDATE candidates SET 
          email = COALESCE(NULLIF(?, ''), email),
          phone = COALESCE(NULLIF(?, ''), phone),
          currentRole = COALESCE(NULLIF(?, ''), currentRole),
          score = MAX(score, ?),
          tags = ?,
          experienceYears = COALESCE(?, experienceYears)
        WHERE id = ?
      `).run(
        parsed.email || "", 
        parsed.phone || "", 
        parsed.currentRole || "", 
        parsed.score || 75, 
        JSON.stringify(mergedTags),
        parsed.experienceYears || null,
        candidateId
      );
    } else {
      candidateId = crypto.randomUUID();
      const insertCandidate = db.prepare(`
        INSERT INTO candidates (id, fullName, email, phone, currentRole, pipelineStage, score, riskLevel, tags, experienceYears)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertCandidate.run(
        candidateId,
        parsed.fullName || "Unknown Candidate",
        parsed.email || "",
        parsed.phone || "",
        parsed.currentRole || "",
        "APPLIED",
        parsed.score || 75,
        parsed.riskLevel || "LOW RISK",
        JSON.stringify(parsed.tags || []),
        parsed.experienceYears || null
      );
    }

    const insertTranscript = db.prepare(`
      INSERT INTO transcripts (id, candidateId, sender, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    if (parsed.transcripts && Array.isArray(parsed.transcripts)) {
      for (const t of parsed.transcripts) {
        insertTranscript.run(
          crypto.randomUUID(),
          candidateId,
          t.sender || "Unknown",
          t.content || "",
          t.timestamp || new Date().toISOString()
        );
      }
    }

    res.json({ success: true, candidateId });
  } catch (error: any) {
    console.error("Import error details:", error?.message || error);
    res.status(500).json({ error: `[V2] ${error?.message || "Failed to import chat"}` });
  }
});

apiRouter.get("/candidates/:id", (req, res) => {
  try {
    const candidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(req.params.id) as any;
    if (!candidate) return res.status(404).json({ error: "Not found" });
    
    const transcripts = db.prepare("SELECT * FROM transcripts WHERE candidateId = ? ORDER BY timestamp ASC").all(req.params.id);
    
    res.json({ ...candidate, transcripts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
});

apiRouter.patch("/candidates/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => updates[f]), id];
    
    const updateStmt = db.prepare(`UPDATE candidates SET ${setClause} WHERE id = ?`);
    const result = updateStmt.run(...values);
    
    if (result.changes === 0) return res.status(404).json({ error: "Candidate not found" });
    
    const updated = db.prepare("SELECT * FROM candidates WHERE id = ?").get(id);
    
    // Broadcast update
    broadcast("CANDIDATE_UPDATED", updated);
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating candidate:", error);
    res.status(500).json({ error: "Failed to update candidate" });
  }
});

apiRouter.post("/candidates", (req, res) => {
  try {
    const { fullName, currentRole, pipelineStage } = req.body;
    if (!fullName) return res.status(400).json({ error: "Full Name is required" });

    const id = crypto.randomUUID();
    const insertStmt = db.prepare(`
      INSERT INTO candidates (id, fullName, currentRole, pipelineStage, score, riskLevel)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      fullName,
      currentRole || "Candidate",
      pipelineStage || "APPLIED",
      75,
      "LOW RISK"
    );

    const newCandidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(id);
    
    // Broadcast update
    broadcast("CANDIDATE_UPDATED", newCandidate);

    res.status(201).json(newCandidate);
  } catch (error) {
    console.error("Error creating candidate:", error);
    res.status(500).json({ error: "Failed to create candidate" });
  }
});

apiRouter.delete("/candidates/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete transcripts first due to foreign key
    db.prepare("DELETE FROM transcripts WHERE candidateId = ?").run(id);
    const result = db.prepare("DELETE FROM candidates WHERE id = ?").run(id);
    
    if (result.changes === 0) return res.status(404).json({ error: "Candidate not found" });
    
    // Broadcast deletion
    broadcast("CANDIDATE_UPDATED", { id, deleted: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    res.status(500).json({ error: "Failed to delete candidate" });
  }
});

apiRouter.patch("/candidates/:id/tags", (req, res) => {
  try {
    const { tags } = req.body;
    db.prepare("UPDATE candidates SET tags = ? WHERE id = ?").run(JSON.stringify(tags), req.params.id);
    const updated = db.prepare("SELECT * FROM candidates WHERE id = ?").get(req.params.id) as any;
    broadcast("CANDIDATE_UPDATED", updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update tags" });
  }
});

apiRouter.post("/candidates/:id/reanalyze", async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(id) as any;
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    const transcripts = db.prepare("SELECT * FROM transcripts WHERE candidateId = ? ORDER BY timestamp ASC").all(id) as any[];
    const chatText = transcripts.map(t => `[${t.timestamp}] ${t.sender}: ${t.content}`).join("\n");

    const parsedData = await parseCandidateData(chatText);

    db.prepare(`
      UPDATE candidates SET 
        fullName = ?,
        email = ?,
        phone = ?,
        currentRole = ?,
        score = ?,
        riskLevel = ?
      WHERE id = ?
    `).run(
      parsedData.fullName,
      parsedData.email || "",
      parsedData.phone || "",
      parsedData.currentRole || "",
      parsedData.score || 75,
      parsedData.riskLevel || "LOW RISK",
      id
    );

    const updatedCandidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(id);
    broadcast("CANDIDATE_UPDATED", updatedCandidate);

    res.json(updatedCandidate);
  } catch (error) {
    console.error("Reanalyze error:", error);
    res.status(500).json({ error: "Failed to reanalyze candidate" });
  }
});

apiRouter.post("/candidates/:id/legal-audit", async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(id) as any;
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    const transcripts = db.prepare("SELECT * FROM transcripts WHERE candidateId = ? ORDER BY timestamp ASC").all(id) as any[];
    const transcriptText = transcripts.map(t => `${t.sender}: ${t.content}`).join("\n");

    const prompt = `Perform a thorough legal and employability audit for the following candidate based on their profile and conversation history.
    
    Candidate Name: ${candidate.fullName}
    Current Role: ${candidate.currentRole}
    
    Conversation History:
    ${transcriptText}
    
    The audit should cover:
    1. Description of their personal case (summary of who they are and their situation).
    2. Current status of employability (skills match, experience level).
    3. Legal problems toward recruitment (any red flags, inconsistencies).
    4. Lack of documents to revise (what's missing based on the conversation).
    5. Actuality of legalization status (work permits, visa status if mentioned).
    6. Overall recommendation for the legal department.
    
    Return the result in a structured JSON format.`;

    const response = await getAiClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personalCaseDescription: { type: Type.STRING },
            employabilityStatus: { type: Type.STRING },
            legalProblems: { type: Type.STRING },
            missingDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
            legalizationStatus: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["CLEARED", "WARNING", "BLOCKED", "PENDING"] }
          },
          required: ["personalCaseDescription", "employabilityStatus", "legalProblems", "missingDocuments", "legalizationStatus", "recommendation", "status"]
        }
      }
    });

    const auditResult = response.text;
    const parsedResult = JSON.parse(auditResult);

    db.prepare("UPDATE candidates SET legalAudit = ?, legalStatus = ?, isLegalCompliant = ? WHERE id = ?")
      .run(auditResult, parsedResult.status, parsedResult.status === "CLEARED" ? 1 : 0, id);

    const updatedCandidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(id);
    broadcast("CANDIDATE_UPDATED", updatedCandidate);

    res.json(parsedResult);
  } catch (error) {
    console.error("Legal audit error:", error);
    res.status(500).json({ error: "Failed to perform legal audit" });
  }
});

apiRouter.post("/audit", (req, res) => {
  try {
    // In a real app, this would trigger a background job
    // For now, we'll just return a success message
    res.json({ message: "Audit started", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to start audit" });
  }
});
