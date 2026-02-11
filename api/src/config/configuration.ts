function requireEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export type AppConfig = {
  nodeEnv: string;
  api: {
    port: number;
  };
  database: {
    url: string;
  };
};

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    port: Number(process.env.API_PORT ?? process.env.PORT ?? 3001),
  },
  database: {
    url: requireEnv('DATABASE_URL'),
  },
});
