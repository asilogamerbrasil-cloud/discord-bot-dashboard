import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mensagensProgramadas, integracoes, envioLogs } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

const T = () => new Date().toISOString();

function gerarAuthShopee(appId: string, appSecret: string, bodyString: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const factor = `${appId}${timestamp}${bodyString}${appSecret}`;
  const signature = createHash('sha256').update(factor, 'utf8').digest('hex');
  return `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`;
}

interface ShopeeProductV2 {
  productName: string;
  productLink: string;
  price: string;
  commissionRate: string;
  shopName: string;
  ratingStar: string;
  offerLink: string;
  imageUrl: string;
  sales: number;
  shopId: number;
  itemId: number;
  sellerCommissionRate: string;
}

interface ShopeePresetDef {
  nome: string; emoji: string; cor: number;
  keywords: string[]; categoria: string; defaultSortType: number;
}

const SHOPEE_PRESETS: Record<string, ShopeePresetDef> = {
  top5_monitores:       { nome: 'Top 5 do Mes em Monitores',      emoji: '🏆', cor: 0xF1C40F, keywords: ['monitor gamer', 'monitor 144hz', 'monitor 4k', 'monitor curvo', 'monitor ultrawide'],         categoria: 'monitores',     defaultSortType: 0 },
  promocoes_hardware:   { nome: 'Promocoes em Hardware',          emoji: '🔥', cor: 0xE74C3C, keywords: ['placa de video', 'processador', 'memoria ram', 'ssd', 'fonte', 'placa mae', 'water cooler'], categoria: 'hardware',     defaultSortType: 0 },
  pcs_gamers_baratos:   { nome: 'PCs Gamers Mais Baratos do Mes', emoji: '💻', cor: 0x3498DB, keywords: ['pc gamer', 'computador gamer', 'notebook gamer'],                                        categoria: 'computadores',  defaultSortType: 0 },
  mais_vendidos_games:  { nome: 'Mais Vendidos em Games',         emoji: '🎮', cor: 0x9B59B6, keywords: ['jogo ps5', 'jogo ps4', 'jogo xbox', 'jogo switch', 'controle', 'cadeira gamer'],       categoria: 'games',        defaultSortType: 0 },
  ofertas_relampago:    { nome: 'Ofertas Relampago',              emoji: '⚡', cor: 0xE67E22, keywords: ['promocao', 'oferta', 'desconto', 'queima estoque'],                                       categoria: 'geral',        defaultSortType: 0 },
  perifericos_destaque: { nome: 'Perifericos em Destaque',        emoji: '🖱️', cor: 0x1ABC9C, keywords: ['mouse gamer', 'headset gamer', 'teclado mecanico', 'mousepad', 'microfone', 'webcam'],  categoria: 'perifericos',   defaultSortType: 0 },
  achadinhos_dia:       { nome: 'Achadinhos do Dia',              emoji: '📦', cor: 0x2ECC71, keywords: ['promocao shopee', 'cupom', 'frete gratis', 'mais vendidos'],                              categoria: 'geral',        defaultSortType: 0 },
};

function formatarMoeda(v: number) { return `R$ ${v.toFixed(2).replace(/\./g, ',')}`; }

async function buscarProdutosShopee(keyword: string, appId: string, appSecret: string, sortType: number, limit: number): Promise<ShopeeProductV2[]> {
  console.log(`[${T()}] [Shopee API] BUSCA: keyword="${keyword}" sortType=${sortType} limit=${limit}`);

  const query = `query($keyword: String!, $limit: Int, $sortType: Int) { productOfferV2(keyword: $keyword, limit: $limit, sortType: $sortType) { nodes { productName productLink price commissionRate shopName ratingStar offerLink imageUrl sales shopId itemId sellerCommissionRate } } }`;
  const variables = { keyword, limit, sortType };
  const body = { query, variables };
  const bodyString = JSON.stringify(body);

  console.log(`[${T()}] [Shopee API] Body (primeiros 150): ${bodyString.substring(0, 150)}`);

  try {
    const auth = gerarAuthShopee(appId, appSecret, bodyString);
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: bodyString,
    });
    console.log(`[${T()}] [Shopee API] status=${res.status}`);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[${T()}] [Shopee API] ERRO HTTP ${res.status}: ${text.substring(0, 500)}`);
      return [];
    }

    const json = await res.json();

    if (json.errors) {
      const err = json.errors[0];
      console.error(`[${T()}] [Shopee API] ERRO [${err?.extensions?.code || 'N/A'}]: ${err?.message}`);
      console.error(`[${T()}] [Shopee API] Erro completo: ${JSON.stringify(json.errors).substring(0, 500)}`);
      return [];
    }

    const produtos = (json.data?.productOfferV2?.nodes || []) as ShopeeProductV2[];
    console.log(`[${T()}] [Shopee API] SUCESSO: ${produtos.length} produtos`);
    if (produtos.length > 0) {
      console.log(`[${T()}] [Shopee API] 1o: "${produtos[0].productName}" R$${produtos[0].price} (${produtos[0].commissionRate}% comm)`);
    }
    return produtos;
  } catch (erro) {
    console.error(`[${T()}] [Shopee API] EXCECAO:`, erro instanceof Error ? erro.message : String(erro));
    return [];
  }
}

async function getProdutosEvitados(mensagemId: number, db: ReturnType<typeof getDb>): Promise<number[]> {
  try {
    const logs = await db.select().from(envioLogs).where(eq(envioLogs.mensagemId, mensagemId)).orderBy(desc(envioLogs.criadoEm)).limit(3);
    const ids = new Set<number>();
    for (const l of logs) {
      try { const arr = JSON.parse(l.produtosEnviados); arr.forEach((id: number) => ids.add(id)); } catch { /* JSON parse error */ }
    }
    console.log(`[${T()}] [Evitados] Msg #${mensagemId}: ${ids.size} ids evitados`);
    return [...ids];
  } catch (erro) {
    console.error(`[${T()}] [Evitados] ERRO:`, erro instanceof Error ? erro.message : String(erro));
    return [];
  }
}

