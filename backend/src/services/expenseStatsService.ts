import mongoose from 'mongoose';
import Expense from '../models/Expense.js';

// All "add up the expenses" questions go through this file.
// The sums are computed inside MongoDB (aggregation), so the server never has
// to load every expense into memory just to total them.

export const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

export const dateKey = (date: Date = new Date()): string => date.toISOString().slice(0, 10); // YYYY-MM-DD
export const monthKey = (date: Date = new Date()): string => date.toISOString().slice(0, 7); // YYYY-MM

// The month N months before `from`, as YYYY-MM.
export function monthsAgoKey(n: number, from: Date = new Date()): string {
  return monthKey(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - n, 1)));
}

// Dates are stored as 'YYYY-MM-DD' text, which sorts alphabetically in date
// order. So "everything in October" is a plain range, and a range can use the
// database index (a regex like /^2026-10/ often cannot).
export const monthRange = (month: string) => ({ $gte: `${month}-01`, $lte: `${month}-31` });

// Total spent by one user, optionally narrowed to a category and/or date range.
export async function totalSpent(userId: string, filter: { category?: string; date?: object } = {}): Promise<number> {
  const [row] = await Expense.aggregate([
    { $match: { userId: toObjectId(userId), ...filter } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return row?.total ?? 0;
}

// { Food: 4200, Travel: 900, ... } for one month.
export async function spentByCategory(userId: string, month: string = monthKey()): Promise<Record<string, number>> {
  const rows = await Expense.aggregate([
    { $match: { userId: toObjectId(userId), date: monthRange(month) } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } }
  ]);
  return Object.fromEntries(rows.map(row => [row._id, row.total]));
}

// { Food: { '2026-08': 3000, '2026-09': 3500 }, ... } from `fromMonth` until now.
// One query answers "how much per category per month", whatever the number of categories.
export async function monthlyTotalsByCategory(
  userId: string,
  fromMonth: string,
  category?: string
): Promise<Record<string, Record<string, number>>> {
  const rows = await Expense.aggregate([
    { $match: { userId: toObjectId(userId), date: { $gte: `${fromMonth}-01` }, ...(category ? { category } : {}) } },
    { $group: { _id: { category: '$category', month: { $substrBytes: ['$date', 0, 7] } }, total: { $sum: '$amount' } } }
  ]);

  const result: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    (result[row._id.category] ??= {})[row._id.month] = row.total;
  }
  return result;
}
