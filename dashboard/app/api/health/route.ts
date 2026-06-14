import { NextResponse } from 'next/server';

const inicio = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - inicio) / 1000);
  const memoria = process.memoryUsage();

  return NextResponse.json({
    status: 'online',
    uptime: uptime,
    uptimeFormatado: formatarUptime(uptime),
    memoria: {
      heapUsadoMB: Math.round(memoria.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoria.heapTotal / 1024 / 1024),
    },
    timestamp: Date.now(),
  });
}

function formatarUptime(segundos: number): string {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;

  const partes: string[] = [];
  if (d > 0) partes.push(`${d}d`);
  if (h > 0) partes.push(`${h}h`);
  if (m > 0) partes.push(`${m}m`);
  partes.push(`${s}s`);
  return partes.join(' ');
}
