import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes, mensagensProgramadas } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const db = getDb();

    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/bot.db';
    const resolvedPath = path.resolve(process.cwd(), dbPath);

    let fileInfo = null;
    try {
      const stat = fs.statSync(resolvedPath);
      fileInfo = { path: resolvedPath, exists: true, size: stat.size, cwd: process.cwd() };
    } catch {
      fileInfo = { path: resolvedPath, exists: false, size: 0, cwd: process.cwd() };
    }

    const todasIntegracoes = await db.select().from(integracoes);
    const todasMensagens = await db.select().from(mensagensProgramadas);

    const shopeeInt = await db.select().from(integracoes).where(eq(integracoes.plataforma, 'shopee'));

    return NextResponse.json({
      database: fileInfo,
      env_DATABASE_URL: process.env.DATABASE_URL || 'N/A',
      volume_data: (() => {
        try { const f = fs.readdirSync('/data'); return f; } catch { return []; }
      })(),
      integracoes_count: todasIntegracoes.length,
      integracoes_list: todasIntegracoes.map(i => ({ plataforma: i.plataforma, nome: i.nomeConta, ativo: i.ativo, hasToken: !!i.accessToken, hasId: !!i.contaId })),
      shopee: shopeeInt.length > 0 ? { found: true, nome: shopeeInt[0].nomeConta, hasToken: !!shopeeInt[0].accessToken, hasId: !!shopeeInt[0].contaId, ativo: shopeeInt[0].ativo } : { found: false },
      mensagens_count: todasMensagens.length,
    });
  } catch (erro) {
    return NextResponse.json({ erro: String(erro) }, { status: 500 });
  }
}
