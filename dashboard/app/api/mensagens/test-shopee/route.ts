import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

function gerarAuthShopee(appId: string, appSecret: string, bodyString: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const factor = `${appId}${timestamp}${bodyString}${appSecret}`;
  const signature = createHash('sha256').update(factor, 'utf8').digest('hex');
  return `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`;
}

export async function GET() {
  const db = getDb();
  const shopee = await db.select().from(integracoes).where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true))).limit(1);

  if (shopee.length === 0) {
    return NextResponse.json({ status: 'erro', mensagem: 'Shopee nao conectada. Va em Integracoes > Afiliados e conecte.' });
  }

  if (!shopee[0].accessToken || !shopee[0].contaId) {
    return NextResponse.json({ status: 'erro', mensagem: 'Credenciais incompletas.' });
  }

  const query = `query($keyword: String!, $limit: Int) { productOfferV2(keyword: $keyword, limit: $limit) { nodes { productName } } }`;
  const body = { query, variables: { keyword: 'teste', limit: 1 } };
  const bodyString = JSON.stringify(body);

  try {
    const auth = gerarAuthShopee(shopee[0].contaId, shopee[0].accessToken, bodyString);
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: bodyString,
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
