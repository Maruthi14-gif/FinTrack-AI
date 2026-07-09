import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { IndianRupee, TrendingUp, Wallet, ArrowUpRight, CalendarDays, Coins, BarChart3, TrendingDown, FileDown, Loader2, PieChart as PieChartIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { exportExpensesPDF } from '@/lib/exporters';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/features/notifications/NotificationBell';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#6b7280'];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ daily: 0, weekly: 0, monthly: 0, yearly: 0, total: 0 });
  const [distribution, setDistribution] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sumRes, distRes, insightRes, monthlyRes, dailyRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/distribution'),
        api.get('/analytics/insights'),
        api.get('/analytics/monthly-trend'),
        api.get('/analytics/daily-trend')
      ]);
      setSummary(sumRes.data);
      setDistribution(distRes.data);
      setInsights(insightRes.data.insight);
      setMonthlyTrend(monthlyRes.data);
      setDailyTrend(dailyRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Download a PDF report of the current month's transactions
  const handleDownloadReport = async () => {
    setReportLoading(true);
    try {
      const now = new Date();
      const monthStart = `${now.toISOString().slice(0, 7)}-01`;
      const todayStr = now.toISOString().slice(0, 10);

      const res = await api.get('/expenses', {
        params: { startDate: monthStart, endDate: todayStr, page: 1, limit: 100000 }
      });

      const monthExpenses = res.data.expenses || [];
      if (monthExpenses.length === 0) {
        alert('No expenses recorded this month yet.');
        return;
      }

      const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      await exportExpensesPDF(monthExpenses, user?.currency || 'INR', {
        title: 'Monthly Expense Report',
        subtitle: monthLabel
      });
    } catch (error) {
      console.error('Failed to generate PDF report:', error);
      alert('Error generating the PDF report.');
    } finally {
      setReportLoading(false);
    }
  };

  const getCurrencySymbol = () => {
    return user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';
  };

  const formatCurrency = (val) => {
    return `${getCurrencySymbol()}${val?.toLocaleString() || 0}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary mb-1">Welcome back, {user?.username || 'there'} 👋</p>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Financial Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time spend logs and custom AI observations</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleDownloadReport}
            disabled={reportLoading}
            className="flex items-center gap-1.5 rounded-xl cursor-pointer bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 border-0 h-9 text-xs md:text-sm px-4 shadow-lg shadow-indigo-500/25"
          >
            {reportLoading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            <span className="hidden sm:inline">{reportLoading ? 'Generating…' : 'PDF Report'}</span>
          </Button>
          <NotificationBell />
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <SummaryCard
          title="Today's Spend"
          amount={summary.daily}
          icon={IndianRupee}
          gradient="from-indigo-500 to-blue-500"
          formatCurrency={formatCurrency}
          delay={0.05}
        />
        <SummaryCard
          title="This Week"
          amount={summary.weekly}
          icon={TrendingUp}
          gradient="from-violet-500 to-purple-500"
          formatCurrency={formatCurrency}
          delay={0.1}
        />
        <SummaryCard
          title="This Month"
          amount={summary.monthly}
          icon={Wallet}
          gradient="from-fuchsia-500 to-pink-500"
          formatCurrency={formatCurrency}
          delay={0.15}
        />
        <SummaryCard
          title="This Year"
          amount={summary.yearly}
          icon={CalendarDays}
          gradient="from-teal-500 to-emerald-500"
          formatCurrency={formatCurrency}
          delay={0.2}
        />
        <SummaryCard
          title="Total Expenses"
          amount={summary.total}
          icon={Coins}
          gradient="from-amber-500 to-orange-500"
          formatCurrency={formatCurrency}
          className="col-span-2 md:col-span-1"
          highlight
          delay={0.25}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-4">
        {/* Category Breakdown Pie Chart */}
        <Card className="col-span-1 lg:col-span-4 rounded-2xl shadow-md bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="inline-flex rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 shadow-md shadow-indigo-500/25">
                <PieChartIcon size={16} className="text-white" />
              </span>
              Category Distribution
            </CardTitle>
            <CardDescription>Where your funds went this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="total"
                      nameKey="category"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                  No transaction distribution logs yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Card */}
        <Card className="col-span-1 lg:col-span-3 rounded-2xl shadow-md border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="inline-flex bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-lg text-white shadow-md shadow-indigo-500/25">
                <ArrowUpRight size={16} />
              </span>
              Financial Observations
            </CardTitle>
            <CardDescription>Generated by Gemini AI Coach</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ duration: 0.5, delay: 0.2 }}
              className="prose prose-sm dark:prose-invert"
            >
              {insights ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium text-foreground/90 bg-background/50 border border-primary/5 rounded-2xl p-4 shadow-inner" dangerouslySetInnerHTML={{ __html: insights.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ) : (
                <p className="text-muted-foreground italic text-center py-10">Add transaction entries to enable custom AI feedback!</p>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-2">
        {/* Monthly Spending Trend Bar Chart */}
        <Card className="col-span-1 lg:col-span-4 rounded-2xl shadow-md bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="inline-flex rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-1.5 shadow-md shadow-violet-500/25">
                <BarChart3 className="text-white h-4 w-4" />
              </span>
              Monthly Cash Trend
            </CardTitle>
            <CardDescription>Monthly spending logs for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs text-muted-foreground" />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${getCurrencySymbol()}${val}`} className="text-xs text-muted-foreground" />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]}>
                      {monthlyTrend.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#6366f1" opacity={0.85 + (index * 0.03)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                  No monthly trend logs available yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Spending Trend Line Chart */}
        <Card className="col-span-1 lg:col-span-3 rounded-2xl shadow-md bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <span className="inline-flex rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-600 p-1.5 shadow-md shadow-fuchsia-500/25">
                <TrendingDown className="text-white h-4 w-4" />
              </span>
              30-Day Spending Trend
            </CardTitle>
            <CardDescription>Daily spending fluctuations over last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(str) => str ? str.slice(8, 10) : ''} className="text-xs text-muted-foreground" />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${getCurrencySymbol()}${val}`} className="text-xs text-muted-foreground" />
                    <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Date: ${label}`} />
                    <Line type="monotone" dataKey="total" stroke="#ec4899" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                  No 30-day daily logs available yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, amount, icon: Icon, gradient, formatCurrency, className = "", delay, highlight }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4 }}
      className={className}
    >
      <Card className={`group relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/10 ${highlight ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.07] to-transparent' : 'border-border/60 bg-card/60 backdrop-blur-sm'}`}>
        {/* accent glow that appears on hover */}
        <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className={`inline-flex rounded-lg bg-gradient-to-br ${gradient} p-1.5 shadow-md transition-transform group-hover:scale-110`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground">{formatCurrency(amount)}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
