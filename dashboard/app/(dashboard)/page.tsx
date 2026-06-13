export default function PaginaInicial() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Visao Geral</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card titulo="Servidores" valor="0" />
        <Card titulo="Usuarios" valor="0" />
        <Card titulo="Latencia" valor="0ms" />
      </div>
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
