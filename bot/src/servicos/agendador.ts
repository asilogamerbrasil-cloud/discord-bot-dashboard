const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY || '';
const INTERVALO_VERIFICACAO = 60 * 1000; // 1 minuto

async function confirmarEnvio(id: number) {
  try {
    await fetch(`${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {}
}

async function buscarPendentes() {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/mensagens/pendentes?key=${API_KEY}`);
    if (!res.ok) {
      if (res.status !== 401) console.error('[Agendador] Erro API:', res.status);
      return [];
    }
    const data = await res.json();
    return (data.pendentes || []) as Array<{
      id: number;
      mensagem: string;
      embeds: Array<Record<string, unknown>>;
      canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }>;
    }>;
  } catch (erro) {
    console.error('[Agendador] Erro ao buscar pendentes:', erro);
    return [];
  }
}

export async function iniciarAgendador(client: { channels: { fetch: (id: string) => Promise<unknown> } }) {
  if (!API_KEY) {
    console.log('[Agendador] INTERNAL_API_KEY nao configurado. Agendador desativado.');
    return;
  }

  console.log(`[Agendador] Iniciado. Verificando a cada ${INTERVALO_VERIFICACAO / 1000}s`);

  const verificar = async () => {
    try {
      const pendentes = await buscarPendentes();
      if (!pendentes || pendentes.length === 0) return;

      console.log(`[Agendador] ${pendentes.length} mensagens pendentes`);

      for (const msg of pendentes) {
        let enviadoComSucesso = false;

        for (const canalInfo of msg.canais) {
          try {
            const channel: unknown = await client.channels.fetch(canalInfo.canalId);
            const ch = channel as { isTextBased(): boolean; send(opts: { content?: string; embeds?: unknown[] }): Promise<unknown> } | null;
            if (!ch || !ch.isTextBased()) {
              console.log(`[Agendador] Canal nao encontrado: ${canalInfo.canalNome} (${canalInfo.canalId})`);
              continue;
            }

            const sendOpts: { content: string; embeds?: unknown[] } = {
              content: msg.mensagem,
            };

            if (msg.embeds && msg.embeds.length > 0) {
              sendOpts.embeds = msg.embeds;
            }

            await ch.send(sendOpts);
            enviadoComSucesso = true;
            console.log(`[Agendador] Enviado: #${canalInfo.canalNome} em ${canalInfo.servidorNome}`);
          } catch (erro) {
            console.error(`[Agendador] Erro ao enviar para ${canalInfo.canalNome}:`, erro);
          }
        }

        if (enviadoComSucesso) {
          await confirmarEnvio(msg.id);
        }
      }
    } catch (erro) {
      console.error('[Agendador] Erro no ciclo:', erro);
    }
  };

  verificar();
  setInterval(verificar, INTERVALO_VERIFICACAO);
}
