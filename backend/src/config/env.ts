import dotenv from 'dotenv';

dotenv.config();

// Single place where environment variables are read and validated.
// Every other file imports `env` from here instead of touching process.env,
// so a missing setting fails loudly at startup, not halfway through a request.

const missing: string[] = [];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) missing.push(name);
  return value ?? '';
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const nodeEnv = optional('NODE_ENV') ?? 'development';

const cloudName = optional('CLOUDINARY_CLOUD_NAME');
const cloudKey = optional('CLOUDINARY_API_KEY');
const cloudSecret = optional('CLOUDINARY_API_SECRET');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(optional('PORT')) || 5000,

  mongoUri: required('MONGO_URI'),
  jwtSecret: required('JWT_SECRET'),

  // Comma-separated list of frontend origins allowed to call this API.
  clientUrls: (optional('CLIENT_URL') ?? 'http://localhost:5173')
    .split(',')
    .map(url => url.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  // Optional: without it the app runs with its offline (non-AI) fallbacks.
  geminiApiKey: optional('GEMINI_API_KEY'),

  // Receipt image storage. Null means "save to local disk" (development only).
  cloudinary: cloudName && cloudKey && cloudSecret ? { cloudName, apiKey: cloudKey, apiSecret: cloudSecret } : null,

  // Optional in development; set both in production (see config/webPush.ts).
  vapidPublicKey: optional('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: optional('VAPID_PRIVATE_KEY'),
  vapidSubject: optional('VAPID_SUBJECT') ?? 'mailto:admin@example.com'
};

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}. See backend/.env.example.`);
  process.exit(1);
}

export default env;
