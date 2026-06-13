const BASE_URL = 'https://discord.com/api/v10';

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function atualizarBotPerfil(dados: {
  username?: string;
  avatar?: string;
  banner?: string;
}) {
  const body: Record<string, string> = {};

  if (dados.username) {
    body.username = dados.username;
  }

  if (dados.avatar) {
    body.avatar = dados.avatar;
  }

  if (dados.banner) {
    body.banner = dados.banner;
  }

  const resposta = await fetch(`${BASE_URL}/users/@me`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    console.error('Erro ao atualizar perfil do bot:', erro);
    throw new Error((erro as { message?: string }).message || 'Erro ao atualizar perfil');
  }

  return resposta.json();
}

export async function obterBotPerfil() {
  const resposta = await fetch(`${BASE_URL}/users/@me`, {
    headers: headers(),
  });

  if (!resposta.ok) {
    throw new Error('Erro ao obter perfil do bot');
  }

  return resposta.json();
}
