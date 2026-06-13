import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'auth_token';

function getSecret() {
  return new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'super-secret-key-minimum-32-chars!!'
  );
}

export interface SessaoUsuario {
  id: string;
  nome: string;
  avatar: string | null;
  accessToken: string;
}

export async function criarSessao(usuario: SessaoUsuario): Promise<string> {
  const token = await new SignJWT({ ...usuario })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export async function obterSessao(): Promise<SessaoUsuario | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessaoUsuario;
  } catch {
    return null;
  }
}

export async function destruirSessao() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
