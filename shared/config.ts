import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Environment schema validation
const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  DATABASE_POOL_MIN: z.string().transform(Number).default('2'),
  DATABASE_POOL_MAX: z.string().transform(Number).default('10'),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Authentication
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Application URLs
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3000/api'),

  // CORS
  CORS_ORIGINS: z.string().transform(val => val.split(',')).default(['http://localhost:3000']),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  SESSION_MAX_AGE: z.string().transform(Number).default('604800000'), // 7 days
  SESSION_SECURE: z.string().transform(val => val === 'true').default('false'),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'), // 5MB
  UPLOAD_PATH: z.string().default('./uploads'),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),

  // Monitoring
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),

  // Cache
  CACHE_TTL: z.string().transform(Number).default('300'), // 5 minutes
  CACHE_MAX_SIZE: z.string().transform(Number).default('1000'),

  // Features
  ENABLE_REGISTRATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_EMAIL_VERIFICATION: z.string().transform(val => val === 'true').default('false'),
  ENABLE_2FA: z.string().transform(val => val === 'true').default('false'),

  // External Services
  WEBHOOK_URL: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  // Development
  ENABLE_SEED_DATA: z.string().transform(val => val === 'true').default('false'),
  ENABLE_SWAGGER: z.string().transform(val => val === 'true').default('false'),
});

// Validate and parse environment variables
const env = envSchema.parse(process.env);

// Export configuration object
export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  
  // Database configuration
  database: {
    url: env.DATABASE_URL,
    pool: {
      min: env.DATABASE_POOL_MIN,
      max: env.DATABASE_POOL_MAX,
    },
  },

  // Redis configuration
  redis: {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },

  // Authentication configuration
  auth: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    session: {
      secret: env.SESSION_SECRET,
      maxAge: env.SESSION_MAX_AGE,
      secure: env.SESSION_SECURE,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    bcrypt: {
      rounds: env.BCRYPT_ROUNDS,
    },
  },

  // Application URLs
  urls: {
    app: env.APP_URL,
    api: env.API_URL,
  },

  // CORS configuration
  cors: {
    origins: env.CORS_ORIGINS,
  },

  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  // File upload configuration
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    path: env.UPLOAD_PATH,
  },

  // Email configuration
  email: env.SMTP_HOST ? {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  } : null,

  // Logging configuration
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },

  // Monitoring configuration
  monitoring: {
    enabled: env.ENABLE_METRICS,
    port: env.METRICS_PORT,
  },

  // Cache configuration
  cache: {
    ttl: env.CACHE_TTL,
    maxSize: env.CACHE_MAX_SIZE,
  },

  // Feature flags
  features: {
    registration: env.ENABLE_REGISTRATION,
    emailVerification: env.ENABLE_EMAIL_VERIFICATION,
    twoFactorAuth: env.ENABLE_2FA,
    seedData: env.ENABLE_SEED_DATA,
    swagger: env.ENABLE_SWAGGER,
  },

  // External services
  webhooks: {
    url: env.WEBHOOK_URL,
    secret: env.WEBHOOK_SECRET,
  },

  // Environment helpers
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  isStaging: env.NODE_ENV === 'staging',
  isProduction: env.NODE_ENV === 'production',
};

export default config;