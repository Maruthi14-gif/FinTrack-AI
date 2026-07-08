import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import { ai, GEMINI_MODEL, CATEGORIES, isQuotaOrKeyError } from '../utils/gemini.js';

interface ChatContext {
  currentDate: string;
  budgets: { category: string; limit: number }[];
  expenses: any[];
}

// Pattern-matching answers used when Gemini is unavailable (no key / quota exhausted).
function getOfflineChatReply(message: string, context: ChatContext): string {
  const msgLower = message.toLowerCase();

  // 1. How much did I spend this month?
  if (
    msgLower.includes('spend this month') ||
    msgLower.includes('month spending') ||
    msgLower.includes('spent this month') ||
    msgLower.includes('spending this month')
  ) {
    const currentMonth = context.currentDate.slice(0, 7);
    const monthExpenses = context.expenses.filter(e => e.date && e.date.startsWith(currentMonth));
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    return `You spent a total of **₹${total.toLocaleString()}** in this current month.`;
  }

  // 2. What is my highest spending category?
  if (
    msgLower.includes('highest spending') ||
    msgLower.includes('highest category') ||
    msgLower.includes('spend the most') ||
    msgLower.includes('maximum spend')
  ) {
    const catTotals: { [key: string]: number } = {};
    context.expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      return `Your highest spending category is **${sorted[0][0]}** with a total of **₹${sorted[0][1].toLocaleString()}**.`;
    } else {
      return "You don't have any expenses logged yet to determine the highest category.";
    }
  }

  // 3. Show my food expenses / travel expenses / etc.
  for (const cat of CATEGORIES) {
    if (
      msgLower.includes(`${cat.toLowerCase()} expenses`) ||
      msgLower.includes(`${cat.toLowerCase()} spend`) ||
      msgLower.includes(`spent on ${cat.toLowerCase()}`)
    ) {
      const catExpenses = context.expenses.filter(e => e.category.toLowerCase() === cat.toLowerCase());
      const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      return `Your total spending on **${cat}** is **₹${total.toLocaleString()}** (based on recent transactions).`;
    }
  }

  // 4. How much did I spend last week?
  if (
    msgLower.includes('last week') ||
    msgLower.includes('spend last week') ||
    msgLower.includes('spent last week')
  ) {
    const today = new Date(context.currentDate);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const lastWeekExpenses = context.expenses.filter(e => {
      if (!e.date) return false;
      const expDate = new Date(e.date);
      return expDate >= sevenDaysAgo && expDate <= today;
    });
    const total = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
    return `You spent a total of **₹${total.toLocaleString()}** over the last 7 days.`;
  }

  // 5. Budget inquiry
  if (msgLower.includes('budget')) {
    if (context.budgets.length === 0) {
      return "You haven't set any category budgets yet. Head over to the Budgets page to set some!";
    }
    const budgetList = context.budgets.map(b => `**${b.category}**: ₹${b.limit.toLocaleString()}`).join(', ');
    return `Your current category budgets: ${budgetList}.`;
  }

  // 6. Generic fallback
  return "AI Financial Coach is currently in offline mode to preserve API quota. Ask standard queries like *'How much did I spend this month?'* or *'What is my highest spending category?'*";
}

// Answer a free-form question against the user's own financial data.
export async function chatWithAssistant(userId: string, message: string): Promise<string> {
  const expenses = await Expense.find({ userId }).sort({ date: -1 }).limit(150);
  const budgets = await Budget.find({ userId });

  const today = new Date().toISOString().split('T')[0];

  const dataContext: ChatContext = {
    currentDate: today,
    budgets: budgets.map(b => ({ category: b.category, limit: b.monthly_limit })),
    expenses: expenses.map(e => ({ item: e.item, amount: e.amount, category: e.category, date: e.date, description: e.description }))
  };

  if (!ai) {
    console.warn('Gemini API is not configured. Using offline fallback analyzer.');
    return getOfflineChatReply(message, dataContext);
  }

  const prompt = `
You are FinVoice, an expert AI financial assistant. You are chatting with a user.
Answer the user's question contextually based ONLY on their financial data provided below.
If you need to perform calculations (summing expenses, finding max spending, etc.), do so accurately.
Keep your answer concise (2-4 sentences max), direct, and professional.
Do not make assumptions beyond the provided data. Highlight numbers or categories using bold markdown text.

Current Date: ${today}
User budgets: ${JSON.stringify(dataContext.budgets)}
User recent expenses: ${JSON.stringify(dataContext.expenses)}

User Message: "${message}"

Your response:`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return response.text ? response.text.trim() : 'I could not analyze your data at this time.';
  } catch (apiError: any) {
    console.error('Gemini Chat API error, using offline fallback:', apiError);
    if (isQuotaOrKeyError(apiError)) {
      return getOfflineChatReply(message, dataContext);
    }
    throw apiError;
  }
}
