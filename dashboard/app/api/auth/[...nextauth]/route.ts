import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;

console.log('NextAuth init - ClientID presente:', !!clientId, 'Secret presente:', !!clientSecret);

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: clientId || '',
      clientSecret: clientSecret || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
