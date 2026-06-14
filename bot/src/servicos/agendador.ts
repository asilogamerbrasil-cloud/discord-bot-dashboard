const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY || '';
const INTERVALO_VERIFICACAO = 10 * 1000;

async function confirmarEnvio(id: number) {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    console.log(`[Agendador] Envio #${id} confirmado: ${res.status}`);
  } catch (erro) {
    console.error(`[Agendador] Erro ao confirmar envio #${id}:`, erro);
  }
}

async function buscarPendentes(): Promise<Array<{
  id: number; mensagem: string; embeds: Array<Record<string, unknown>>;
  canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }>;
  presetKey: string;
}>> {
  const url = `${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[Agendador] API respondeu ${res.status}: ${txt.substring(0, 300)}`);
      return [];
    }
    const data = await res.json();
    const pendentes = (data.pendentes || []);
    if (pendentes.length === 0) {
      // silent - normal
    } else {
      console.log(`[Agendador] ${pendentes.length} mensagens pendentes: ${pendentes.map((p: { id: number; presetKey?: string }) => `#${p.id}(${p.presetKey || 'manual'})`).join(', ')}`);
    }
    return pendentes;
  } catch (erro: unknown) {
    const err = erro as Error & { code?: string };
    console.error(`[Agendador] FALHA ao buscar pendentes: ${err.message || erro} (code: ${err.code || 'N/A'})`);
    console.error(`[Agendador] URL tentada: ${url}`);
    return [];
  }
}

export async function iniciarAgendador(client: { channels: { fetch: (id: string) => Promise<unknown> }; guilds: { cache: Map<string, unknown> } }) {
  console.log('[Agendador] ========================================');
  console.log(`[Agendador] Dashboard: ${DASHBOARD_URL}`);
  console.log(`[Agendador] API Key: ${API_KEY ? '****configurada****' : 'AUSENTE'}`);
  console.log(`[Agendador] Intervalo: ${INTERVALO_VERIFICACAO / 1000}s`);
  console.log(`[Agendador] Servidores do bot: ${client.guilds.cache.size}`);
  console.log('[Agendador] ========================================');

  if (!API_KEY) {
    console.error('[Agendador] INTERNAL_API_KEY ausente! Agendador DESATIVADO.');
    return;
  }

  // Bootstrap
  const bootstrap = await buscarPendentes();
  console.log(`[Agendador] Bootstrap: ${bootstrap.length} pendentes encontradas`);

  setInterval(async () => {
    const pendentes = await buscarPendentes();
    if (pendentes.length === 0) return;

    console.log(`[Agendador] Processando ${pendentes.length} mensagens...`);

    for (const msg of pendentes) {
      console.log(`[Agendador] Mensagem #${msg.id}: "${msg.mensagem.substring(0, 80)}..." para ${msg.canais.length} canais`);
      let enviadoComSucesso = false;

      for (const canalInfo of msg.canais) {
        try {
          console.log(`[Agendador]   -> Canal: #${canalInfo.canalNome} (${canalInfo.canalId}) em ${canalInfo.servidorNome}`);
          const channel = await client.channels.fetch(canalInfo.canalId) as { isTextBased(): boolean; send(opts: { content?: string; embeds?: unknown[] }): Promise<unknown> } | null;

          if (!channel) {
            console.error(`[Agendador]   -> ERRO: Canal retornou null/undefined`);
            continue;
          }

          if (!channel.isTextBased()) {
            console.error(`[Agendador]   -> ERRO: Canal nao aceita mensagens de texto`);
            continue;
          }

          const sendOpts: { content: string; embeds?: unknown[] } = { content: msg.mensagem };
          if (msg.embeds && msg.embeds.length > 0) {
            sendOpts.embeds = msg.embeds;
            console.log(`[Agendador]   -> Enviando com ${msg.embeds.length} embeds`);
          }

          await channel.send(sendOpts);
          enviadoComSucesso = true;
          console.log(`[Agendador]   -> ENVIADO COM SUCESSO!`);
        } catch (erro: unknown) {
          const err = erro as Error & { code?: string; httpStatus?: number };
          console.error(`[Agendador]   -> ERRO ao enviar: ${err.message} (code: ${err.code || 'N/A'}, status: ${err.httpStatus || 'N/A'})`);
          if (err.message?.includes('Missing Access') || err.message?.includes('Missing Permissions')) {
            console.error(`[Agendador]   -> O bot nao tem permissao para enviar mensagens neste canal!`);
          }
        }
      }

      if (enviadoComSucesso) {
        await confirmarEnvio(msg.id);
      } else {
        console.error(`[Agendador] FALHA: Nenhum canal recebeu a mensagem #${msg.id}`);
      }
    }
  }, INTERVALO_VERIFICACAO);
}
