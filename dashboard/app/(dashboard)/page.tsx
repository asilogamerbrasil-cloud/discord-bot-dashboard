'use client';

import { useState, useEffect } from 'react';

export default function PaginaInicial() {
  const [servidores, setServidores] = useState(0);
  const [usuarios, setUsuarios] = useState(0);
  const [latencia, setLatencia] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const inicio = Date.now();
      try {
        const res = await fetch('/api/servidores');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setServidores(data.length);
          }
        }
      } catch {}

      try {
        const token = '1515429281126289638';
        const gatewayRes = await fetch('https://discord.com/api/v10/gateway');
        if (gatewayRes.ok) {
          const ws = new WebSocket((await gatewayRes.json()).url);
          ws.onopen = () => { setLatencia(Date.now() - inicio); ws.close(); };
          ws.onerror = () => setLatencia(-1);
        }
      } catch { setLatencia(-1); }

      setCarregando(false);
    }
    carregarDados();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Visao Geral</h1>

      {carregando ? (
        <div className="animate-pulse text-[#B5BAC1]">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card titulo="Servidores" valor={String(servidores)} />
          <Card titulo="Status Bot" valor={latencia > 0 ? 'Online' : latencia === -1 ? 'Offline' : '...'} />
          <Card titulo="Latencia" valor={latencia > 0 ? `${latencia}ms` : '--'} />
        </div>
      )}
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-[#2B2D31] rounded-lg p-4 border border-[#1E1F22] hover:border-[#5865F2]/50 transition-colors">
      <p className="text-[#B5BAC1] text-sm">{titulo}</p>
      <p className="text-2xl font-bold text-white mt-1">{valor}</p>
    </div>
  );
}
