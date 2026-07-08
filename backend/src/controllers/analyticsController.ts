import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import AIReport from '../models/AIReport.js';
import Income from '../models/Income.js';
import Debt from '../models/Debt.js';
import Budget from '../models/Budget.js';
import { generateInsights } from '../services/aiService.js';
import { findSpendingAnomalies } from '../services/alertService.js';

// GET /api/analytics/distribution - spending by category (Pie Chart)
export const getDistribution = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const distribution = await Expense.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          _id: 0
        }
      }
    ]);
    res.json(distribution);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/insights - AI financial insights with 1-hour caching
export const getInsights = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if there is a cached insight generated in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cachedInsight = await AIReport.findOne({
      userId: req.user.id,
      type: 'savings_insight',
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });

    if (cachedInsight) {
      return res.json({ insight: cachedInsight.content });
    }

    // Get last 50 expenses for user
    const recentExpenses = await Expense.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(50);

    if (recentExpenses.length === 0) {
      return res.json({ insight: "Add some expenses to get personalized AI tips!" });
    }

    let insightText = "";
    try {
      insightText = await generateInsights(recentExpenses.map(e => e.toObject()));
    } catch (e: any) {
      // Gracefully handle rate limit / quota error
      if (e.message?.includes('quota') || e.status === 429) {
        insightText = "AI Coach is currently resting to preserve API quotas. You can review your dashboard chart below!";
      } else {
        throw e;
      }
    }

    // Cache the insight
    const newReport = new AIReport({
      userId: req.user.id,
      type: 'savings_insight',
      content: insightText
    });
    await newReport.save();

    res.json({ insight: insightText });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/analytics/summary - daily, weekly, monthly, yearly, and total spending
