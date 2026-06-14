import { config } from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { createServer } from 'http';

config();

const PORTA = parseInt(process.env.PORT || '3001');

const servidor = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', uptime: process.uptime() }));
});

servidor.listen(PORTA, () => {
  console.log(`HTTP ouvindo na porta ${PORTA}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

async function iniciar() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log('[BOT] Discord conectado!');
    console.log(`[BOT] Token: ${process.env.DISCORD_TOKEN ? '****configurado****' : 'AUSENTE'}`);
    console.log(`[BOT] Guilds imediato: ${client.guilds.cache.size}`);

    const { registrarComandos } = await import('./comandos/index.js');
    await registrarComandos();

    const { eventoReady } = await import('./eventos/ready.js');
    const { eventoInteraction } = await import('./eventos/interaction.js');

    client.on('ready', eventoReady);
    client.on('interactionCreate', eventoInteraction);

    const { iniciarAgendador } = await import('./servicos/agendador.js');
    iniciarAgendador(client as any);

    const readyClient = client as Client<true>;
    if (client.isReady()) {
      await eventoReady(readyClient);
    }
  } catch (erro) {
    console.error('[BOT] ERRO FATAL ao iniciar:', erro);
  }
}

iniciar();
