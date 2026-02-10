const DEFAULT_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/ticketdb';

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
    port: Number(process.env.API_PORT ?? 3001),
  },
  database: {
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  },
});
