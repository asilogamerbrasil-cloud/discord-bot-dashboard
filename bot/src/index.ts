import { config } from 'dotenv';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

async function iniciar() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Bot conectado!');

    const { registrarComandos } = await import('./comandos/index.js');
    await registrarComandos();

    const { eventoReady } = await import('./eventos/ready.js');
    const { eventoInteraction } = await import('./eventos/interaction.js');

    client.on('ready', eventoReady);
    client.on('interactionCreate', eventoInteraction);

    const { iniciarAgendador } = await import('./servicos/agendador.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    iniciarAgendador(client as any);

    const readyClient = client as Client<true>;
    if (client.isReady()) {
      await eventoReady(readyClient);
    }
  } catch (erro) {
    console.error('Erro ao iniciar:', erro);
  }
}

iniciar();
