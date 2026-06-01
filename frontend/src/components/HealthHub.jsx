import { useState, useEffect } from 'react';
import { Sparkles, Activity, ShieldAlert, Heart, TrendingUp, HelpCircle, CheckCircle, Info, Printer } from 'lucide-react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export default function HealthHub() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/health');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 50) return 'text-amber-500 stroke-amber-500';
    return 'text-destructive stroke-destructive';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Moderate';
    return 'Needs Attention';
  };

  return (
    <div className="space-y-6">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Health Hub</h1>
          <p className="text-muted-foreground mt-1">Get your overall financial fitness score and recommendations</p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="flex items-center gap-1.5 rounded-xl cursor-pointer bg-card hover:bg-muted border border-border/80 h-9 text-xs md:text-sm px-3 self-start sm:self-auto"
        >
          <Printer size={16} /> Print Report
        </Button>
      </header>

      {loading ? (
        <div className="py-24 text-center text-sm text-muted-foreground animate-pulse font-semibold">
          Calculating financial health diagnostics...
        </div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Health Score Gauge (Left) */}
          <Card className="md:col-span-1 border-primary/10 bg-card/65 backdrop-blur-md flex flex-col justify-between p-4">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-base text-muted-foreground font-bold uppercase tracking-wider">Health Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              {/* Circular Gauge SVG */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-muted"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className={getScoreColor(data.healthScore).split(' ')[1]}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - data.healthScore / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black">{data.healthScore}</span>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground mt-1">out of 100</span>
                </div>
              </div>

              <div className="text-center mt-6">
                <span className={`text-lg font-black uppercase tracking-wider ${getScoreColor(data.healthScore).split(' ')[0]}`}>
                  {getScoreLabel(data.healthScore)}
                </span>
                <p className="text-xs text-muted-foreground font-medium mt-1">Based on income, debt, and budget metrics</p>
              </div>
            </CardContent>
            <Button onClick={fetchHealthData} variant="outline" className="w-full mt-2 font-bold cursor-pointer">
              Recalculate Score
            </Button>
          </Card>

          {/* Metrics & Cash Flow Details (Right) */}
          <div className="md:col-span-2 space-y-6">
            {/* Health Components Card */}
            <Card className="shadow-md border-primary/5 bg-card/45 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Health Indicators</CardTitle>
                <CardDescription>Core components of your financial health score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Savings Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-foreground">Savings Rate</span>
                    <span className="font-extrabold text-primary">{data.metrics.savingsRate}% <span className="text-xs font-semibold text-muted-foreground">(Target: 30%)</span></span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/20">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, (data.metrics.savingsRate / 30) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Debt-to-Income (DTI) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-foreground">Debt-to-Income (DTI) Ratio</span>
                    <span className="font-extrabold text-primary">{data.metrics.dtiRatio}% <span className="text-xs font-semibold text-muted-foreground">(Target: &le; 15%)</span></span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/20">
                    <div
                      className={`h-full rounded-full transition-all ${data.metrics.dtiRatio > 35 ? 'bg-destructive' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, (data.metrics.dtiRatio / 50) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Budget Adherence */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-foreground">Budget Discipline</span>
                    <span className="font-extrabold text-primary">{data.metrics.budgetAdherence}% <span className="text-xs font-semibold text-muted-foreground">(Target: 100%)</span></span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/20">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${data.metrics.budgetAdherence}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Cash Flow Summary Card */}
            <Card className="shadow-md border-primary/5 bg-card/45 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> Current Month Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="bg-background/40 border border-border/30 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Total Income</span>
                  <span className="text-lg font-black text-emerald-500 block mt-1">₹{data.metrics.monthlyIncome.toLocaleString()}</span>
                </div>
                <div className="bg-background/40 border border-border/30 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Total Expense</span>
                  <span className="text-lg font-black text-destructive block mt-1">₹{data.metrics.monthlyExpense.toLocaleString()}</span>
                </div>
                <div className="bg-background/40 border border-border/30 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Net Cash Flow</span>
                  <span className={`text-lg font-black block mt-1 ${data.metrics.cashFlow >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    ₹{data.metrics.cashFlow.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* AI Advisor Card */}
            <Card className="shadow-lg border-primary/10 bg-gradient-to-r from-primary/5 to-indigo-500/5">
              <CardHeader>
                <CardTitle className="text-md font-bold flex items-center gap-2 text-primary">
                  <Sparkles size={18} className="animate-pulse" /> Advisor Recommendations
                </CardTitle>
                <CardDescription>Actionable pointers to improve your score</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm font-semibold flex items-start gap-2 text-foreground/80">
                      <span className="text-primary mt-1">•</span> {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
