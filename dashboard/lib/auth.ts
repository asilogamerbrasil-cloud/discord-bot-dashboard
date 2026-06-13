import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify guilds',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.discordId = account.providerAccountId;
      }
      if (profile) {
        const p = profile as { username?: string; avatar?: string; global_name?: string };
        token.username = p.username;
        token.globalName = p.global_name || p.username;
        token.avatar = p.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.discordId as string;
        session.user.name = (token.globalName as string) || (token.username as string) || null;
        session.user.image = token.avatar
          ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.avatar}.png`
          : null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
};