async function montarMensagemShopee(
  presetKey: string, appId: string, appSecret: string, config: {
    qtdProdutos?: number; sortType?: number; cta?: string; mensagemId?: number;
  } = {}, db: ReturnType<typeof getDb>
): Promise<{ mensagem: string; embeds: Array<Record<string, unknown>>; presetKey: string; produtosIds: number[] } | null> {
  console.log(`[${T()}] [MontarMsg] presetKey=${presetKey} qtd=${config.qtdProdutos || 4} sortType=${config.sortType ?? 'default'}`);

  const preset = SHOPEE_PRESETS[presetKey];
  if (!preset) {
    console.error(`[${T()}] [MontarMsg] FALHA: preset "${presetKey}" nao encontrado`);
    return null;
  }

  const qtd = config.qtdProdutos || 4;
  const sortType = config.sortType ?? preset.defaultSortType;
  const cta = config.cta || 'Comprar Agora 🛒';
  const keyword = preset.keywords[Math.floor(Math.random() * preset.keywords.length)];

  console.log(`[${T()}] [MontarMsg] keyword="${keyword}" sortType=${sortType} qtd=${qtd}`);

  const produtos = await buscarProdutosShopee(keyword, appId, appSecret, sortType, qtd + 5);
  if (produtos.length === 0) {
    console.error(`[${T()}] [MontarMsg] FALHA: 0 produtos retornados`);
    return null;
  }

  const evitados = config.mensagemId ? await getProdutosEvitados(config.mensagemId, db) : [];
  const filtrados = produtos.filter(p => !evitados.includes(p.itemId));
  console.log(`[${T()}] [MontarMsg] ${produtos.length} encontrados, ${filtrados.length} apos filtro (${evitados.length} evitados)`);

  const pool = filtrados.length >= qtd ? filtrados : produtos;
  const melhores = pool.slice(0, qtd);

  if (melhores.length === 0) {
    console.error(`[${T()}] [MontarMsg] FALHA: pool vazio apos filtro`);
    return null;
  }

  console.log(`[${T()}] [MontarMsg] Montando ${melhores.length} embeds...`);

  const embeds = [];
  const produtosIds: number[] = [];

  for (let i = 0; i < melhores.length; i++) {
    const p = melhores[i];
    produtosIds.push(p.itemId);

    const preco = parseFloat(p.price) || 0;
    const commRate = parseFloat(p.commissionRate) || 0;
    const rating = parseFloat(p.ratingStar) || 0;
    const link = p.offerLink || p.productLink;

    const fields = [];
    fields.push({ name: '💰 Preco', value: `**${formatarMoeda(preco)}**`, inline: true });
    if (commRate > 0) fields.push({ name: '💵 Comissao', value: `${commRate}%`, inline: true });
    if (p.sales > 0) fields.push({ name: '🛒 Vendas', value: p.sales.toLocaleString(), inline: true });

    embeds.push({
      color: preset.cor,
      author: { name: `${i + 1}. ${p.productName.substring(0, 60)}${p.productName.length > 60 ? '...' : ''}` },
      description: `⭐ ${rating.toFixed(1)} | 🏪 ${p.shopName}${link ? `\n🔗 [Comprar Agora](${link})` : ''}`,
      fields,
      thumbnail: p.imageUrl ? { url: p.imageUrl } : undefined,
      footer: { text: 'Oferta via Shopee Afiliados' },
      timestamp: new Date().toISOString(),
    });

    console.log(`[${T()}] [MontarMsg] ${i + 1}. "${p.productName}" R$${preco} | link=${(link || '').substring(0, 30)}`);
  }

  const mensagem = `# ${preset.emoji} ${preset.nome} ${preset.emoji}\n\n${cta}\n\n👇 **Clique nos links abaixo e aproveite:**`;

  console.log(`[${T()}] [MontarMsg] SUCESSO: ${embeds.length} embeds`);
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
    console.error(`[${T()}] [GET] Acesso negado`);
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const agora = new Date();
    console.log(`[${T()}] [GET] Buscando mensagens ativas...`);

    const ativas = await db.select().from(mensagensProgramadas).where(eq(mensagensProgramadas.ativo, true));
    console.log(`[${T()}] [GET] ${ativas.length} mensagens ativas`);

    const pendentes = await Promise.all(ativas.map(async (m) => {
      try {
        if (!m.servidoresCanais) { console.log(`[${T()}] [GET] Msg #${m.id}: sem canais`); return null; }
        const canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }> = JSON.parse(m.servidoresCanais);
        if (canais.length === 0) { console.log(`[${T()}] [GET] Msg #${m.id}: canais vazios`); return null; }

        const ultimo = m.ultimoEnvio ? new Date(m.ultimoEnvio) : null;
        if (ultimo && (agora.getTime() - ultimo.getTime()) < m.timerIntervalo * 1000) {
          const falta = Math.ceil((m.timerIntervalo * 1000 - (agora.getTime() - ultimo.getTime())) / 1000);
          console.log(`[${T()}] [GET] Msg #${m.id}: faltam ${falta}s`);
          return null;
        }

        let conteudo: { mensagem: string; embeds?: Array<Record<string, unknown>> } = { mensagem: m.mensagem };
        let presetKeyUsada = '';
        let produtosIds: number[] = [];

        if (m.tipo === 'shopee_preset') {
          const shopeeInt = await db.select().from(integracoes).where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true))).limit(1);
          if (shopeeInt.length === 0) { console.error(`[${T()}] [GET] Msg #${m.id}: Shopee nao conectada`); return null; }
          if (!shopeeInt[0].accessToken || !shopeeInt[0].contaId) { console.error(`[${T()}] [GET] Msg #${m.id}: credenciais incompletas`); return null; }

          console.log(`[${T()}] [GET] Msg #${m.id}: Shopee OK AppId=${shopeeInt[0].contaId}`);

          let shopeeConfig: { modoRotacao?: string; presetsSelecionados?: string[]; ultimaKey?: string; qtdProdutos?: number; sortType?: number; cta?: string } | null = null;
          try { if (m.shopeeConfig) shopeeConfig = JSON.parse(m.shopeeConfig); } catch {}

          const presetAtual = selecionarPresetRotacao(shopeeConfig, m.shopeePreset || 'achadinhos_dia');
          console.log(`[${T()}] [GET] Msg #${m.id}: preset=${presetAtual} rotacao=${shopeeConfig?.modoRotacao || 'fixo'}`);

          const resultado = await montarMensagemShopee(presetAtual, shopeeInt[0].contaId!, shopeeInt[0].accessToken!, {
            qtdProdutos: shopeeConfig?.qtdProdutos || 4,
            sortType: shopeeConfig?.sortType,
            cta: shopeeConfig?.cta,
            mensagemId: m.id,
          }, db);

          if (!resultado) { console.error(`[${T()}] [GET] Msg #${m.id}: PULADA - montarMensagemShopee retornou null`); return null; }

          if (shopeeConfig && shopeeConfig.modoRotacao === 'sequencial') {
            shopeeConfig.ultimaKey = presetAtual;
            await db.update(mensagensProgramadas).set({ shopeeConfig: JSON.stringify(shopeeConfig) }).where(eq(mensagensProgramadas.id, m.id));
          }

          conteudo = { mensagem: resultado.mensagem, embeds: resultado.embeds };
          presetKeyUsada = presetAtual;
          produtosIds = resultado.produtosIds;
          console.log(`[${T()}] [GET] Msg #${m.id}: PRONTA - ${resultado.embeds.length} embeds, ${canais.length} canais`);
        }

        return { id: m.id, mensagem: conteudo.mensagem, embeds: conteudo.embeds || [], canais, presetKey: presetKeyUsada, produtosIds };
      } catch (erro) {
        console.error(`[${T()}] [GET] Msg #${m?.id}: ERRO:`, erro instanceof Error ? erro.message : String(erro));
        return null;
      }
    }));

    const resultado = pendentes.filter((p): p is NonNullable<typeof p> => p !== null);
    console.log(`[${T()}] [GET] ${resultado.length} pendentes de ${ativas.length} ativas`);
    return NextResponse.json({ pendentes: resultado });
  } catch (erro) {
    console.error(`[${T()}] [GET] ERRO FATAL:`, erro instanceof Error ? erro.message : String(erro));
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, produtosIds } = body;
    if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });

    console.log(`[${T()}] [POST] Confirmando envio #${id}${produtosIds ? ` (${produtosIds.length} produtos)` : ''}`);
    const db = getDb();

    if (produtosIds && Array.isArray(produtosIds) && produtosIds.length > 0) {
      await db.insert(envioLogs).values({
        mensagemId: id,
        presetKey: 'confirmado',
        produtosEnviados: JSON.stringify(produtosIds),
      });
      console.log(`[${T()}] [POST] EnvioLogs registrado`);
    }

    await db.update(mensagensProgramadas).set({ ultimoEnvio: new Date() }).where(eq(mensagensProgramadas.id, id));
    console.log(`[${T()}] [POST] Envio #${id} confirmado`);
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error(`[${T()}] [POST] ERRO:`, erro instanceof Error ? erro.message : String(erro));
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
