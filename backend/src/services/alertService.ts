import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import Notification from '../models/Notification.js';

// All notification triggers live here. Saving a Notification document also
// dispatches a web push via the post-save hook on the Notification model.

// Warn at >= 90% of a category's monthly budget, alert when exceeded.
// Deduplicated to at most one alert per category per day.
export async function checkBudgetLimit(userId: string, category: string): Promise<void> {
  try {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);

    // 1. Check if there is a budget for this user and category
    const budget = await Budget.findOne({ userId, category });
    if (!budget) return;

    // 2. Fetch total spent in this category for the current month
    const categoryExpenses = await Expense.find({
      userId,
      category,
      date: { $regex: `^${currentMonth}` }
    });
    const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);

    const budgetLimit = budget.monthly_limit;
    const ratio = totalSpent / budgetLimit;

    // We only trigger alerts if ratio >= 0.9
    if (ratio >= 0.9) {
      // Check if we already triggered an alert today for this category to avoid spam
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const existingAlert = await Notification.findOne({
        userId,
        type: 'budget_alert',
        title: { $regex: new RegExp(category, 'i') },
        createdAt: { $gte: startOfToday }
      });

      if (!existingAlert) {
        let title = '';
        let message = '';
        if (ratio >= 1.0) {
          title = `Budget Exceeded: ${category}`;
          message = `Alert! You have spent ₹${totalSpent.toLocaleString()} on ${category}, exceeding your limit of ₹${budgetLimit.toLocaleString()} by ${Math.round((ratio - 1) * 100)}%.`;
        } else {
          title = `Budget Warning: ${category}`;
          message = `Warning: You have used ${Math.round(ratio * 100)}% of your monthly ${category} budget limit (Spent ₹${totalSpent.toLocaleString()} of ₹${budgetLimit.toLocaleString()}).`;
        }

        const newNotification = new Notification({
          userId,
          title,
          message,
          type: 'budget_alert'
        });
        await newNotification.save();
      }
    }
  } catch (err) {
    console.error('Error triggering budget alert notifications:', err);
  }
}

export interface SpendingAnomaly {
  category: string;
  currentSpend: number;
  averageSpend: number;
  percentIncrease: number;
}

// Compare this month's spend in a category against the average of the
// previous three calendar months (ignoring months with no spend in that
// category). Flags an anomaly when the current month is at least 50% above
// the average and the jump is big enough to matter (>= ₹500).
async function detectAnomalyForCategory(userId: string, category: string): Promise<SpendingAnomaly | null> {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  const monthTotals: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const expenses = await Expense.find({ userId, category, date: { $regex: `^${monthKey}` } });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    if (total > 0) monthTotals.push(total);
  }

  // No history to compare against
  if (monthTotals.length === 0) return null;

  const averageSpend = monthTotals.reduce((sum, t) => sum + t, 0) / monthTotals.length;

  const currentExpenses = await Expense.find({ userId, category, date: { $regex: `^${currentMonth}` } });
  const currentSpend = currentExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (currentSpend >= averageSpend * 1.5 && currentSpend - averageSpend >= 500) {
    return {
      category,
      currentSpend,
      averageSpend: Math.round(averageSpend),
      percentIncrease: Math.round(((currentSpend - averageSpend) / averageSpend) * 100)
    };
  }

  return null;
}

// Run anomaly detection for one category (after an expense is saved) and
// notify the user. Deduplicated to one anomaly alert per category per month.
export async function checkSpendingAnomaly(userId: string, category: string): Promise<void> {
  try {
    const anomaly = await detectAnomalyForCategory(userId, category);
    if (!anomaly) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const existingAlert = await Notification.findOne({
      userId,
      type: 'system',
      title: `Unusual Spending: ${category}`,
      createdAt: { $gte: startOfMonth }
    });

    if (!existingAlert) {
      const newNotification = new Notification({
        userId,
        title: `Unusual Spending: ${category}`,
        message: `Heads up! You've spent ₹${anomaly.currentSpend.toLocaleString()} on ${category} this month — ${anomaly.percentIncrease}% above your recent monthly average of ₹${anomaly.averageSpend.toLocaleString()}.`,
        type: 'system'
      });
      await newNotification.save();
    }
  } catch (err) {
    console.error('Error running spending anomaly detection:', err);
  }
}

// Scan every category the user spent on this month and return all anomalies.
// Used by the analytics dashboard.
export async function findSpendingAnomalies(userId: string): Promise<SpendingAnomaly[]> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = await Expense.find({ userId, date: { $regex: `^${currentMonth}` } });
  const categories = [...new Set(monthExpenses.map(e => e.category))];

  const anomalies: SpendingAnomaly[] = [];
  for (const category of categories) {
    const anomaly = await detectAnomalyForCategory(userId, category);
    if (anomaly) anomalies.push(anomaly);
  }

  return anomalies;
}

// Remind about active subscriptions that are due within the next 3 days.
// Deduplicated per subscription + due date.
export async function checkUpcomingBills(userId: string, subscriptions: any[]): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeSubs = subscriptions.filter(sub => sub.status === 'active');

  for (const sub of activeSubs) {
    if (!sub.nextDueDate) continue;
    const dueDate = new Date(sub.nextDueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      const existingAlert = await Notification.findOne({
        userId,
        type: 'debt_due',
        title: { $regex: new RegExp(sub.name, 'i') },
        message: { $regex: new RegExp(sub.nextDueDate, 'i') }
      });

      if (!existingAlert) {
        const newNotification = new Notification({
          userId,
          title: `Upcoming Bill: ${sub.name}`,
          message: `Reminder: Your subscription for ${sub.name} (₹${sub.amount.toLocaleString()}) is due on ${sub.nextDueDate} (in ${diffDays === 0 ? 'today' : diffDays === 1 ? '1 day' : diffDays + ' days'}).`,
          type: 'debt_due'
        });
        await newNotification.save();
      }
    }
  }
}
