import NextAuth from 'next-auth';

const handler = NextAuth({
  providers: [],
  secret: process.env.NEXTAUTH_SECRET || 'test-secret-minimum-length-32',
});

export { handler as GET, handler as POST };
