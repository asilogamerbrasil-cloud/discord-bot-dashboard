'use client';

export default function PaginaServidores() {
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=1515429281126289638&permissions=8&scope=bot%20applications.commands`;

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

      <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-8 text-center">
        <p className="text-[#B5BAC1]">Nenhum servidor conectado ainda.</p>
        <p className="text-[#B5BAC1] text-sm mt-1">
          Clique em Adicionar Bot para conectar a um servidor Discord.
        </p>
      </div>
    </div>
  );
}
