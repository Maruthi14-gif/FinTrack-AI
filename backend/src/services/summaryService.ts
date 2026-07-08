import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import AIReport from '../models/AIReport.js';
import { ai, GEMINI_MODEL, extractJson, isQuotaOrKeyError } from '../utils/gemini.js';

// Build the monthly AI review report (total spending, top categories,
// observations, savings suggestions, budget performance, recommendations).
// Successful Gemini responses are cached in AIReport for one hour.
export async function getMonthlySummary(userId: string): Promise<any> {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);

  // 1. Check if there is a cached summary generated in the last 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const cachedSummary = await AIReport.findOne({
    userId,
    type: 'monthly_summary',
    createdAt: { $gte: oneHourAgo }
  }).sort({ createdAt: -1 });

  if (cachedSummary) {
    try {
      return JSON.parse(cachedSummary.content);
    } catch (jsonErr) {
      console.error('Failed to parse cached summary json:', jsonErr);
    }
  }

  // Fetch this month's expenses and budgets
  const expenses = await Expense.find({ userId, date: { $regex: `^${currentMonth}` } });
  const budgets = await Budget.find({ userId });

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
    return getFallbackReport();
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
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const parsedReport = JSON.parse(extractJson(response.text));

    // Cache the valid response
    const newReport = new AIReport({
      userId,
      type: 'monthly_summary',
      content: JSON.stringify(parsedReport)
    });
    await newReport.save();

    return parsedReport;
  } catch (apiError: any) {
    console.error('Gemini summary API error, using programmatic fallback:', apiError);
    if (isQuotaOrKeyError(apiError)) {
      return getFallbackReport();
    }
    throw apiError;
  }
}
