const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY || '';
const INTERVALO_VERIFICACAO = 10 * 1000;

async function confirmarEnvio(id: number) {
  try {
    await fetch(`${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {}
}

async function buscarPendentes(): Promise<Array<{
  id: number; mensagem: string; embeds: Array<Record<string, unknown>>;
  canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }>;
}> | null> {
  const url = `${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`;
  try {
    console.log('[Agendador] Buscando pendentes em:', url);
    const res = await fetch(url);
    console.log('[Agendador] Resposta HTTP:', res.status, res.statusText);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[Agendador] Erro API - status:', res.status, 'body:', txt.substring(0, 200));
      return [];
    }
    const data = await res.json();
    console.log('[Agendador] Pendentes recebidos:', JSON.stringify(data).substring(0, 300));
    return (data.pendentes || []);
  } catch (erro) {
    console.error('[Agendador] Erro ao buscar pendentes:', erro);
    return [];
  }
}

export async function iniciarAgendador(client: { channels: { fetch: (id: string) => Promise<unknown> } }) {
  console.log('[Agendador] Config:', { DASHBOARD_URL, API_KEY: API_KEY ? '***configurada***' : 'AUSENTE' });

  if (!API_KEY) {
    console.log('[Agendador] INTERNAL_API_KEY nao configurado. Agendador desativado.');
    return;
  }

  const bootstrap = await buscarPendentes();
  console.log('[Agendador] Bootstrap inicial:', bootstrap === null ? 'FALHOU' : `${bootstrap.length} pendentes encontradas`);

  console.log(`[Agendador] Iniciado. Ciclo a cada ${INTERVALO_VERIFICACAO / 1000}s`);

  const verificar = async () => {
    try {
      const pendentes = await buscarPendentes();
      if (!pendentes || pendentes.length === 0) return;

      console.log(`[Agendador] ${pendentes.length} mensagens para enviar`);

      for (const msg of pendentes) {
        let enviadoComSucesso = false;

        for (const canalInfo of msg.canais) {
          try {
            console.log(`[Agendador] Tentando enviar para canal ${canalInfo.canalNome} (${canalInfo.canalId}) no servidor ${canalInfo.servidorNome}`);
            const channel = await client.channels.fetch(canalInfo.canalId) as { isTextBased(): boolean; send(opts: { content?: string; embeds?: unknown[] }): Promise<unknown> } | null;
            if (!channel || !channel.isTextBased()) {
              console.log(`[Agendador] Canal nao encontrado ou nao é texto: ${canalInfo.canalNome} (${canalInfo.canalId})`);
              continue;
            }

            const sendOpts: { content: string; embeds?: unknown[] } = { content: msg.mensagem };
            if (msg.embeds && msg.embeds.length > 0) sendOpts.embeds = msg.embeds;

            await channel.send(sendOpts);
            enviadoComSucesso = true;
            console.log(`[Agendador] ENVIADO com sucesso: #${canalInfo.canalNome} em ${canalInfo.servidorNome}`);
          } catch (erro: unknown) {
            const err = erro as Error & { code?: string; status?: number };
            console.error(`[Agendador] Erro ao enviar para ${canalInfo.canalNome}:`, err.message || err, err.code || err.status || '');
          }
        }

        if (enviadoComSucesso) {
          console.log(`[Agendador] Confirmando envio da mensagem ${msg.id}`);
          await confirmarEnvio(msg.id);
        } else {
          console.log(`[Agendador] Nenhum canal recebeu a mensagem ${msg.id}`);
        }
      }
    } catch (erro) {
      console.error('[Agendador] Erro no ciclo:', erro);
    }
  };

  setInterval(verificar, INTERVALO_VERIFICACAO);
}
