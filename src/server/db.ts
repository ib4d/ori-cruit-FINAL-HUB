import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const DB_PATH = process.env.DB_PATH ?? './data/oricruit.db'
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      currentRole TEXT,
      pipelineStage TEXT DEFAULT 'APPLIED',
      isLegalCompliant INTEGER DEFAULT 0,
      legalAudit TEXT,
      legalStatus TEXT DEFAULT 'PENDING',
      score INTEGER DEFAULT 0,
      riskLevel TEXT DEFAULT 'LOW RISK',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      candidateId TEXT,
      sender TEXT,
      content TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(candidateId) REFERENCES candidates(id)
    );
  `);

  // Add missing columns if they don't exist
  try {
    db.exec("ALTER TABLE candidates ADD COLUMN tags TEXT;");
  } catch (e) {
    // Column might already exist
  }
  try {
    db.exec("ALTER TABLE candidates ADD COLUMN experienceYears INTEGER;");
  } catch (e) {
    // Column might already exist
  }

  // Seed initial data if empty
  const count = db.prepare("SELECT COUNT(*) as count FROM candidates").get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO candidates (id, fullName, currentRole, pipelineStage, score, riskLevel)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run("1", "Jameson Dax", "Senior Infrastructure Engineer", "APPLIED", 94, "LOW RISK");
    insert.run("2", "Elena Lund", "Staff Product Designer", "APPLIED", 88, "NOTICE PERIOD");
    insert.run("3", "Alex Rivera", "Fullstack Developer", "SCREENING", 92, "QUALIFIED");
    insert.run("4", "Elena Sokolov", "Cloud Architect", "INTERVIEW", 95, "COMPETING OFFER");
    insert.run("5", "David Wilson", "DevOps Lead", "OFFER", 98, "CONTRACT SENT");
  }

  const tCount = db.prepare("SELECT COUNT(*) as count FROM transcripts").get() as { count: number };
  if (tCount.count === 0) {
    const insertTranscript = db.prepare(`
      INSERT INTO transcripts (id, candidateId, sender, content)
      VALUES (?, ?, ?, ?)
    `);
    insertTranscript.run("t1", "1", "Candidate", "Hi, I'm Jameson. I'm interested in the Senior Infrastructure Engineer role.");
    insertTranscript.run("t2", "1", "Recruiter", "Hi Jameson! Thanks for reaching out. Could you share your resume?");
    insertTranscript.run("t3", "1", "Candidate", "Sure, I've attached it here. I have 8 years of experience with Kubernetes and AWS.");
  }
}
