export default function PaginaLogs() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Logs</h1>

      <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-4">
        <div className="space-y-3 font-mono text-sm">
          <LinhaLog tipo="info" mensagem="[10:30:45] Bot conectado com sucesso" />
          <LinhaLog tipo="info" mensagem="[10:30:46] Comandos slash registrados (3 comandos)" />
          <LinhaLog tipo="success" mensagem="[10:30:47] Conectado a 0 servidores" />
          <LinhaLog tipo="warn" mensagem="[10:30:48] Nenhum servidor configurado ainda" />
        </div>
      </div>
    </div>
  );
}

function LinhaLog({ tipo, mensagem }: { tipo: 'info' | 'success' | 'warn' | 'error'; mensagem: string }) {
  const cores = {
    info: 'text-[#B5BAC1]',
    success: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div className={`flex items-center gap-2 ${cores[tipo]}`}>
      <span className="text-[10px] uppercase bg-[#1E1F22] px-1.5 py-0.5 rounded font-bold">
        {tipo}
      </span>
      {mensagem}
    </div>
  );
}
