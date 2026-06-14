import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

export async function GET() {
  try {
    const db = getDb();
    const lista = await db.select().from(integracoes).orderBy(integracoes.criadoEm);
    return NextResponse.json(lista);
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { plataforma, nomeConta, avatarUrl, contaId, accessToken, refreshToken, tokenExpira } = await req.json();

    if (!plataforma) {
      return NextResponse.json({ erro: 'Plataforma obrigatoria' }, { status: 400 });
    }

    const db = getDb();

    const existente = await db
      .select()
      .from(integracoes)
      .where(eq(integracoes.plataforma, plataforma))
      .limit(1);

    if (existente.length > 0) {
      await db
        .update(integracoes)
        .set({
          nomeConta: nomeConta || existente[0].nomeConta,
          avatarUrl: avatarUrl || existente[0].avatarUrl,
          contaId: contaId || existente[0].contaId,
          accessToken: accessToken || existente[0].accessToken,
          refreshToken: refreshToken || existente[0].refreshToken,
          tokenExpira: tokenExpira ? new Date(tokenExpira) : existente[0].tokenExpira,
          atualizadoEm: new Date(),
        })
        .where(eq(integracoes.id, existente[0].id));

      const [atualizada] = await db
        .select()
        .from(integracoes)
        .where(eq(integracoes.id, existente[0].id));

      return NextResponse.json(atualizada);
    }

    const [nova] = await db
      .insert(integracoes)
      .values({
        plataforma,
        nomeConta,
        avatarUrl,
        contaId,
        accessToken,
        refreshToken,
        tokenExpira: tokenExpira ? new Date(tokenExpira) : null,
      })
      .returning();

    return NextResponse.json(nova, { status: 201 });
  } catch (erro) {
    console.error('Erro ao salvar integracao:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ativo, webhookUrl, mensagemTemplate } = await req.json();
    
    if (!id) {
      return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });
    }

    const db = getDb();
    const dados: Record<string, unknown> = { atualizadoEm: new Date() };
    if (typeof ativo === 'boolean') dados.ativo = ativo;
    if (webhookUrl !== undefined) dados.webhookUrl = webhookUrl;
    if (mensagemTemplate !== undefined) dados.mensagemTemplate = mensagemTemplate;

    await db.update(integracoes).set(dados).where(eq(integracoes.id, id));

    const [atualizada] = await db.select().from(integracoes).where(eq(integracoes.id, id));
    return NextResponse.json(atualizada);
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });
    }

    const db = getDb();
    await db.delete(integracoes).where(eq(integracoes.id, parseInt(id)));

    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
