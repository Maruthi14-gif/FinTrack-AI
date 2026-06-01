import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { IndianRupee, TrendingUp, Wallet, ArrowUpRight, CalendarDays, Coins, BarChart3, TrendingDown, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#6b7280'];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ daily: 0, weekly: 0, monthly: 0, yearly: 0, total: 0 });
  const [distribution, setDistribution] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(true);

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
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time spend logs and custom AI observations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl cursor-pointer bg-card hover:bg-muted border border-border/80 h-9 text-xs md:text-sm px-3"
          >
            <Printer size={16} /> <span className="hidden sm:inline">Print Report</span>
          </Button>
          <NotificationBell />
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <SummaryCard 
          title="Today's Spend" 
          amount={summary.daily} 
          icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} 
          formatCurrency={formatCurrency}
          delay={0.1}
        />
        <SummaryCard 
          title="This Week" 
          amount={summary.weekly} 
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} 
          formatCurrency={formatCurrency}
          delay={0.15}
        />
        <SummaryCard 
          title="This Month" 
          amount={summary.monthly} 
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
          formatCurrency={formatCurrency}
          delay={0.2}
        />
        <SummaryCard 
          title="This Year" 
          amount={summary.yearly} 
          icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} 
          formatCurrency={formatCurrency}
          delay={0.25}
        />
        <SummaryCard 
          title="Total Expenses" 
          amount={summary.total} 
          icon={<Coins className="h-4 w-4 text-muted-foreground" />} 
          formatCurrency={formatCurrency}
          className="col-span-2 md:col-span-1"
          delay={0.3}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-4">
        {/* Category Breakdown Pie Chart */}
        <Card className="col-span-1 lg:col-span-4 shadow-md bg-card/40 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Category Distribution</CardTitle>
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
        <Card className="col-span-1 lg:col-span-3 shadow-md border-primary/15 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="bg-primary p-1.5 rounded-md text-primary-foreground">
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
        <Card className="col-span-1 lg:col-span-4 shadow-md bg-card/40 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="text-primary h-5 w-5" /> Monthly Cash Trend
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
        <Card className="col-span-1 lg:col-span-3 shadow-md bg-card/40 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="text-primary h-5 w-5" /> 30-Day Spending Trend
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

function SummaryCard({ title, amount, icon, formatCurrency, className = "", delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      <Card className="shadow-sm bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow border-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4 pt-4">
          <CardTitle className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground">{formatCurrency(amount)}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
