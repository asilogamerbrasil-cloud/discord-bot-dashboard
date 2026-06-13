import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId?: string;
    accessToken?: string;
    username?: string;
    globalName?: string;
    avatar?: string;
  }
}
