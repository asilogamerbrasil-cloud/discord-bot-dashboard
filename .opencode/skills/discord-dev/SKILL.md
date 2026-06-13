---
name: discord-dev
description: Use when building Discord bots with discord.js, Discord API integrations, OAuth2, gateway events, slash commands, or any Discord-related development. Covers discord.js v14, REST API, WebSocket gateway, and bot best practices.
---

# Discord Bot Development Skill

## Discord.js v14 Core Concepts

### Client Setup
```typescript
import { Client, GatewayIntentBits, Partials } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});
```

### Slash Commands (Commands API)
```typescript
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde com Pong!')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
```

### Event Handling
```typescript
client.on('ready', (c) => {
  console.log(`${c.user.tag} está online!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  // handle command
});
```

## Discord OAuth2 Flow
- Scopes: `identify`, `guilds`, `guilds.join`, `bot`
- Redirect URI: `http://localhost:3000/api/auth/callback`
- Bot invite URL: `https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=PERMISSIONS&scope=bot%20applications.commands`

## Discord API Endpoints

### User (@me)
- `GET /users/@me` - current user info
- `GET /users/@me/guilds` - user's guilds

### Guild (Servidor)
- `GET /guilds/{guild.id}` - guild info
- `PATCH /guilds/{guild.id}` - modify guild
- `GET /guilds/{guild.id}/members` - list members
- `PUT /guilds/{guild.id}/members/{user.id}` - add member (bot join)
- `PATCH /guilds/{guild.id}/members/{user.id}` - modify member (nickname, roles, mute, deaf, channel)

### Bot User
- `PATCH /users/@me` - modify bot username/avatar
- `GET /applications/@me` - get bot application info

### Channel
- `GET /channels/{channel.id}` - channel info
- `POST /channels/{channel.id}/messages` - send message
- `GET /channels/{channel.id}/messages` - get messages

## Permissions
Common permission integer: `8` = Administrator

For limited access:
```
ManageGuild, ManageChannels, ManageRoles, ManageMessages, SendMessages, ReadMessageHistory, ViewChannel, Connect, Speak, AddReactions, UseExternalEmojis
```

## Anti-Bot Verification Handling
When joining a server with anti-bot measures:
1. Detect if bot needs to complete verification (bot receives a DM or channel message with instructions)
2. Bot can react to messages with emojis: `message.react('✅')`
3. Bot can click buttons: handle MessageComponent interactions
4. For visual captchas requiring human intervention: dashboard provides remote view with manual controls

## Best Practices
- Use environment variables for TOKEN, CLIENT_ID, CLIENT_SECRET
- Implement rate limiting (Discord allows 50 requests/second)
- Handle reconnection and heartbeat properly
- Cache guild/channel/user data to reduce API calls
- Use sharding for bots in 2500+ guilds
- Never commit `.env` files
