import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mensagensProgramadas, integracoes, envioLogs } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

interface ShopeeProduct {
  productId: string; productName: string; productImage: string;
  price: number; originalPrice: number; discount: number;
  rating: number; soldCount: number; commissionRate: number; shopName: string;
}

interface ShopeePresetDef {
  nome: string; emoji: string; cor: number;
  keywords: string[]; categoria: string; defaultOrdenacao: string;
}

const SHOPEE_PRESETS: Record<string, ShopeePresetDef> = {
  top5_monitores:       { nome: 'Top 5 do Mes em Monitores',      emoji: '🏆', cor: 0xF1C40F, keywords: ['monitor gamer', 'monitor 144hz', 'monitor 4k', 'monitor curvo', 'monitor ultrawide'],         categoria: 'monitores',     defaultOrdenacao: 'sales' },
  promocoes_hardware:   { nome: 'Promocoes em Hardware',          emoji: '🔥', cor: 0xE74C3C, keywords: ['placa de video', 'processador', 'memoria ram', 'ssd', 'fonte', 'placa mae', 'water cooler'], categoria: 'hardware',     defaultOrdenacao: 'discount' },
  pcs_gamers_baratos:   { nome: 'PCs Gamers Mais Baratos do Mes', emoji: '💻', cor: 0x3498DB, keywords: ['pc gamer', 'computador gamer', 'notebook gamer'],                                        categoria: 'computadores',  defaultOrdenacao: 'price_asc' },
  mais_vendidos_games:  { nome: 'Mais Vendidos em Games',         emoji: '🎮', cor: 0x9B59B6, keywords: ['jogo ps5', 'jogo ps4', 'jogo xbox', 'jogo switch', 'controle', 'cadeira gamer'],       categoria: 'games',        defaultOrdenacao: 'sales' },
  ofertas_relampago:    { nome: 'Ofertas Relampago',              emoji: '⚡', cor: 0xE67E22, keywords: ['promocao', 'oferta', 'desconto', 'queima estoque'],                                       categoria: 'geral',        defaultOrdenacao: 'discount' },
  perifericos_destaque: { nome: 'Perifericos em Destaque',        emoji: '🖱️', cor: 0x1ABC9C, keywords: ['mouse gamer', 'headset gamer', 'teclado mecanico', 'mousepad', 'microfone', 'webcam'],  categoria: 'perifericos',   defaultOrdenacao: 'sales' },
  achadinhos_dia:       { nome: 'Achadinhos do Dia',              emoji: '📦', cor: 0x2ECC71, keywords: ['promocao shopee', 'cupom', 'frete gratis', 'mais vendidos'],                              categoria: 'geral',        defaultOrdenacao: 'discount' },
};

function formatarMoeda(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}`; }
function emojiAleatorio() { const e = ['🔥','⚡','💥','🚀','🎮','💻','🖥️','🛒','💎','✨','🎯','💪','👾','🕹️']; return e[Math.floor(Math.random()*e.length)]; }

async function buscarProdutosShopee(keyword: string, appId: string, appSecret: string, orderBy: string, pageSize = 3): Promise<ShopeeProduct[]> {
  const query = `
    query Search($keyword: String!, $pageSize: Int, $orderBy: String) {
      searchProduct(keyword: $keyword, pageSize: $pageSize, orderBy: $orderBy) {
        success
        data { products { productId productName productImage price originalPrice discount rating soldCount commissionRate shopName } }
      }
    }`;
  const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'App-Id': appId, 'App-Secret': appSecret },
    body: JSON.stringify({ query, variables: { keyword, pageSize } }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  if (json.errors) return [];
  return (json.data?.searchProduct?.data?.products || []) as ShopeeProduct[];
}

async function gerarLinkAfiliado(productId: string, appId: string, appSecret: string): Promise<string> {
  const query = `query Link($productId: String!) { generateAffiliateLink(productId: $productId) { success data { affiliateLink shortLink } } }`;
  const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'App-Id': appId, 'App-Secret': appSecret },
    body: JSON.stringify({ query, variables: { productId } }),
  });
  if (!res.ok) return '';
  const json = await res.json();
  if (json.errors) return '';
  return json.data?.generateAffiliateLink?.data?.shortLink || json.data?.generateAffiliateLink?.data?.affiliateLink || '';
}

async function getProdutosEvitados(mensagemId: number, db: ReturnType<typeof getDb>): Promise<string[]> {
  try {
    const logs = await db.select().from(envioLogs).where(eq(envioLogs.mensagemId, mensagemId)).orderBy(desc(envioLogs.criadoEm)).limit(3);
    const ids = new Set<string>();
    for (const l of logs) {
      try { const arr = JSON.parse(l.produtosEnviados); arr.forEach((id: string) => ids.add(id)); } catch {}
    }
    return [...ids];
  } catch { return []; }
}

async function montarMensagemShopee(
  presetKey: string, appId: string, appSecret: string, config: {
    qtdProdutos?: number; ordenacao?: string; cta?: string; mensagemId?: number;
  } = {}, db: ReturnType<typeof getDb>
): Promise<{ mensagem: string; embeds: Array<Record<string, unknown>>; presetKey: string; produtosIds: string[] } | null> {
  const preset = SHOPEE_PRESETS[presetKey];
  if (!preset) return null;

  const qtd = config.qtdProdutos || 4;
  const orderBy = config.ordenacao || preset.defaultOrdenacao;
  const cta = config.cta || 'Comprar Agora 🛒';
  const keyword = preset.keywords[Math.floor(Math.random() * preset.keywords.length)];

  const produtos = await buscarProdutosShopee(keyword, appId, appSecret, orderBy, qtd + 3);
  if (produtos.length === 0) return null;

  const evitados = config.mensagemId ? await getProdutosEvitados(config.mensagemId, db) : [];
  const filtrados = produtos.filter(p => !evitados.includes(p.productId));
  const pool = filtrados.length >= qtd ? filtrados : produtos;
  const melhores = pool.slice(0, qtd);

  if (melhores.length === 0) return null;

  const embeds = [];
  const produtosIds: string[] = [];

  for (let i = 0; i < melhores.length; i++) {
    const p = melhores[i];
    const link = await gerarLinkAfiliado(p.productId, appId, appSecret);
    produtosIds.push(p.productId);

    const fields = [];
    fields.push({ name: '💰 Preco', value: `~~${formatarMoeda(p.originalPrice)}~~ **${formatarMoeda(p.price)}**`, inline: true });
    fields.push({ name: '📉 Desconto', value: `${p.discount}% OFF`, inline: true });
    if (p.commissionRate > 0) fields.push({ name: '💵 Comissao', value: `${p.commissionRate}%`, inline: true });

    embeds.push({
      color: preset.cor,
      author: { name: `${i + 1}. ${p.productName.substring(0, 60)}${p.productName.length > 60 ? '...' : ''}` },
      description: `⭐ ${p.rating.toFixed(1)} | 🛒 ${p.soldCount.toLocaleString()} vendidos | Loja: ${p.shopName}`,
      fields,
      thumbnail: p.productImage ? { url: p.productImage } : undefined,
      footer: { text: 'Oferta via Shopee Afiliados • Clique no link abaixo' },
      timestamp: new Date().toISOString(),
    });
  }

  const mensagem = `# ${preset.emoji} ${preset.nome} ${preset.emoji}\n\n${cta}\n\n👇 **Clique nos links abaixo e aproveite:**`;

  return { mensagem, embeds, presetKey, produtosIds };
}

