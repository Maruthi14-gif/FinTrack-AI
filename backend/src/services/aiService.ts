import { ai, GEMINI_MODEL, CATEGORIES, extractJson, normalizeCategory } from '../utils/gemini.js';

export interface ParsedExpense {
  item: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
}

function fallbackParseExpense(text: string): ParsedExpense[] {
  const today = new Date().toISOString().split('T')[0];
  const textLower = text.toLowerCase();

  // Extract amount
  let amount = 0;
  const cleanText = textLower.replace(/,/g, '');
  const amountMatch = cleanText.match(/(?:rs\.?|₹|usd|\$)?\s*(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
  }

  // Infer category
  let category = 'Others';
  for (const cat of CATEGORIES) {
    if (textLower.includes(cat.toLowerCase())) {
      category = cat;
      break;
    }
  }

  if (category === 'Others') {
    if (textLower.includes('lunch') || textLower.includes('dinner') || textLower.includes('breakfast') || textLower.includes('eat') || textLower.includes('restaurant') || textLower.includes('pizza') || textLower.includes('burger') || textLower.includes('food') || textLower.includes('groceries')) {
      category = 'Food';
    } else if (textLower.includes('cab') || textLower.includes('taxi') || textLower.includes('uber') || textLower.includes('petrol') || textLower.includes('fuel') || textLower.includes('flight') || textLower.includes('bus') || textLower.includes('train') || textLower.includes('travel') || textLower.includes('ola') || textLower.includes('auto')) {
      category = 'Travel';
    } else if (textLower.includes('movie') || textLower.includes('netflix') || textLower.includes('game') || textLower.includes('spotify') || textLower.includes('fun') || textLower.includes('entertainment') || textLower.includes('theatre') || textLower.includes('cinema')) {
      category = 'Entertainment';
    } else if (textLower.includes('bill') || textLower.includes('recharge') || textLower.includes('electricity') || textLower.includes('rent') || textLower.includes('water') || textLower.includes('gas') || textLower.includes('wifi') || textLower.includes('internet')) {
      category = 'Bills';
    } else if (textLower.includes('cloth') || textLower.includes('buy') || textLower.includes('shoe') || textLower.includes('amazon') || textLower.includes('tshirt') || textLower.includes('shopping') || textLower.includes('myntra') || textLower.includes('flipkart')) {
      category = 'Shopping';
    } else if (textLower.includes('school') || textLower.includes('college') || textLower.includes('book') || textLower.includes('course') || textLower.includes('education') || textLower.includes('fees') || textLower.includes('study')) {
      category = 'Education';
    } else if (textLower.includes('medicine') || textLower.includes('doctor') || textLower.includes('hospital') || textLower.includes('health') || textLower.includes('pharmacy') || textLower.includes('clinic')) {
      category = 'Healthcare';
    } else if (textLower.includes('stock') || textLower.includes('mutual fund') || textLower.includes('crypto') || textLower.includes('invest') || textLower.includes('gold')) {
      category = 'Investments';
    }
  }

  // Extract date
  let date = today;
  if (textLower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  } else if (textLower.includes('day before yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    date = d.toISOString().split('T')[0];
  }

  // Clean item name
  let item = text;
  if (amountMatch) {
    item = item.replace(amountMatch[0], '');
  }
  item = item.replace(/(?:rupees|rs\.?|₹|usd|\$|dollars)/gi, '');
  item = item.replace(/yesterday|day before yesterday|today/gi, '');
  item = item.replace(/^(?:spent|bought|paid|logged|add|spent on|bought a|paid for|on|for)\s+/i, '');
  item = item.replace(/\s+for\s+\d+/i, '');
  item = item.replace(/\s+on\s+/gi, ' ');
  item = item.replace(/^(?:on|for)\s+/i, '');
  item = item.replace(/\s+/g, ' ').trim();

  if (!item) {
    item = category !== 'Others' ? `${category} Expense` : 'Voice Entry';
  }

  // Capitalize first letter of item
  item = item.charAt(0).toUpperCase() + item.slice(1);

  return [{
    item: item.substring(0, 50),
    amount: amount || 0,
    category,
    date,
    description: 'Auto-extracted via local fallback engine.'
  }];
}

export async function parseExpense(text: string): Promise<ParsedExpense[]> {
  const today = new Date().toISOString().split('T')[0];

  if (!ai) {
    console.warn('Gemini API key is not configured, running offline parser fallback.');
    return fallbackParseExpense(text);
  }

  const prompt = `
Extract expense details from the following natural language text.
If there are multiple expenses, return a JSON array of objects.
If there is one expense, return a JSON array containing one object.
Each object must have the following keys exactly:
- "item": a short name of the expense, ALWAYS translated to English if the input text is in Hindi, Telugu, or any other language
- "amount": the number representing the cost
- "category": choose from exactly one of these: Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Investments, Others (use your best judgment based on the item)
- "date": the date in YYYY-MM-DD format. Assume the current date is ${today} unless specified otherwise in the text (like "yesterday").
- "description": optional description/extra details, ALWAYS translated to English if the input text is in another language

Text: "${text}"

Respond ONLY with valid JSON, do not include markdown formatting or backticks around it. Just the literal JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const jsonStr = extractJson(response.text, '[]');
    const parsed = JSON.parse(jsonStr);
    const result = Array.isArray(parsed) ? parsed : [parsed];

    return result.map(exp => ({
      item: exp.item || 'Unnamed Expense',
      amount: Number(exp.amount) || 0,
      category: normalizeCategory(exp.category),
      date: exp.date || today,
      description: exp.description || ''
    }));
  } catch (error: any) {
    console.error('Error in parseExpense, trying offline parser fallback:', error);
    return fallbackParseExpense(text);
  }
}

export async function generateInsights(expenses: any[]): Promise<string> {
  if (!ai) {
    return 'Gemini API key is missing. Add it to .env to see AI insights.';
  }

  const summaryStr = JSON.stringify(expenses, null, 2);

  const prompt = `
You are an AI financial advisor. Based on the following recent user expenses, provide 1-2 sentences of brief, actionable financial insights.
For example, if spending in a category is high, suggest a specific cut. If it's healthy, praise it.
Be concise and supportive.

Recent Expenses:
${summaryStr}

Provide just the insight text without any markdown or formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    return response.text ? response.text.trim() : 'No insights generated.';
  } catch (error) {
    console.error('Error in generateInsights:', error);
    return 'Could not generate insights at this time due to an AI error.';
  }
}
