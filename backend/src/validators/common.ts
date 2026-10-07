import { z } from 'zod';

export const text = (max: number) => z.string().trim().min(1, 'is required').max(max, `must be at most ${max} characters`);
export const optionalText = (max: number) => z.string().trim().max(max, `must be at most ${max} characters`).optional().default('');

export const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date in YYYY-MM-DD format')
  .refine(value => !Number.isNaN(Date.parse(value)), 'is not a real date');

const MAX_AMOUNT = 1_000_000_000;
export const positiveAmount = z.coerce.number({ error: 'must be a number' }).positive('must be greater than 0').max(MAX_AMOUNT, 'is too large');
export const nonNegativeAmount = z.coerce.number({ error: 'must be a number' }).min(0, 'cannot be negative').max(MAX_AMOUNT, 'is too large');
