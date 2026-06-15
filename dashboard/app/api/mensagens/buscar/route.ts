import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

function gerarAuthShopee(appId: string, appSecret: string, bodyString: string): string {
  const t = Math.floor(Date.now() / 1000);
  return `SHA256 Credential=${appId},Timestamp=${t},Signature=${createHash('sha256').update(`${appId}${t}${bodyString}${appSecret}`, 'utf8').digest('hex')}`;
}

interface ProdutoBruto {
  itemId: number; productName: string; price: string; priceMin: string; priceMax: string;
  priceDiscountRate: number; sales: number; ratingStar: string; shopName: string;
  shopType: number; offerLink: string; productLink: string; imageUrl: string;
  productCatIds: number[];
}

interface ProdutoFiltrado {
  itemId: number; productName: string; price: number; priceMin: number; priceMax: number;
  priceDiscountRate: number; sales: number; rating: number; shopName: string;
  shopType: number; offerLink: string; imageUrl: string; tag: string;
}

const MIN_SALES = 10;
const MIN_RATING = 4.0;

// shopType com _CB = Cross Border (internacional) -> excluir
// SHOPEE_MALL_CB=2, C2C_CB=4, PREFERRED_CB=6
const CB_SHOP_TYPES = new Set([2, 4, 6]);

const STOPWORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'para', 'com', 'sem', 'em', 'por', 'a', 'o', 'e', 'que', 'no', 'na', 'os', 'as', 'um', 'uma']);

function filtrarBrasil(produtos: ProdutoBruto[]): ProdutoBruto[] {
  return produtos.filter(p => !CB_SHOP_TYPES.has(p.shopType));
}

function filtrarVendas(produtos: ProdutoBruto[], min: number): ProdutoBruto[] {
  return produtos.filter(p => p.sales >= min);
}

function filtrarAvaliacao(produtos: ProdutoBruto[], min: number): ProdutoBruto[] {
  return produtos.filter(p => {
    const r = parseFloat(p.ratingStar) || 0;
    return r >= min;
  });
}

function filtrarRelevancia(produtos: ProdutoBruto[], tag: string): ProdutoBruto[] {
  const palavras = tag.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  if (palavras.length === 0) return produtos;
  return produtos.filter(p => {
    const nome = p.productName.toLowerCase();
    return palavras.some(w => nome.includes(w));
  });
}

function ordenar(produtos: ProdutoFiltrado[], criterio: string): ProdutoFiltrado[] {
  switch (criterio) {
    case 'preco': return [...produtos].sort((a, b) => a.price - b.price);
    case 'vendas': return [...produtos].sort((a, b) => b.sales - a.sales);
    case 'estrelas': return [...produtos].sort((a, b) => b.rating - a.rating);
    case 'promocao': return [...produtos].sort((a, b) => b.priceDiscountRate - a.priceDiscountRate);
    default: return produtos;
  }
}

async function buscarTag(keyword: string, appId: string, appSecret: string, limit: number): Promise<ProdutoBruto[]> {
  const query = `query { productOfferV2(keyword: "${keyword.replace(/"/g, '\\"')}", limit: ${limit}) { nodes { itemId productName price priceMin priceMax priceDiscountRate sales ratingStar shopName shopType offerLink productLink imageUrl productCatIds } } }`;
  const body = { query };
  const bodyString = JSON.stringify(body);

  try {
    const auth = gerarAuthShopee(appId, appSecret, bodyString);
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': auth }, body: bodyString,
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.errors) return [];
    return (json.data?.productOfferV2?.nodes || []) as ProdutoBruto[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tags, quantidade, ordenacao } = body as { tags: string[]; quantidade: number; ordenacao: string };

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ erro: 'Tags obrigatorias' }, { status: 400 });
    }

    const qtd = Math.min(Math.max(quantidade || 4, 2), 10);
    const ordem = ordenacao || 'promocao';

    const db = getDb();
    const shopee = await db.select().from(integracoes).where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true))).limit(1);
    if (shopee.length === 0 || !shopee[0].contaId || !shopee[0].accessToken) {
      return NextResponse.json({ erro: 'Shopee nao conectada' }, { status: 400 });
    }

    const { contaId, accessToken } = shopee[0];
    const resultados: { tag: string; produtos: ProdutoFiltrado[] }[] = [];

    for (const tag of tags) {
      console.log(`[Buscar] Tag "${tag}": buscando ${qtd * 5} produtos...`);

      const brutos = await buscarTag(tag, contaId, accessToken, qtd * 5);
      console.log(`[Buscar] "${tag}": ${brutos.length} brutos`);

      const br = filtrarBrasil(brutos);
      console.log(`[Buscar] "${tag}": ${br.length} apos filtro BR (removidos ${brutos.length - br.length} cross-border)`);

      const vendas = filtrarVendas(br, MIN_SALES);
      console.log(`[Buscar] "${tag}": ${vendas.length} apos filtro vendas (min ${MIN_SALES})`);

      const avaliados = filtrarAvaliacao(vendas, MIN_RATING);
      console.log(`[Buscar] "${tag}": ${avaliados.length} apos filtro avaliacao (min ${MIN_RATING})`);

      const relevantes = filtrarRelevancia(avaliados, tag);
      console.log(`[Buscar] "${tag}": ${relevantes.length} apos filtro relevancia`);

      const mapeados: ProdutoFiltrado[] = relevantes.map(p => ({
        itemId: p.itemId,
        productName: p.productName,
        price: parseFloat(p.price) || 0,
        priceMin: parseFloat(p.priceMin) || 0,
        priceMax: parseFloat(p.priceMax) || 0,
        priceDiscountRate: p.priceDiscountRate || 0,
        sales: p.sales,
        rating: parseFloat(p.ratingStar) || 0,
        shopName: p.shopName,
        shopType: p.shopType,
        offerLink: p.offerLink || p.productLink,
        imageUrl: p.imageUrl,
        tag,
      }));

      const ordenados = ordenar(mapeados, ordem);
      const final = ordenados.slice(0, qtd);
      console.log(`[Buscar] "${tag}": ${final.length} final apos ordenacao (${ordem})`);

      resultados.push({ tag, produtos: final });
    }

    return NextResponse.json({ resultados, total: resultados.reduce((s, r) => s + r.produtos.length, 0) });
  } catch (erro) {
    console.error('[Buscar] ERRO:', erro instanceof Error ? erro.message : String(erro));
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
