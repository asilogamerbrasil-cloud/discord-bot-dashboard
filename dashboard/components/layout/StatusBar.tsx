'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, AlertTriangle, Activity, RefreshCw, X } from 'lucide-react';

interface StatusPlataformaItem {
  plataforma: string;
  status: 'online' | 'error' | 'offline' | 'unknown';
  nome: string | null;
  mensagem?: string;
}

interface StatusIntegracoes {
  timestamp: number;
  servico: 'online' | 'deploying';
  geral: { total: number; online: number; error: number; offline: number; status: 'tudo certo' | 'erro' | 'parcial' | 'sem integracoes' | 'erro interno' };
  redesSociais: { total: number; online: number; error: number; offline: number };
  afiliados: { total: number; online: number; error: number; offline: number };
  plataformas: StatusPlataformaItem[];
}

const ETAPAS_DEPLOY = [10, 25, 40, 55, 70, 85, 95, 98, 100];

export function StatusBar() {
  const [status, setStatus] = useState<StatusIntegracoes | null>(null);
  const [modoDeploy, setModoDeploy] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/integracoes/status');
      if (r.ok) setStatus(await r.json());
    } catch {}
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const interval = setInterval(carregar, 60000);
    return () => clearInterval(interval);
  }, [carregar]);

  useEffect(() => {
    if (!modoDeploy) { setProgresso(0); return; }
    setProgresso(0);
    let i = 0;
    const interval = setInterval(() => {
      if (i < ETAPAS_DEPLOY.length) {
        setProgresso(ETAPAS_DEPLOY[i]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => { setModoDeploy(false); setProgresso(0); }, 2000);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [modoDeploy]);

  return (
    <div className="bg-[#1E1F22] border-b border-[#313338] px-4 py-2">
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${modoDeploy ? 'bg-yellow-400' : 'bg-green-400'}`}/>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${modoDeploy ? 'bg-yellow-400' : 'bg-green-400'}`}/>
          </span>
          <span className="text-[#B5BAC1]">
            Servico: <span className={`font-medium ${modoDeploy ? 'text-yellow-400' : 'text-green-400'}`}>{modoDeploy ? 'Em Deploy' : 'Online'}</span>
          </span>
          {!modoDeploy && <button onClick={() => setModoDeploy(true)} className="text-[10px] bg-[#313338] hover:bg-[#3F4147] text-[#72767D] px-1.5 py-0.5 rounded flex items-center gap-0.5"><RefreshCw className="w-2.5 h-2.5"/>Simular Deploy</button>}
          {modoDeploy && <button onClick={() => { setModoDeploy(false); setProgresso(0); }} className="text-[10px] text-[#72767D] hover:text-white"><X className="w-3 h-3 inline"/>Cancelar</button>}
        </div>

        {status && (
          <>
            <span className="text-[#3F4147]">|</span>
            {status.redesSociais.total > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[#72767D]">Redes:</span>
                <span className="text-green-400">{status.redesSociais.online}</span>
                <span className="text-[#3F4147]">/</span>
                <span className="text-white">{status.redesSociais.total}</span>
                {status.redesSociais.error > 0 && <span className="text-red-400">({status.redesSociais.error} erro)</span>}
              </div>
            )}
            {status.afiliados.total > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[#72767D]">Afiliados:</span>
                <span className="text-green-400">{status.afiliados.online}</span>
                <span className="text-[#3F4147]">/</span>
                <span className="text-white">{status.afiliados.total}</span>
                {status.afiliados.error > 0 && <span className="text-red-400">({status.afiliados.error} erro)</span>}
              </div>
            )}
            {status.geral.total > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                status.geral.status === 'tudo certo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                status.geral.status === 'erro' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                status.geral.status === 'parcial' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-[#313338] text-[#B5BAC1]'
              }`}>
                {status.geral.status === 'tudo certo' ? <Check className="w-2.5 h-2.5 inline mr-0.5"/> : status.geral.status === 'erro' ? <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5"/> : <Activity className="w-2.5 h-2.5 inline mr-0.5"/>}
                {status.geral.status === 'tudo certo' ? 'Tudo Certo' : status.geral.status === 'erro' ? 'Erro' : status.geral.status === 'parcial' ? 'Parcial' : 'Sem Integracoes'}
              </span>
            )}
            <button onClick={carregar} className="text-[#5865F2] hover:text-[#4752C4] flex items-center gap-0.5 ml-auto">
              <RefreshCw className="w-2.5 h-2.5"/>Atualizar
            </button>
          </>
        )}
      </div>
      {modoDeploy && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-yellow-400 font-medium">Deploy em andamento...</span>
            <span className="text-[#72767D]">{progresso}%</span>
          </div>
          <div className="w-full bg-[#313338] rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-[#2ECC71] rounded-full transition-all duration-500" style={{ width: `${progresso}%` }}/>
          </div>
        </div>
      )}
    </div>
  );
}
