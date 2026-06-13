import { config } from 'dotenv';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { createServer } from 'http';

config();

const PORTA = parseInt(process.env.PORT || '3001');

const servidor = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online' }));
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

client.on('ready', (c) => {
  console.log(`Bot conectado como ${c.user.tag}`);
  console.log(`Servidores: ${c.guilds.cache.size}`);
});

client.on('error', (e) => console.error('Erro Discord:', e));

console.log('Tentando login no Discord...');
console.log('Token presente:', !!process.env.DISCORD_TOKEN);
console.log('Token primeiros 20 chars:', process.env.DISCORD_TOKEN?.substring(0, 20));

client.login(process.env.DISCORD_TOKEN).then(() => {
  console.log('Login bem-sucedido!');
}).catch((erro) => {
  console.error('Falha no login:', erro.message);
  console.error('Stack:', erro.stack);
});
