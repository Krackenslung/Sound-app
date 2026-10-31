export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AppConfig {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  appOrigin: string;
  sessionSecret: string;
  redisUrl?: string;
  spotify: SpotifyConfig;
}

const REQUIRED_IN_PROD = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_REDIRECT_URI',
  'SESSION_SECRET',
  'REDIS_URL',
  'APP_ORIGIN',
] as const;

/**
 * In a GitHub Codespace the dev client is reached through a forwarded HTTPS URL
 * (`https://<codespace>-5173.<domain>`), not 127.0.0.1. Derive it so OAuth
 * redirects and CORS work without hand-editing APP_ORIGIN per codespace.
 */
export function codespacesOrigin(env: NodeJS.ProcessEnv): string | undefined {
  const name = env.CODESPACE_NAME;
  const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (!name || !domain || env.NODE_ENV === 'production') return undefined;
  return `https://${name}-5173.${domain}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  if (isProd) {
    const missing = REQUIRED_IN_PROD.filter((k) => !env[k]);
    if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const appOrigin = env.APP_ORIGIN || codespacesOrigin(env) || 'http://127.0.0.1:5173';
  return {
    nodeEnv,
    isProd,
    port: Number(env.PORT ?? 3001),
    appOrigin,
    sessionSecret: env.SESSION_SECRET || 'dev-only-insecure-session-secret',
    redisUrl: env.REDIS_URL || undefined,
    spotify: {
      clientId: env.SPOTIFY_CLIENT_ID ?? '',
      clientSecret: env.SPOTIFY_CLIENT_SECRET ?? '',
      redirectUri: env.SPOTIFY_REDIRECT_URI || `${appOrigin}/api/auth/callback`,
    },
  };
}
