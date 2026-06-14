import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mensagensProgramadas, integracoes } from '@/lib/schema';
import { eq, and, lt, or } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

const SHOPEE_PRESETS: Record<string, { nome: string; keywords: string[] }> = {
  games_promo: { nome: 'Computadores Gamer em Promocao', keywords: ['computador gamer', 'pc gamer', 'notebook gamer'] },
  games_vendidos: { nome: 'Computadores Mais Vendidos', keywords: ['computador gamer', 'pc gamer', 'notebook gamer'] },
  hardware: { nome: 'Hardware em Alta', keywords: ['placa de video', 'memoria ram ddr', 'ssd nvme', 'processador'] },
  perifericos: { nome: 'Perifericos em Alta', keywords: ['mouse gamer', 'headset gamer', 'teclado mecanico', 'monitor gamer'] },
  geral: { nome: 'Tecnologia & Games', keywords: ['computador gamer', 'placa de video', 'mouse gamer', 'headset', 'monitor', 'teclado', 'ssd', 'memoria ram', 'cadeira gamer', 'notebook', 'processador', 'fone bluetooth'] },
};

async function buscarProdutosShopee(keyword: string, appId: string, appSecret: string, orderBy = 'commission') {
  const query = `
    query Search($keyword: String!, $pageSize: Int, $orderBy: String) {
      searchProduct(keyword: $keyword, pageSize: 2, orderBy: $orderBy) {
        success
        data {
          products {
            productId
            productName
            productImage
            price
            originalPrice
            discount
            rating
            soldCount
            commissionRate
            shopName
          }
        }
      }
    }
  `;

  const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Id': appId,
      'App-Secret': appSecret,
    },
    body: JSON.stringify({ query, variables: { keyword, pageSize: 2 } }),
  });

  if (!res.ok) return [];
  const json = await res.json();
  if (json.errors) return [];
  return (json.data?.searchProduct?.data?.products || []) as Array<{
    productId: string; productName: string; productImage: string;
    price: number; originalPrice: number; discount: number;
    rating: number; soldCount: number; commissionRate: number; shopName: string;
  }>;
}

async function gerarLinkAfiliado(productId: string, appId: string, appSecret: string): Promise<string> {
  const query = `
    query Link($productId: String!) {
      generateAffiliateLink(productId: $productId) {
        success
        data { affiliateLink shortLink }
      }
    }
  `;

  const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Id': appId,
      'App-Secret': appSecret,
    },
    body: JSON.stringify({ query, variables: { productId } }),
  });

  if (!res.ok) return '';
  const json = await res.json();
  if (json.errors) return '';
  return json.data?.generateAffiliateLink?.data?.shortLink || json.data?.generateAffiliateLink?.data?.affiliateLink || '';
}

function formatarMoeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function gerarEmojiAleatorio(): string {
  const emojis = ['🔥', '⚡', '💥', '🚀', '🎮', '💻', '🖥️', '🛒', '💎', '✨', '🎯', '💪', '👾', '🕹️'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

async function montarMensagemShopee(
  presetKey: string,
  appId: string,
  appSecret: string
): Promise<{ mensagem: string; embeds: Array<Record<string, unknown>> } | null> {
  const preset = SHOPEE_PRESETS[presetKey];
  if (!preset) return null;

  const keyword = preset.keywords[Math.floor(Math.random() * preset.keywords.length)];
  const orderBy = presetKey === 'games_vendidos' ? 'sales' : 'commission';

  const produtos = await buscarProdutosShopee(keyword, appId, appSecret, orderBy);
  if (produtos.length === 0) return null;

  const melhores = produtos
    .filter(p => p.discount > 0 || p.commissionRate > 1)
    .slice(0, 5);

  if (melhores.length === 0) return null;

  const emoji = gerarEmojiAleatorio();
  const embeds = [];

  for (const p of melhores) {
    const link = await gerarLinkAfiliado(p.productId, appId, appSecret);
    const descricao = [
      `💰 De: ~~${formatarMoeda(p.originalPrice)}~~ **${formatarMoeda(p.price)}**`,
      `📉 ${p.discount}% OFF | ⭐ ${p.rating.toFixed(1)}`,
      `🛒 ${p.soldCount.toLocaleString()} vendidos | 💵 ${p.commissionRate}% comissao`,
    ].join('\n');

    embeds.push({
      color: 0xEE4D2D,
      title: `${emoji} ${p.productName}`,
      url: link,
      description: descricao,
      thumbnail: p.productImage ? { url: p.productImage } : undefined,
      footer: { text: `Loja: ${p.shopName} | Shopee Afiliados` },
      timestamp: new Date().toISOString(),
    });
  }

  const mensagem = `# ${emoji} ${preset.nome} ${emoji}\n\nConfira as melhores ofertas que selecionei pra voce! 🔥\n\n👇 Clique nos links abaixo e aproveite:`;

  return { mensagem, embeds };
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const agora = new Date();

    const ativas = await db
      .select()
      .from(mensagensProgramadas)
      .where(eq(mensagensProgramadas.ativo, true));

    const pendentes = await Promise.all(
      ativas.map(async (m) => {
        if (!m.servidoresCanais) return null;

        const canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }> =
          JSON.parse(m.servidoresCanais);

        if (canais.length === 0) return null;

        const ultimo = m.ultimoEnvio ? new Date(m.ultimoEnvio) : null;
        const intervaloMs = m.timerIntervalo * 1000;

        if (ultimo && (agora.getTime() - ultimo.getTime()) < intervaloMs) return null;

        let conteudo: { mensagem: string; embeds?: Array<Record<string, unknown>> } = { mensagem: m.mensagem };

        if (m.tipo === 'shopee_preset' && m.shopeePreset) {
          const shopeeIntegracao = await db
            .select()
            .from(integracoes)
            .where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true)))
            .limit(1);

          if (shopeeIntegracao.length === 0 || !shopeeIntegracao[0].accessToken || !shopeeIntegracao[0].contaId) {
            return null;
          }

          const shopee = shopeeIntegracao[0];
          const resultado = await montarMensagemShopee(
            m.shopeePreset!,
            shopee.contaId!,
            shopee.accessToken!
          );

          if (!resultado) return null;
          conteudo = { mensagem: resultado.mensagem, embeds: resultado.embeds };
        }

        return {
          id: m.id,
          mensagem: conteudo.mensagem,
          embeds: conteudo.embeds || [],
          canais,
        };
      })
    );

    const resultado = pendentes.filter(Boolean);

    for (const p of resultado) {
      if (!p) continue;
      await db
        .update(mensagensProgramadas)
        .set({ ultimoEnvio: new Date() })
        .where(eq(mensagensProgramadas.id, p.id));
    }

    return NextResponse.json({ pendentes: resultado });
  } catch (erro) {
    console.error('Erro ao buscar pendentes:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
