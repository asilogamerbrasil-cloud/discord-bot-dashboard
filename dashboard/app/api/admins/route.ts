import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { administradores } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

async function isOwner(req: NextRequest): Promise<boolean> {
  const token = await getToken({ req });
  if (!token?.discordId) return false;

  const db = getDb();
  const admins = await db
    .select()
    .from(administradores)
    .where(
      and(
        eq(administradores.discordId, token.discordId as string),
        eq(administradores.role, 'owner')
      )
    )
    .limit(1);

  return admins.length > 0;
}

async function ensureOwnerOnFirstAccess(discordId: string, nome: string, avatarUrl?: string) {
  const db = getDb();
  const existing = await db.select().from(administradores);

  if (existing.length === 0) {
    await db.insert(administradores).values({
      discordId,
      nome,
      avatarUrl: avatarUrl || null,
      role: 'owner',
    });
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.discordId) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }

  const db = getDb();

  await ensureOwnerOnFirstAccess(
    token.discordId as string,
    (token.globalName as string) || (token.username as string) || 'Admin',
    token.avatar
      ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.avatar}.png`
      : undefined
  );

  const lista = await db.select().from(administradores).orderBy(administradores.adicionadoEm);

  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  if (!(await isOwner(req))) {
    return NextResponse.json({ erro: 'Apenas o owner pode adicionar admins' }, { status: 403 });
  }

  const { discordId, nome } = await req.json();

  if (!discordId || !nome) {
    return NextResponse.json({ erro: 'discordId e nome sao obrigatorios' }, { status: 400 });
  }

  const db = getDb();

  const existente = await db
    .select()
    .from(administradores)
    .where(eq(administradores.discordId, discordId))
    .limit(1);

  if (existente.length > 0) {
    return NextResponse.json({ erro: 'Este usuario ja e administrador' }, { status: 409 });
  }

  const [novo] = await db.insert(administradores).values({
    discordId,
    nome,
    role: 'admin',
  }).returning();

  return NextResponse.json(novo, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await isOwner(req))) {
    return NextResponse.json({ erro: 'Apenas o owner pode remover admins' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ erro: 'ID do admin necessario' }, { status: 400 });
  }

  const db = getDb();

  const admin = await db
    .select()
    .from(administradores)
    .where(eq(administradores.id, parseInt(id)))
    .limit(1);

  if (admin.length === 0) {
    return NextResponse.json({ erro: 'Admin nao encontrado' }, { status: 404 });
  }

  if (admin[0].role === 'owner') {
    return NextResponse.json({ erro: 'Nao e possivel remover o owner' }, { status: 403 });
  }

  await db.delete(administradores).where(eq(administradores.id, parseInt(id)));

  return NextResponse.json({ sucesso: true });
}
