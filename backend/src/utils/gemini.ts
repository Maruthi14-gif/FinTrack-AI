import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

// Single shared Gemini client. Null when no API key is configured — callers
// must fall back to their offline logic in that case.
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const GEMINI_MODEL = 'gemini-2.5-flash';

export const CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Education',
  'Entertainment',
  'Healthcare',
  'Investments',
  'Others'
];

// Gemini sometimes wraps JSON responses in markdown fences despite instructions.
export function extractJson(raw: string | undefined, fallback = '{}'): string {
  let jsonStr = raw ? raw.trim() : fallback;
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
  return jsonStr.trim();
}

// Map free-form model output onto the fixed category list.
export function normalizeCategory(raw?: string): string {
  let cat = raw || 'Others';
  cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  if (!CATEGORIES.includes(cat)) {
    if (cat === 'Transport') cat = 'Travel';
    else if (cat === 'Health') cat = 'Healthcare';
    else cat = 'Others';
  }
  return cat;
}

// Errors where retrying is pointless and the offline fallback should answer instead.
export function isQuotaOrKeyError(err: any): boolean {
  return Boolean(err?.message?.includes('quota') || err?.status === 429 || err?.message?.includes('API key'));
}
