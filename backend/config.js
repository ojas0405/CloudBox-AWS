import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('.env', import.meta.url)),
  quiet: true,
});
export const config = {
  region: process.env.AWS_REGION?.trim(),
  bucket: process.env.AWS_S3_BUCKET_NAME?.trim(),
  accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  sessionToken: process.env.AWS_SESSION_TOKEN?.trim(),
  useDefaultCredentials: process.env.USE_AWS_DEFAULT_CREDENTIALS === 'true',
  port: Number(process.env.PORT || 3001),
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
};
