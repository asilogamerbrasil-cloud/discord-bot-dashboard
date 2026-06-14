'use client';

import { useState, useEffect } from 'react';

interface ServidorInfo {
  id: string;
  nome: string;
  icone: string | null;
  dono: boolean;
}

export default function PaginaServidores() {
  const [servidores, setServidores] = useState<ServidorInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=1515429281126289638&permissions=8&scope=bot%20applications.commands`;

  useEffect(() => {
    fetch('/api/servidores')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (Array.isArray(data)) setServidores(data);
        else setErro(data.erro || 'Erro ao carregar');
      })
      .catch(() => setErro('Erro ao conectar'))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Servidores</h1>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors no-underline"
        >
          + Adicionar Bot
        </a>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-md">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="animate-pulse text-[#B5BAC1]">Carregando servidores...</div>
      ) : servidores.length === 0 ? (
        <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-8 text-center">
          <p className="text-[#B5BAC1]">Nenhum servidor encontrado.</p>
          <p className="text-[#B5BAC1] text-sm mt-1">
            O bot precisa estar em um servidor para aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servidores.map((s) => (
            <div
              key={s.id}
              className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-4 hover:border-[#5865F2]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {s.icone ? (
                  <img src={s.icone} alt="" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#313338] flex items-center justify-center text-lg font-bold text-[#B5BAC1]">
                    {s.nome[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{s.nome}</p>
                  <p className="text-xs text-[#B5BAC1]">
                    {s.dono ? 'Dono' : 'Membro'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
