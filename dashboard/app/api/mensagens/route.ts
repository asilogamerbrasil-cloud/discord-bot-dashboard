import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mensagensProgramadas } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

export async function GET() {
  try {
    const db = getDb();
    const lista = await db.select().from(mensagensProgramadas).orderBy(mensagensProgramadas.criadoEm);
    return NextResponse.json(lista);
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, tipo, mensagem, timerIntervalo, servidoresCanais, shopeePreset } = body;

    const db = getDb();
    const [nova] = await db
      .insert(mensagensProgramadas)
      .values({
        nome: nome || 'Nova Mensagem',
        tipo: tipo || 'manual',
        mensagem: mensagem || '',
        timerIntervalo: timerIntervalo || 3600,
        servidoresCanais: servidoresCanais ? JSON.stringify(servidoresCanais) : null,
        shopeePreset: shopeePreset || null,
      })
      .returning();

    return NextResponse.json(nova, { status: 201 });
  } catch (erro) {
    console.error('Erro ao criar mensagem:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nome, tipo, mensagem, timerIntervalo, servidoresCanais, shopeePreset, ativo } = body;

    if (!id) {
      return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });
    }

    const db = getDb();
    const dados: Record<string, unknown> = { atualizadoEm: new Date() };
    if (nome !== undefined) dados.nome = nome;
    if (tipo !== undefined) dados.tipo = tipo;
    if (mensagem !== undefined) dados.mensagem = mensagem;
    if (timerIntervalo !== undefined) dados.timerIntervalo = timerIntervalo;
    if (servidoresCanais !== undefined) dados.servidoresCanais = JSON.stringify(servidoresCanais);
    if (shopeePreset !== undefined) dados.shopeePreset = shopeePreset;
    if (typeof ativo === 'boolean') dados.ativo = ativo;

    await db.update(mensagensProgramadas).set(dados).where(eq(mensagensProgramadas.id, id));

    const [atualizada] = await db.select().from(mensagensProgramadas).where(eq(mensagensProgramadas.id, id));
    return NextResponse.json(atualizada);
  } catch (erro) {
    console.error('Erro ao atualizar mensagem:', erro);
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
    await db.delete(mensagensProgramadas).where(eq(mensagensProgramadas.id, parseInt(id)));

    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
