import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-key-at-least-32-chars-long',
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  debug: true,
  logger: {
    error(code, ...args) {
      console.error('NextAuth ERROR:', code, JSON.stringify(args));
    },
    warn(code, ...args) {
      console.warn('NextAuth WARN:', code, JSON.stringify(args));
    },
    debug(code, ...args) {
      console.log('NextAuth DEBUG:', code, JSON.stringify(args));
    },
  },
});

export { handler as GET, handler as POST };
