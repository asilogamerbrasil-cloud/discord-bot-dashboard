import { config } from 'dotenv';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { createServer } from 'http';
import { registrarComandos } from './comandos/index.js';
import { eventoReady } from './eventos/ready.js';
import { eventoInteraction } from './eventos/interaction.js';

config();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

const PORTA = parseInt(process.env.PORT || '3001');

const servidor = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', uptime: process.uptime() }));
});

async function iniciar() {
  try {
    await registrarComandos();

    client.on('ready', eventoReady);
    client.on('interactionCreate', eventoInteraction);

    await client.login(process.env.DISCORD_TOKEN);
    console.log('Bot iniciado com sucesso!');

    servidor.listen(PORTA, () => {
      console.log(`Servidor HTTP ouvindo na porta ${PORTA}`);
    });
  } catch (erro) {
    console.error('Erro ao iniciar o bot:', erro);
    process.exit(1);
  }
}

iniciar();
