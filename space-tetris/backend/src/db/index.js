import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

export function initDb() {
  const dbPath = process.env.DB_PATH || join(__dirname, "../../data/space-tetris.db");
  const dataDir = dirname(dbPath);
  mkdirSync(dataDir, { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  db.exec(schema);

  console.log(`Database initialized at ${dbPath}`);
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
