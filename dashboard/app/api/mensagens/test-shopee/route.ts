import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  const db = getDb();
  const shopee = await db.select().from(integracoes).where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true))).limit(1);

  if (shopee.length === 0) {
    return NextResponse.json({ status: 'erro', mensagem: 'Shopee nao conectada. Va em Integracoes > Afiliados e conecte.' });
  }

  if (!shopee[0].accessToken || !shopee[0].contaId) {
    return NextResponse.json({ status: 'erro', mensagem: 'Credenciais incompletas.' });
  }

  const query = `{ getCategories { success } }`;
  try {
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'App-Id': shopee[0].contaId, 'App-Secret': shopee[0].accessToken },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      return NextResponse.json({ status: 'erro', mensagem: `Erro HTTP ${res.status}`, detalhes: await res.text().catch(() => '') });
    }

    const json = await res.json();
    if (json.errors) {
      return NextResponse.json({ status: 'erro', mensagem: 'Erro GraphQL', detalhes: json.errors });
    }

    return NextResponse.json({ status: 'ok', mensagem: 'API Shopee funcionando!', appId: shopee[0].contaId });
  } catch (erro) {
    return NextResponse.json({ status: 'erro', mensagem: 'Erro de conexao', detalhes: String(erro) });
  }
}
