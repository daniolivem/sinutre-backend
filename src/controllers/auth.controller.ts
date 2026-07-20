import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { env } from '../config/env';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

function ensureGithubConfig() {
  const { clientId, clientSecret, callbackUrl } = env.github;

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error('Configuração OAuth do GitHub ausente.');
  }

  return { clientId, clientSecret, callbackUrl };
}

function ensureJwtSecret() {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET não configurado no servidor.');
  }

  return env.jwtSecret;
}

// GET /auth/github
// Redireciona o navegador para a tela de autorização do GitHub.
export async function redirectToGithub(_req: Request, res: Response) {
  try {
    const githubConfig = ensureGithubConfig();

    const params = new URLSearchParams({
      client_id: githubConfig.clientId,
      redirect_uri: githubConfig.callbackUrl,
      scope: 'read:user',
    });

    res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
  } catch {
    return res.status(500).json({
      error: 'GitHub OAuth não está configurado no servidor.',
    });
  }
}

// GET /auth/github/callback?code=...
// 1) troca o code pelo access_token
// 2) busca dados do usuário no GitHub
// 3) cria ou atualiza o User
// 4) emite um JWT e redireciona ao frontend
export async function githubCallback(req: Request, res: Response) {
  const code = req.query.code as string | undefined;
  if (!code) {
    return res.status(400).json({ error: 'Parâmetro "code" ausente.' });
  }

  let githubConfig;

  try {
    githubConfig = ensureGithubConfig();
  } catch {
    return res.status(500).json({
      error: 'GitHub OAuth não está configurado no servidor.',
    });
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: githubConfig.clientId,
      client_secret: githubConfig.clientSecret,
      code,
      redirect_uri: githubConfig.callbackUrl,
    }),
  });

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    return res
      .status(401)
      .json({ error: 'Falha ao obter access_token do GitHub.' });
  }

  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sinutre-back',
    },
  });

  const githubUser = (await userResponse.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
  };

  const user = await prisma.user.upsert({
    where: { githubId: String(githubUser.id) },
    update: {
      githubLogin: githubUser.login,
      name: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatar_url ?? undefined,
    },
    create: {
      githubId: String(githubUser.id),
      githubLogin: githubUser.login,
      name: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatar_url ?? undefined,
    },
  });

  const jwtSecret = ensureJwtSecret();
  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });

  res.redirect(`${env.frontendUrl}/?token=${token}`);
}
