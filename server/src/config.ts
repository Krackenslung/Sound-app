export interface AppConfig {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  appOrigin: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  return {
    nodeEnv,
    isProd: nodeEnv === 'production',
    port: Number(env.PORT ?? 3001),
    appOrigin: env.APP_ORIGIN ?? 'http://127.0.0.1:5173',
  };
}
