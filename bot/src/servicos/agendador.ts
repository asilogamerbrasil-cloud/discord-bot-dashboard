const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY || '';
const INTERVALO_VERIFICACAO = 10 * 1000;

const T = () => new Date().toISOString();

async function confirmarEnvio(id: number, produtosIds?: string[]) {
  try {
    const body: Record<string, unknown> = { id };
    if (produtosIds && produtosIds.length > 0) body.produtosIds = produtosIds;

    const res = await fetch(`${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log(`[${T()}] [Agendador] Envio #${id} confirmado: status=${res.status}`);
  } catch (erro) {
    console.error(`[${T()}] [Agendador] Erro ao confirmar envio #${id}:`, erro instanceof Error ? erro.message : String(erro));
  }
}

async function buscarPendentes(): Promise<Array<{
  id: number; mensagem: string; embeds: Array<Record<string, unknown>>;
  canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }>;
  presetKey: string; produtosIds?: string[];
}>> {
  const url = `${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[${T()}] [Agendador] API respondeu ${res.status}: ${txt.substring(0, 500)}`);
      return [];
    }
    const data = await res.json();
    const pendentes = (data.pendentes || []);
    if (pendentes.length > 0) {
      console.log(`[${T()}] [Agendador] ${pendentes.length} mensagens pendentes: ${pendentes.map((p: { id: number; presetKey?: string }) => `#${p.id}(${p.presetKey || 'manual'})`).join(', ')}`);
    }
    return pendentes;
  } catch (erro: unknown) {
    const err = erro as Error & { code?: string };
    console.error(`[${T()}] [Agendador] FALHA ao buscar pendentes: ${err.message || erro} (code: ${err.code || 'N/A'})`);
    console.error(`[${T()}] [Agendador] URL tentada: ${url}`);
    return [];
  }
}

export async function iniciarAgendador(client: { channels: { fetch: (id: string) => Promise<unknown> }; guilds: { cache: Map<string, unknown> } }) {
  console.log(`[${T()}] [Agendador] ========================================`);
  console.log(`[${T()}] [Agendador] Dashboard: ${DASHBOARD_URL}`);
  console.log(`[${T()}] [Agendador] API Key: ${API_KEY ? '****configurada****' : 'AUSENTE'}`);
  console.log(`[${T()}] [Agendador] Intervalo: ${INTERVALO_VERIFICACAO / 1000}s`);
  console.log(`[${T()}] [Agendador] Servidores do bot: ${client.guilds.cache.size}`);
  console.log(`[${T()}] [Agendador] ========================================`);

  if (!API_KEY) {
    console.error(`[${T()}] [Agendador] INTERNAL_API_KEY ausente! Agendador DESATIVADO.`);
    return;
  }

  const bootstrap = await buscarPendentes();
  console.log(`[${T()}] [Agendador] Bootstrap: ${bootstrap.length} pendentes encontradas`);

  setInterval(async () => {
    const pendentes = await buscarPendentes();
    if (pendentes.length === 0) return;

    console.log(`[${T()}] [Agendador] Processando ${pendentes.length} mensagens...`);

    for (const msg of pendentes) {
      console.log(`[${T()}] [Agendador] Msg #${msg.id} "${msg.mensagem.substring(0, 80)}..." -> ${msg.canais.length} canais, ${msg.embeds?.length || 0} embeds`);
      let enviadoComSucesso = false;

      for (const canalInfo of msg.canais) {
        try {
          console.log(`[${T()}] [Agendador]   -> Canal: #${canalInfo.canalNome} (${canalInfo.canalId}) em ${canalInfo.servidorNome}`);
          const channel = await client.channels.fetch(canalInfo.canalId) as { isTextBased(): boolean; send(opts: { content?: string; embeds?: unknown[] }): Promise<unknown> } | null;

          if (!channel) {
            console.error(`[${T()}] [Agendador]   -> ERRO: Canal retornou null/undefined`);
            continue;
          }

          if (!channel.isTextBased()) {
            console.error(`[${T()}] [Agendador]   -> ERRO: Canal nao aceita mensagens de texto`);
            continue;
          }

          const sendOpts: { content: string; embeds?: unknown[] } = { content: msg.mensagem };
          if (msg.embeds && msg.embeds.length > 0) {
            sendOpts.embeds = msg.embeds;
            console.log(`[${T()}] [Agendador]   -> Enviando ${msg.embeds.length} embeds + mensagem texto`);
          } else {
            console.log(`[${T()}] [Agendador]   -> Enviando apenas texto (sem embeds)`);
          }

          const sent = await channel.send(sendOpts);
          enviadoComSucesso = true;
          console.log(`[${T()}] [Agendador]   -> ENVIADO COM SUCESSO! msgId=${(sent as { id?: string })?.id || 'N/A'}`);
        } catch (erro: unknown) {
          const err = erro as Error & { code?: string; httpStatus?: number };
          console.error(`[${T()}] [Agendador]   -> ERRO ao enviar: ${err.message} (code: ${err.code || 'N/A'}, httpStatus: ${err.httpStatus || 'N/A'})`);
          if (err.stack) console.error(`[${T()}] [Agendador]   -> Stack: ${err.stack.substring(0, 300)}`);
          if (err.message?.includes('Missing Access') || err.message?.includes('Missing Permissions')) {
            console.error(`[${T()}] [Agendador]   -> O bot nao tem permissao para enviar mensagens neste canal!`);
          }
        }
      }

      if (enviadoComSucesso) {
        await confirmarEnvio(msg.id, msg.produtosIds);
      } else {
        console.error(`[${T()}] [Agendador] FALHA TOTAL: Nenhum canal recebeu a mensagem #${msg.id}`);
      }
    }
  }, INTERVALO_VERIFICACAO);
}
