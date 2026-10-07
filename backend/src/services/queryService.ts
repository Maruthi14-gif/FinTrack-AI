import Expense from '../models/Expense.js';
import { escapeRegex } from '../utils/query.js';
import { ai, GEMINI_MODEL, CATEGORIES, extractJson, isQuotaOrKeyError } from '../utils/gemini.js';

export interface ExpenseFilter {
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface QueryResult {
  filter: ExpenseFilter;
  expenses: any[];
  fallback?: boolean;
}

// Keyword-based filter extraction used when Gemini is unavailable.
function getFallbackFilter(queryText: string): ExpenseFilter {
  const today = new Date();
  const textLower = queryText.toLowerCase();
  const filter: ExpenseFilter = {};

  // Amount checks (e.g. "above 1000", "greater than 500", "> 200")
  const amountMatch = textLower.match(/(?:above|greater than|more than|>\s*)(\d+)/);
  if (amountMatch) {
    filter.minAmount = parseInt(amountMatch[1], 10);
  }

  const belowMatch = textLower.match(/(?:below|less than|under|<\s*)(\d+)/);
  if (belowMatch) {
    filter.maxAmount = parseInt(belowMatch[1], 10);
  }

  // Category check
  for (const cat of CATEGORIES) {
    if (textLower.includes(cat.toLowerCase())) {
      filter.category = cat;
      break;
    }
  }

  // Date range checks
  if (textLower.includes('last week') || textLower.includes('past week')) {
    const start = new Date();
    start.setDate(today.getDate() - 7);
    filter.startDate = start.toISOString().split('T')[0];
    filter.endDate = today.toISOString().split('T')[0];
  } else if (textLower.includes('today')) {
    filter.startDate = today.toISOString().split('T')[0];
    filter.endDate = today.toISOString().split('T')[0];
  } else if (textLower.includes('this month')) {
    filter.startDate = today.toISOString().slice(0, 7) + '-01';
    filter.endDate = today.toISOString().split('T')[0];
  }

  // If no other filters, treat as item search keyword
  if (!filter.category && !filter.minAmount && !filter.maxAmount && !filter.startDate) {
    const cleanText = textLower.replace(/show|expenses|expense|find|search|for/g, '').trim();
    if (cleanText) {
      filter.search = cleanText;
    }
  }

  return filter;
}

// Translate a structured filter into a Mongoose query object.
// The filter may come from the AI model, so every field is type-checked first:
// model output is treated like any other untrusted input.
function buildMongoQuery(userId: string, filter: ExpenseFilter): any {
  const query: any = { userId };
  const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

  if (typeof filter.search === 'string' && filter.search.trim()) {
    query.item = { $regex: escapeRegex(filter.search.trim().slice(0, 100)), $options: 'i' };
  }
  if (typeof filter.category === 'string' && CATEGORIES.includes(filter.category)) {
    query.category = filter.category;
  }
  if (isDate(filter.startDate) || isDate(filter.endDate)) {
    query.date = {};
    if (isDate(filter.startDate)) query.date.$gte = filter.startDate;
    if (isDate(filter.endDate)) query.date.$lte = filter.endDate;
  }
  if (isAmount(filter.minAmount) || isAmount(filter.maxAmount)) {
    query.amount = {};
    if (isAmount(filter.minAmount)) query.amount.$gte = filter.minAmount;
    if (isAmount(filter.maxAmount)) query.amount.$lte = filter.maxAmount;
  }

  return query;
}

async function findFilteredExpenses(userId: string, filter: ExpenseFilter): Promise<any[]> {
  const expenses = await Expense.find(buildMongoQuery(userId, filter)).sort({ date: -1, _id: -1 }).limit(500);
  return expenses.map(e => ({ ...e.toObject(), id: e._id }));
}

// Convert a natural language search ("show petrol expenses above 500 last week")
// into a structured filter, then run it against the user's expenses.
export async function searchExpensesByText(userId: string, text: string): Promise<QueryResult> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate dates for last week relative to today
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split('T')[0];

  if (!ai) {
    console.warn('Gemini API is not configured. Translating natural language query locally.');
    const filter = getFallbackFilter(text);
    return {
      filter,
      expenses: await findFilteredExpenses(userId, filter),
      fallback: true
    };
  }

  const prompt = `
Convert the following natural language expense search query into a structured JSON filter.
Query: "${text}"

Determine if the query specifies search keyword, category, date filters, or amount thresholds.
Allowed categories: Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Investments, Others.
Assume the current date is ${todayStr}. "last week" starts from ${lastWeekStr} to ${todayStr}.

Respond ONLY with a JSON object containing any of these optional keys. Do not include markdown formatting or backticks.
Schema:
{
  "search": "keyword regex (string)",
  "category": "exact category string matches one of allowed",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "minAmount": number,
  "maxAmount": number
}

Example: "Show expenses above 1000" -> {"minAmount": 1000}
Example: "Show petrol expenses" -> {"search": "petrol"}
Example: "Show food expenses last week" -> {"category": "Food", "startDate": "${lastWeekStr}", "endDate": "${todayStr}"}

Respond with only the literal JSON object:`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const filter: ExpenseFilter = JSON.parse(extractJson(response.text));

    return {
      filter,
      expenses: await findFilteredExpenses(userId, filter)
    };
  } catch (apiError: any) {
    console.error('Gemini query API error, using programmatic fallback parser:', apiError);
    if (isQuotaOrKeyError(apiError)) {
      const filter = getFallbackFilter(text);
      return {
        filter,
        expenses: await findFilteredExpenses(userId, filter),
        fallback: true
      };
    }
    throw apiError;
  }
}
