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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  if (isProd) {
    const missing = REQUIRED_IN_PROD.filter((k) => !env[k]);
    if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const appOrigin = env.APP_ORIGIN || 'http://127.0.0.1:5173';
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
