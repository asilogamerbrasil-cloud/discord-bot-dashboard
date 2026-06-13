import './env';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '../bot/data/bot.db';
  const resolvedPath = path.resolve(process.cwd(), dbPath);

  const sqlite = new Database(resolvedPath);
  sqlite.pragma('journal_mode = WAL');

  _db = drizzle(sqlite);
  return _db;
}
