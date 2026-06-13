import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { configuracaoGeral } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { atualizarBotPerfil } from '@/lib/discord-api';
import { z } from 'zod';

const schemaAtualizacao = z.object({
  nomeBot: z.string().min(2).max(32).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  bio: z.string().max(190).optional(),
  status: z.enum(['online', 'idle', 'dnd', 'invisible']).optional(),
  atividade: z.string().max(128).optional(),
});

export async function GET() {
  try {
    const db = getDb();
    let config = await db.select().from(configuracaoGeral).limit(1);

    if (config.length === 0) {
      const [inserida] = await db.insert(configuracaoGeral).values({}).returning();
      return NextResponse.json(inserida);
    }

    return NextResponse.json(config[0]);
  } catch (erro) {
    console.error('Erro ao buscar configuracao:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const dados = schemaAtualizacao.parse(body);

    const db = getDb();

    let config = await db.select().from(configuracaoGeral).limit(1);

    if (config.length === 0) {
      const [nova] = await db.insert(configuracaoGeral).values({}).returning();
      config = [nova];
    }

    const valoresAtualizados = {
      ...dados,
      atualizadoEm: new Date(),
    };

    await db
      .update(configuracaoGeral)
      .set(valoresAtualizados)
      .where(eq(configuracaoGeral.id, config[0].id));

    try {
      await atualizarBotPerfil({
        username: dados.nomeBot,
        avatar: dados.avatarUrl ? await urlParaBase64(dados.avatarUrl) : undefined,
        banner: dados.bannerUrl ? await urlParaBase64(dados.bannerUrl) : undefined,
      });
    } catch (erroDiscord) {
      console.error('Erro ao atualizar Discord:', erroDiscord);
    }

    const [atualizada] = await db
      .select()
      .from(configuracaoGeral)
      .where(eq(configuracaoGeral.id, config[0].id));

    return NextResponse.json(atualizada);
  } catch (erro) {
    if (erro instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados invalidos', detalhes: erro.errors }, { status: 400 });
    }
    console.error('Erro ao atualizar configuracao:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

async function urlParaBase64(url: string): Promise<string> {
  const resposta = await fetch(url);
  const buffer = await resposta.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = resposta.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${base64}`;
}
