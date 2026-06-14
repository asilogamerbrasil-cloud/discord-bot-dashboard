const fs = require('fs');
const path = require('path');

const envVars = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '',
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || '',
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./data/bot.db',
  YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID || '',
  YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET || '',
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID || '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET || '',
};

const content = Object.entries(envVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

const filePath = path.join(__dirname, '.env.production');
fs.writeFileSync(filePath, content);
console.log('.env.production generated');
console.log('DISCORD_CLIENT_ID:', envVars.DISCORD_CLIENT_ID ? 'SET' : 'MISSING');
console.log('DISCORD_TOKEN:', envVars.DISCORD_TOKEN ? 'SET' : 'MISSING');
