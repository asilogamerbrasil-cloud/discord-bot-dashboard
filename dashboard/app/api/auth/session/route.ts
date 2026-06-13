import { NextResponse } from 'next/server';
import { obterSessao, destruirSessao } from '@/lib/auth';

export async function GET() {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: sessao.id,
      name: sessao.nome,
      image: sessao.avatar,
    },
  });
}

export async function DELETE() {
  await destruirSessao();
  return NextResponse.json({ ok: true });
}