export const getSpendingSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const currentYear = today.getFullYear().toString();
    const todayStr = today.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    // Monthly
    const monthlyAgg = await Expense.aggregate([
      { $match: { userId, date: { $regex: `^${currentMonth}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthly = monthlyAgg.length > 0 ? monthlyAgg[0].total : 0;

    // Today
    const dailyAgg = await Expense.aggregate([
      { $match: { userId, date: todayStr } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const daily = dailyAgg.length > 0 ? dailyAgg[0].total : 0;

    // Weekly
    const weeklyAgg = await Expense.aggregate([
      { $match: { userId, date: { $gte: sevenDaysAgoStr } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const weekly = weeklyAgg.length > 0 ? weeklyAgg[0].total : 0;

    // Yearly
    const yearlyAgg = await Expense.aggregate([
      { $match: { userId, date: { $regex: `^${currentYear}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const yearly = yearlyAgg.length > 0 ? yearlyAgg[0].total : 0;

    // Total
    const totalAgg = await Expense.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const total = totalAgg.length > 0 ? totalAgg[0].total : 0;

    res.json({ daily, weekly, monthly, yearly, total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/monthly-trend - Bar Chart data, last 6 months
export const getMonthlyTrend = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const trend = await Expense.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { $substr: ['$date', 0, 7] }, // Group by YYYY-MM
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
      {
        $project: {
          month: '$_id',
          total: 1,
          _id: 0
        }
      }
    ]);
    res.json(trend);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/daily-trend - Line Chart data, last 30 days
export const getDailyTrend = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const trend = await Expense.aggregate([
      { $match: { userId, date: { $gte: thirtyDaysAgoStr } } },
      {
        $group: {
          _id: '$date', // Group by YYYY-MM-DD
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          total: 1,
          _id: 0
        }
      }
    ]);
    res.json(trend);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/anomalies - categories where this month's spending is
// significantly above the recent monthly average
export const getSpendingAnomalies = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const anomalies = await findSpendingAnomalies(req.user.id);
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/health - financial health score and metrics breakdown
export const getFinancialHealth = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);

    // 1. Calculate Monthly Income vs Expense (Cash Flow)
    const incomeAgg = await Income.aggregate([
      { $match: { userId, date: { $regex: `^${currentMonth}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyIncome = incomeAgg.length > 0 ? incomeAgg[0].total : 0;

    const expenseAgg = await Expense.aggregate([
      { $match: { userId, date: { $regex: `^${currentMonth}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyExpense = expenseAgg.length > 0 ? expenseAgg[0].total : 0;

    const cashFlow = monthlyIncome - monthlyExpense;

    // 2. Debt-to-Income (DTI) Ratio
    const debts = await Debt.find({ userId: req.user.id });
    const sumEMIs = debts.reduce((sum, d) => sum + d.emi, 0);
    const totalDebtBalance = debts.reduce((sum, d) => sum + d.remainingBalance, 0);

    // Use monthlyIncome for DTI, or baseline to prevent Division by Zero
    const dtiRatio = monthlyIncome > 0 ? (sumEMIs / monthlyIncome) * 100 : sumEMIs > 0 ? 100 : 0;

    // 3. Compute Savings Rate Score (40% weight)
    let savingsRate = 0;
    let savingsScore = 0;
    if (monthlyIncome > 0) {
      savingsRate = (cashFlow / monthlyIncome) * 100;
      if (savingsRate >= 30) {
        savingsScore = 40;
      } else if (savingsRate > 0) {
        savingsScore = (savingsRate / 30) * 40;
      }
    }

    // 4. Compute DTI Score (35% weight)
    let dtiScore = 35; // Default full points if no debt EMIs
    if (sumEMIs > 0) {
      if (dtiRatio <= 15) {
        dtiScore = 35;
      } else if (dtiRatio >= 50) {
        dtiScore = 0;
      } else {
        dtiScore = 35 * (1 - (dtiRatio - 15) / (50 - 15));
      }
    }

    // 5. Budget Adherence Score (25% weight)
    const budgets = await Budget.find({ userId: req.user.id });
    let budgetScore = 25; // Default full points if no budgets set
    let activeBudgetsCount = budgets.length;
    let adheredBudgetsCount = 0;

    if (activeBudgetsCount > 0) {
      const expenses = await Expense.find({ userId: req.user.id, date: { $regex: `^${currentMonth}` } });
      const spentByCategory = expenses.reduce((acc: { [key: string]: number }, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {});

      budgets.forEach(b => {
        const spent = spentByCategory[b.category] || 0;
        if (spent <= b.monthly_limit) {
          adheredBudgetsCount++;
        }
      });
      budgetScore = (adheredBudgetsCount / activeBudgetsCount) * 25;
    }

    // Total Financial Health Score (out of 100)
    const healthScore = Math.max(0, Math.min(100, Math.round(savingsScore + dtiScore + budgetScore)));

    // Generate actionable recommendations
    const recommendations: string[] = [];
    if (healthScore >= 80) {
      recommendations.push("Excellent work! Continue maintaining a solid savings buffer.");
      if (sumEMIs > 0) recommendations.push("Consider prepaying your high-interest debts to become completely debt-free even faster.");
    } else {
      if (savingsRate < 20) {
        recommendations.push("Your savings rate is below the recommended 20%. Try trimming non-essential expenditures.");
      }
      if (dtiRatio > 35) {
        recommendations.push("Your Debt-to-Income ratio is in the danger zone (>35%). Avoid taking new loans and look into debt consolidation.");
      }
      if (activeBudgetsCount > 0 && adheredBudgetsCount < activeBudgetsCount) {
        recommendations.push(`You overspent in ${activeBudgetsCount - adheredBudgetsCount} of your budgeted categories. Set alerts to track category limits daily.`);
      }
      if (activeBudgetsCount === 0) {
        recommendations.push("Set monthly category budget limits on the Budgets page to build financial discipline.");
      }
    }

    res.json({
      healthScore,
      metrics: {
        monthlyIncome,
        monthlyExpense,
        cashFlow,
        sumEMIs,
        totalDebtBalance,
        dtiRatio: Math.round(dtiRatio * 10) / 10,
        savingsRate: Math.round(savingsRate * 10) / 10,
        budgetAdherence: activeBudgetsCount > 0 ? Math.round((adheredBudgetsCount / activeBudgetsCount) * 100) : 100
      },
      recommendations
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