function selecionarPresetRotacao(
  config: { modoRotacao?: string; presetsSelecionados?: string[]; ultimaKey?: string } | null,
  presetAtual: string
): string {
  if (!config || !config.modoRotacao || config.modoRotacao === 'fixo') return presetAtual;
  const pool = config.presetsSelecionados || [presetAtual];
  if (pool.length === 0) return presetAtual;
  if (config.modoRotacao === 'randomico') return pool[Math.floor(Math.random() * pool.length)];
  if (config.modoRotacao === 'sequencial') {
    const idx = pool.indexOf(config.ultimaKey || '');
    const nextIdx = (idx + 1) % pool.length;
    return pool[nextIdx] || presetAtual;
  }
  return presetAtual;
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const agora = new Date();
    const ativas = await db.select().from(mensagensProgramadas).where(eq(mensagensProgramadas.ativo, true));

    const pendentes = await Promise.all(ativas.map(async (m) => {
      if (!m.servidoresCanais) return null;
      const canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }> = JSON.parse(m.servidoresCanais);
      if (canais.length === 0) return null;
      const ultimo = m.ultimoEnvio ? new Date(m.ultimoEnvio) : null;
      if (ultimo && (agora.getTime() - ultimo.getTime()) < m.timerIntervalo * 1000) return null;

      let conteudo: { mensagem: string; embeds?: Array<Record<string, unknown>> } = { mensagem: m.mensagem };
      let presetKeyUsada = '';

      if (m.tipo === 'shopee_preset') {
        const shopeeInt = await db.select().from(integracoes).where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true))).limit(1);
        if (shopeeInt.length === 0 || !shopeeInt[0].accessToken || !shopeeInt[0].contaId) return null;

        let shopeeConfig: { modoRotacao?: string; presetsSelecionados?: string[]; ultimaKey?: string; qtdProdutos?: number; ordenacao?: string; cta?: string } | null = null;
        try { if (m.shopeeConfig) shopeeConfig = JSON.parse(m.shopeeConfig); } catch {}

        const presetAtual = selecionarPresetRotacao(shopeeConfig, m.shopeePreset || 'achadinhos_dia');
        const resultado = await montarMensagemShopee(presetAtual, shopeeInt[0].contaId!, shopeeInt[0].accessToken!, {
          qtdProdutos: shopeeConfig?.qtdProdutos || 4,
          ordenacao: shopeeConfig?.ordenacao,
          cta: shopeeConfig?.cta,
          mensagemId: m.id,
        }, db);

        if (!resultado) return null;

        if (shopeeConfig && shopeeConfig.modoRotacao === 'sequencial') {
          shopeeConfig.ultimaKey = presetAtual;
          await db.update(mensagensProgramadas).set({ shopeeConfig: JSON.stringify(shopeeConfig) }).where(eq(mensagensProgramadas.id, m.id));
        }

        await db.insert(envioLogs).values({ mensagemId: m.id, presetKey: presetAtual, produtosEnviados: JSON.stringify(resultado.produtosIds) });

        conteudo = { mensagem: resultado.mensagem, embeds: resultado.embeds };
        presetKeyUsada = presetAtual;
      }

      return { id: m.id, mensagem: conteudo.mensagem, embeds: conteudo.embeds || [], canais, presetKey: presetKeyUsada };
    }));

    return NextResponse.json({ pendentes: pendentes.filter(Boolean) });
  } catch (erro) {
    console.error('Erro ao buscar pendentes:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });
    const db = getDb();
    await db.update(mensagensProgramadas).set({ ultimoEnvio: new Date() }).where(eq(mensagensProgramadas.id, id));
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao confirmar envio:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
