import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import AIReport from '../models/AIReport.js';
import Receipt from '../models/Receipt.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper function for local pattern-matching chatbot answers
function getOfflineChatReply(message: string, context: { currentDate: string, budgets: any[], expenses: any[] }): string {
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
  const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Entertainment', 'Healthcare', 'Investments', 'Others'];
  for (const cat of categories) {
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

// POST /api/ai/chat - AI Financial Assistant Chat
router.post('/chat', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Fetch user's financial data to feed context to Gemini
    const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 }).limit(150);
    const budgets = await Budget.find({ userId: req.user.id });

    const today = new Date().toISOString().split('T')[0];

    const dataContext = {
      currentDate: today,
      budgets: budgets.map(b => ({ category: b.category, limit: b.monthly_limit })),
      expenses: expenses.map(e => ({ item: e.item, amount: e.amount, category: e.category, date: e.date, description: e.description }))
    };

    if (!ai) {
      console.warn('Gemini API is not configured. Using offline fallback analyzer.');
      const reply = getOfflineChatReply(message, dataContext);
      return res.json({ reply });
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
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ reply: response.text ? response.text.trim() : 'I could not analyze your data at this time.' });
    } catch (apiError: any) {
      console.error('Gemini Chat API error, using offline fallback:', apiError);
      if (apiError.message?.includes('quota') || apiError.status === 429 || apiError.message?.includes('API key')) {
        const reply = getOfflineChatReply(message, dataContext);
        return res.json({ reply });
      }
      throw apiError;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/query - Natural Language Search to Filter translation
router.post('/query', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text query is required' });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate dates for last week relative to today
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    // Fallback filter function if Gemini is offline
    const getFallbackFilter = (queryText: string) => {
      const textLower = queryText.toLowerCase();
      const filter: any = {};

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
      const categories = ['food', 'travel', 'shopping', 'bills', 'education', 'entertainment', 'healthcare', 'investments', 'others'];
      for (const cat of categories) {
        if (textLower.includes(cat)) {
          filter.category = cat.charAt(0).toUpperCase() + cat.slice(1);
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
    };

    if (!ai) {
      console.warn('Gemini API is not configured. Translating natural language query locally.');
      const filter = getFallbackFilter(text);
      const query: any = { userId: req.user.id };

      if (filter.search) {
        query.item = { $regex: filter.search, $options: 'i' };
      }
      if (filter.category) {
        query.category = filter.category;
      }
      if (filter.startDate || filter.endDate) {
        query.date = {};
        if (filter.startDate) query.date.$gte = filter.startDate;
        if (filter.endDate) query.date.$lte = filter.endDate;
      }
      if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
        query.amount = {};
        if (filter.minAmount !== undefined) query.amount.$gte = filter.minAmount;
        if (filter.maxAmount !== undefined) query.amount.$lte = filter.maxAmount;
      }

      const expenses = await Expense.find(query).sort({ date: -1, _id: -1 });
      return res.json({
        filter,
        expenses: expenses.map(e => ({ ...e.toObject(), id: e._id })),
        fallback: true
      });
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
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text ? response.text.trim() : '{}';
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

      const filter = JSON.parse(jsonStr.trim());

      // Construct Mongoose query object based on filter
      const query: any = { userId: req.user.id };

      if (filter.search) {
        query.item = { $regex: filter.search, $options: 'i' };
      }
      if (filter.category) {
        query.category = filter.category;
      }
      if (filter.startDate || filter.endDate) {
        query.date = {};
        if (filter.startDate) query.date.$gte = filter.startDate;
        if (filter.endDate) query.date.$lte = filter.endDate;
      }
      if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
        query.amount = {};
        if (filter.minAmount !== undefined) query.amount.$gte = filter.minAmount;
        if (filter.maxAmount !== undefined) query.amount.$lte = filter.maxAmount;
      }

      const expenses = await Expense.find(query).sort({ date: -1, _id: -1 });
      res.json({
        filter,
        expenses: expenses.map(e => ({ ...e.toObject(), id: e._id }))
      });
    } catch (apiError: any) {
      console.error('Gemini query API error, using programmatic fallback parser:', apiError);
      if (apiError.message?.includes('quota') || apiError.status === 429 || apiError.message?.includes('API key')) {
        const filter = getFallbackFilter(text);
        const query: any = { userId: req.user.id };

        if (filter.search) {
          query.item = { $regex: filter.search, $options: 'i' };
        }
        if (filter.category) {
          query.category = filter.category;
        }
        if (filter.startDate || filter.endDate) {
          query.date = {};
          if (filter.startDate) query.date.$gte = filter.startDate;
          if (filter.endDate) query.date.$lte = filter.endDate;
        }
        if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
          query.amount = {};
          if (filter.minAmount !== undefined) query.amount.$gte = filter.minAmount;
          if (filter.maxAmount !== undefined) query.amount.$lte = filter.maxAmount;
        }

        const expenses = await Expense.find(query).sort({ date: -1, _id: -1 });
        return res.json({
          filter,
          expenses: expenses.map(e => ({ ...e.toObject(), id: e._id })),
          fallback: true
        });
      }
      throw apiError;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/summary - Detailed Monthly Summary & Spending Recommendations
router.get('/summary', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);

    // 1. Check if there is a cached summary generated in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cachedSummary = await AIReport.findOne({
      userId: req.user.id,
      type: 'monthly_summary',
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });

    if (cachedSummary) {
      try {
        const parsedReport = JSON.parse(cachedSummary.content);
        return res.json(parsedReport);
      } catch (jsonErr) {
        console.error('Failed to parse cached summary json:', jsonErr);
      }
    }

    // Fetch this month's expenses and budgets
    const expenses = await Expense.find({ userId: req.user.id, date: { $regex: `^${currentMonth}` } });
    const budgets = await Budget.find({ userId: req.user.id });

    // Spent by category
    const spentByCategory = expenses.reduce((acc: { [key: string]: number }, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const budgetStatus = budgets.map(b => ({
      category: b.category,
      limit: b.monthly_limit,
      spent: spentByCategory[b.category] || 0
    }));

    const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const sortedCategories = Object.entries(spentByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
    const topCategories = sortedCategories.slice(0, 3);

    // Helper to get fallback programmatic report
    const getFallbackReport = () => ({
      totalSpending,
      topCategories: topCategories.length > 0 ? topCategories : ["None yet"],
      observations: [
        `You spent a total of ₹${totalSpending.toLocaleString()} this month.`,
        topCategories.length > 0 
          ? `Your highest spending category is ${topCategories[0]}.` 
          : "No expenses recorded this month."
      ],
      savingsSuggestions: [
        "AI Financial Advisor is resting due to API quota limits. Try reviewing your transaction history for potential savings.",
        "Compare your actual spending against budgets to identify potential optimization areas."
      ],
      budgetPerformance: "AI Coach is currently offline due to rate limits. Please check your budgets page manually.",
      spendingRecommendations: [
        "Monitor your daily expenses closely in the Transactions view.",
        "Consider setting strict budget limits on your highest spending categories."
      ]
    });

    if (!ai) {
      console.warn('Gemini API key is not configured. Generating programmatic monthly summary report.');
      const fallbackReport = getFallbackReport();
      return res.json(fallbackReport);
    }

    const prompt = `
You are an expert financial advisory engine. Based on the monthly financial summaries and budgets below, generate a detailed monthly review report.
Return your response ONLY in a valid JSON object matching the schema below. Do not include markdown ticks.

Data Context:
Total Month Spending: ₹${totalSpending}
Budget Performance Status: ${JSON.stringify(budgetStatus)}
All Month Expenses: ${JSON.stringify(expenses.map(e => ({ item: e.item, amount: e.amount, category: e.category, date: e.date })))}

JSON Schema output:
{
  "totalSpending": number,
  "topCategories": ["category name", "category name"],
  "observations": ["observation string 1", "observation string 2"],
  "savingsSuggestions": ["suggestion 1", "suggestion 2"],
  "budgetPerformance": "brief paragraph summarizing budget adherence (e.g. overspent categories, remaining budget)",
  "spendingRecommendations": ["recommendation 1", "recommendation 2"]
}

Generate the literal JSON object:`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text ? response.text.trim() : '{}';
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

      const parsedReport = JSON.parse(jsonStr.trim());

      // Cache the valid response
      const newReport = new AIReport({
        userId: req.user.id,
        type: 'monthly_summary',
        content: JSON.stringify(parsedReport)
      });
      await newReport.save();

      return res.json(parsedReport);
    } catch (apiError: any) {
      console.error('Gemini summary API error, using programmatic fallback:', apiError);
      if (apiError.message?.includes('quota') || apiError.status === 429 || apiError.message?.includes('API key')) {
        const fallbackReport = getFallbackReport();
        return res.json(fallbackReport);
      }
      throw apiError;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/parse-receipt - AI Multimodal Receipt Scanning
router.post('/parse-receipt', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Image data and mimeType are required' });
    }

    // Extract the raw base64 string
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Setup local saving folder
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = mimeType.split('/')[1] || 'jpg';
    const filename = `receipt-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    const imageUrl = `/uploads/${filename}`;

    if (!ai) {
      console.warn('Gemini API is not configured. Running offline fallback receipt parser.');
      
      const newReceipt = new Receipt({
        userId: req.user.id,
        merchant: 'Unprocessed Receipt (Offline Fallback)',
        amount: 1250,
        date: new Date().toISOString().split('T')[0],
        rawText: 'Gemini API not configured.',
        imageUrl,
        status: 'failed'
      });
      await newReceipt.save();

      return res.json({
        id: newReceipt._id,
        merchant: "Sample Store",
        totalAmount: 1250,
        date: new Date().toISOString().split('T')[0],
        category: "Shopping",
        description: "Simulated extraction (Gemini API key missing)",
        lineItems: [
          { item: "Item 1", amount: 800, category: "Shopping" },
          { item: "Item 2", amount: 450, category: "Food" }
        ],
        imageUrl,
        fallback: true
      });
    }

    const prompt = `
Analyze this receipt image. Extract the following information:
1. The merchant or store name (e.g. "Walmart" or "Starbucks").
2. The transaction date in YYYY-MM-DD format (use today's date ${new Date().toISOString().split('T')[0]} if not clearly specified).
3. The total amount of the bill as a number.
4. The general category (choose EXACTLY from: Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Investments, Others).
5. A short summary description.
6. A detailed breakdown of individual line items, each with:
   - "item": name of the item
   - "amount": cost of the item as a number
   - "category": choose EXACTLY from: Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Investments, Others (use best judgment based on the item)

Respond ONLY with a JSON object of this structure. Do not include markdown formatting or backticks around it:
{
  "merchant": "string",
  "totalAmount": number,
  "date": "YYYY-MM-DD",
  "category": "string",
  "description": "string",
  "lineItems": [
    { "item": "string", "amount": number, "category": "string" }
  ]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          prompt
        ]
      });

      let jsonStr = response.text ? response.text.trim() : '{}';
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

      const result = JSON.parse(jsonStr.trim());

      const validCategories = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Entertainment', 'Healthcare', 'Investments', 'Others'];
      
      let parsedCategory = result.category || 'Others';
      parsedCategory = parsedCategory.charAt(0).toUpperCase() + parsedCategory.slice(1).toLowerCase();
      if (!validCategories.includes(parsedCategory)) {
        if (parsedCategory === 'Transport') parsedCategory = 'Travel';
        else if (parsedCategory === 'Health') parsedCategory = 'Healthcare';
        else parsedCategory = 'Others';
      }

      const formattedLineItems = (result.lineItems || []).map((li: any) => {
        let cat = li.category || 'Others';
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        if (!validCategories.includes(cat)) {
          if (cat === 'Transport') cat = 'Travel';
          else if (cat === 'Health') cat = 'Healthcare';
          else cat = 'Others';
        }
        return {
          item: li.item || 'Unnamed Item',
          amount: Number(li.amount) || 0,
          category: cat
        };
      });

      // Save receipt record in database
      const newReceipt = new Receipt({
        userId: req.user.id,
        merchant: result.merchant || 'Unknown Merchant',
        amount: Number(result.totalAmount) || 0,
        date: result.date || new Date().toISOString().split('T')[0],
        rawText: result.description || jsonStr,
        imageUrl,
        status: 'processed'
      });
      await newReceipt.save();

      res.json({
        id: newReceipt._id,
        merchant: result.merchant || 'Unknown Merchant',
        totalAmount: Number(result.totalAmount) || 0,
        date: result.date || new Date().toISOString().split('T')[0],
        category: parsedCategory,
        description: result.description || '',
        lineItems: formattedLineItems,
        imageUrl
      });
    } catch (apiError: any) {
      console.error('Gemini API receipt parsing error, returning offline fallback:', apiError);
      
      const newReceipt = new Receipt({
        userId: req.user.id,
        merchant: 'Unprocessed Receipt (Gemini Error Fallback)',
        amount: 1250,
        date: new Date().toISOString().split('T')[0],
        rawText: `Gemini API error: ${apiError.message || apiError}`,
        imageUrl,
        status: 'failed'
      });
      await newReceipt.save();

      res.json({
        id: newReceipt._id,
        merchant: "Sample Store",
        totalAmount: 1250,
        date: new Date().toISOString().split('T')[0],
        category: "Shopping",
        description: "Simulated extraction (Gemini API quota exhausted)",
        lineItems: [
          { item: "Item 1", amount: 800, category: "Shopping" },
          { item: "Item 2", amount: 450, category: "Food" }
        ],
        imageUrl,
        fallback: true,
        warning: 'Gemini API limit exceeded. Using offline fallback parser.'
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
