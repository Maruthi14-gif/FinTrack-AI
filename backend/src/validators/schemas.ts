import { z } from 'zod';
import { text, optionalText, isoDate, positiveAmount, nonNegativeAmount } from './common.js';

// One schema per request body. Each describes exactly what the API accepts.

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('must be a valid email address'));

export const registerSchema = z.object({
  username: text(40),
  email,
  password: z.string().min(8, 'must be at least 8 characters').max(72, 'must be at most 72 characters'),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'must be a 3-letter currency code').optional()
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'is required').max(72)
});

export const expenseSchema = z.object({
  item: text(100),
  category: text(40),
  amount: positiveAmount,
  date: isoDate,
  description: optionalText(500),
  receiptId: z.string().regex(/^[a-f\d]{24}$/i, 'is not a valid id').nullable().optional()
});

export const parseExpenseSchema = z.object({ text: text(500) });

export const incomeSchema = z.object({
  source: text(100),
  category: text(40),
  amount: positiveAmount,
  date: isoDate,
  description: optionalText(500)
});

export const budgetSchema = z.object({
  category: text(40),
  monthly_limit: positiveAmount
});

export const debtSchema = z.object({
  name: text(100),
  principalAmount: positiveAmount,
  remainingBalance: nonNegativeAmount,
  interestRate: z.coerce.number({ error: 'must be a number' }).min(0, 'cannot be negative').max(100, 'cannot be more than 100'),
  emi: positiveAmount,
  dueDate: isoDate
});

export const subscriptionSchema = z.object({
  name: text(100),
  amount: positiveAmount,
  category: text(40),
  billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  nextDueDate: isoDate
});

export const chatSchema = z.object({ message: text(1000) });
export const querySchema = z.object({ text: text(300) });

export const receiptScanSchema = z.object({
  image: z.string().min(1, 'is required'),
  mimeType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], { error: 'must be JPG, PNG or WebP' })
});

export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.url('must be a valid URL').max(1000),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string().min(1).max(300), auth: z.string().min(1).max(300) })
  })
});
