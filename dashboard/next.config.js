/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  env: {
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  },
};
