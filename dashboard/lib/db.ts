import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: ReturnType<typeof drizzle> | null = null;

function criarTabelas(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS configuracao_geral (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_bot TEXT NOT NULL DEFAULT 'Meu Bot',
      avatar_url TEXT,
      banner_url TEXT,
      bio TEXT DEFAULT 'Ola! Sou um bot gerenciado pelo painel.',
      status TEXT NOT NULL DEFAULT 'online',
      atividade TEXT DEFAULT '{servidores} servidores',
      criado_em INTEGER NOT NULL,
      atualizado_em INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS administradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      adicionado_em INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plataforma TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expira INTEGER,
      nome_conta TEXT,
      avatar_url TEXT,
      conta_id TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      webhook_url TEXT,
      mensagem_template TEXT DEFAULT 'Novo conteudo no {plataforma}!\n\n{titulo}\n{url}',
      metadata TEXT,
      criado_em INTEGER NOT NULL,
      atualizado_em INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mensagens_programadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL DEFAULT 'Nova Mensagem',
      tipo TEXT NOT NULL DEFAULT 'manual',
      mensagem TEXT NOT NULL DEFAULT '',
      timer_intervalo INTEGER NOT NULL DEFAULT 3600,
      servidores_canais TEXT,
      shopee_preset TEXT,
      ultimo_envio INTEGER,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em INTEGER NOT NULL,
      atualizado_em INTEGER NOT NULL
    );
  `);
}

export function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/bot.db';
  const resolvedPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(resolvedPath);
  sqlite.pragma('journal_mode = WAL');

  criarTabelas(sqlite);

  _db = drizzle(sqlite);
  return _db;
}
