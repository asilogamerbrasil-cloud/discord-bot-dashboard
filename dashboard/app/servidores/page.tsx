export default function PaginaServidores() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Servidores</h1>
        <button className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
          + Adicionar Bot
        </button>
      </div>

      <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-8 text-center">
        <p className="text-[#B5BAC1]">Nenhum servidor conectado ainda.</p>
        <p className="text-[#B5BAC1] text-sm mt-1">
          Clique em Adicionar Bot para conectar a um servidor Discord.
        </p>
      </div>
    </div>
  );
}
