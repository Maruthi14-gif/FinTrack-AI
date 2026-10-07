import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import env from '../config/env.js';

// Where receipt images are stored.
// - Cloudinary when its keys are set: required in production, because hosts like
//   Render wipe the local disk on every restart or deploy.
// - Local disk (backend/public/uploads) otherwise: convenient for development.

export interface StoredImage {
  url: string;
  publicId: string | null; // Cloudinary id, needed to delete the image later
}

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

export const usingCloudStorage = Boolean(env.cloudinary);

function badRequest(message: string): Error {
  return Object.assign(new Error(message), { status: 400 });
}

// Cloudinary authenticates a request with a signature: the parameters sorted by
// name, joined as key=value&..., with the API secret appended, hashed with SHA-1.
function sign(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

async function cloudinaryRequest(action: 'upload' | 'destroy', params: Record<string, string>, file?: string): Promise<any> {
  const { cloudName, apiKey, apiSecret } = env.cloudinary!;
  const signed = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };

  const body = new URLSearchParams({ ...signed, api_key: apiKey, signature: sign(signed, apiSecret) });
  if (file) body.set('file', file);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`, { method: 'POST', body });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Cloudinary ${action} failed: ${data?.error?.message || response.status}`);
  }
  return data;
}

export async function saveImage(base64Data: string, mimeType: string): Promise<StoredImage> {
  const ext = ALLOWED_TYPES[mimeType?.toLowerCase()];
  if (!ext) throw badRequest('Unsupported image type. Use JPG, PNG or WebP.');

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length === 0) throw badRequest('Image data is empty or invalid.');
  if (buffer.length > MAX_BYTES) throw badRequest('Image is too large. Maximum size is 5 MB.');

  if (env.cloudinary) {
    const result = await cloudinaryRequest('upload', { folder: 'fintrack/receipts' }, `data:${mimeType};base64,${base64Data}`);
    return { url: result.secure_url, publicId: result.public_id };
  }

  if (env.isProduction) {
    console.warn('Cloudinary is not configured: saving receipt to local disk, which most hosts wipe on restart.');
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `receipt-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return { url: `/uploads/${filename}`, publicId: null };
}

// Best-effort: a failed image delete should never block deleting the receipt.
export async function deleteImage(image: { url?: string | null; publicId?: string | null }): Promise<void> {
  try {
    if (image.publicId && env.cloudinary) {
      await cloudinaryRequest('destroy', { public_id: image.publicId });
    } else if (image.url?.startsWith('/uploads/')) {
      // basename() stops a crafted path like /uploads/../../x from escaping the folder
      await fs.promises.rm(path.join(UPLOAD_DIR, path.basename(image.url)), { force: true });
    }
  } catch (err) {
    console.error('Failed to delete receipt image:', err);
  }
}
