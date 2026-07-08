import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUpDown, HelpCircle, AlertTriangle, TrendingDown, Percent, Info, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebtPlanner() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extraPayment, setExtraPayment] = useState(0);
  const [strategy, setStrategy] = useState('avalanche'); // 'avalanche' or 'snowball'
  
  // Projections State
  const [projection, setProjection] = useState(null);
  const [baseline, setBaseline] = useState(null); // baseline with extraPayment = 0
  const [projectLoading, setProjectLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [emi, setEmi] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDebts();
  }, []);

  useEffect(() => {
    if (debts.length > 0) {
      calculateProjections();
    } else {
      setProjection(null);
      setBaseline(null);
    }
  }, [debts, extraPayment]);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/debts');
      setDebts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjections = async () => {
    setProjectLoading(true);
    try {
      // 1. Fetch current projection
      const resProj = await api.get('/debts/plan', { params: { extraPayment } });
      setProjection(resProj.data);

      // 2. Fetch baseline projection if extraPayment > 0
      if (extraPayment > 0) {
        const resBase = await api.get('/debts/plan', { params: { extraPayment: 0 } });
        setBaseline(resBase.data);
      } else {
        setBaseline(resProj.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProjectLoading(false);
    }
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!name || !principalAmount || !remainingBalance || !interestRate || !emi || !dueDate) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setFormLoading(true);
    try {
      await api.post('/debts', {
        name,
        principalAmount: Number(principalAmount),
        remainingBalance: Number(remainingBalance),
        interestRate: Number(interestRate),
        emi: Number(emi),
        dueDate
      });
      setName('');
      setPrincipalAmount('');
      setRemainingBalance('');
      setInterestRate('');
      setEmi('');
      fetchDebts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add debt');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this debt entry?')) return;
    try {
      await api.delete(`/debts/${id}`);
      fetchDebts();
    } catch (err) {
      console.error('Failed to delete debt', err);
    }
  };

  const formatMonths = (months) => {
    if (months === -1) return '30+ Years (Interest exceeds payments)';
    if (months === 0) return '0 months';
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    let res = '';
    if (years > 0) res += `${years} yr${years > 1 ? 's' : ''} `;
    if (remainingMonths > 0) res += `${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}`;
    return res.trim();
  };

  const currentPlanResult = strategy === 'avalanche' ? projection?.avalanche : projection?.snowball;
  const baselineResult = strategy === 'avalanche' ? baseline?.avalanche : baseline?.snowball;

  const totalBalance = debts.reduce((sum, d) => sum + d.remainingBalance, 0);
  const totalPrincipal = debts.reduce((sum, d) => sum + d.principalAmount, 0);

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Debt Payoff Planner</h1>
        <p className="text-muted-foreground mt-1">Simulate strategies to eliminate your debts faster</p>
      </header>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Debt Logging Panel (Left) */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-primary/10 bg-card/65 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="text-primary" size={18} /> Add Debt
              </CardTitle>
              <CardDescription>Log credit card balance, loan, or EMI</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDebt} className="space-y-4">
                {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Debt Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Credit Card A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Principal (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="100000"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Balance (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="85000"
                      value={remainingBalance}
                      onChange={(e) => setRemainingBalance(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Interest (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="12.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Min EMI (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="3500"
                      value={emi}
                      onChange={(e) => setEmi(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={formLoading}
                  className="w-full font-bold cursor-pointer mt-2"
                >
                  {formLoading ? 'Adding...' : 'Add Debt'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Projections & List Panel (Right) */}
        <div className="md:col-span-2 space-y-6">
          {/* Active Debts List */}
          <Card className="shadow-sm border-primary/5 bg-card/45 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Your Debts ({debts.length})</CardTitle>
              <CardDescription>Track outstanding loans and payment statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground animate-pulse font-semibold text-center py-6">Loading debts...</p>
              ) : debts.length === 0 ? (
                <p className="text-sm text-muted-foreground font-semibold text-center py-6">No debts logged. You are debt-free!</p>
              ) : (
                <div className="space-y-4">
                  {debts.map(d => {
                    const pct = Math.round((d.remainingBalance / d.principalAmount) * 100);
                    return (
                      <div key={d.id} className="border border-border/40 p-4 rounded-2xl bg-background/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-sm text-foreground block">{d.name}</span>
                            <span className="text-xs font-semibold text-muted-foreground block mt-0.5">Interest: {d.interestRate}% | Min EMI: ₹{d.emi.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="font-extrabold text-sm text-primary block">₹{d.remainingBalance.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground block mt-0.5">of ₹{d.principalAmount.toLocaleString()}</span>
                            </div>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden mt-1.5 border border-border/20">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calculator Section */}
          {debts.length > 0 && (
            <Card className="shadow-lg border-primary/10 bg-card/65 backdrop-blur-md overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingDown className="text-primary" size={20} /> Payoff Projections
                </CardTitle>
                <CardDescription>Adjust your strategy and additional pay pool</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Control bar */}
                <div className="grid gap-4 sm:grid-cols-2 bg-background/50 border border-border/40 p-4 rounded-2xl">
                  {/* Strategy Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase block">Strategy</label>
                    <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/40 max-w-xs">
                      <button
                        onClick={() => setStrategy('avalanche')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${strategy === 'avalanche' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      >
                        Avalanche (Rate)
                      </button>
                      <button
                        onClick={() => setStrategy('snowball')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${strategy === 'snowball' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      >
                        Snowball (Balance)
                      </button>
                    </div>
                  </div>

                  {/* Extra payment */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                      <span>Extra Monthly Payment</span>
                      <span className="font-extrabold text-primary">₹{extraPayment.toLocaleString()}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="500"
                      value={extraPayment}
                      onChange={(e) => setExtraPayment(Number(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {projectLoading ? (
                  <p className="text-sm font-semibold text-muted-foreground animate-pulse text-center py-6">Recalculating projection models...</p>
                ) : currentPlanResult ? (
                  <div className="space-y-6">
                    {/* Metrics comparison */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-primary/5 border-primary/10 p-4">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Time to Debt-Free</span>
                        <span className="text-2xl font-extrabold text-foreground block mt-1">{formatMonths(currentPlanResult.monthsToDebtFree)}</span>
                        {extraPayment > 0 && baselineResult && baselineResult.monthsToDebtFree > currentPlanResult.monthsToDebtFree && (
                          <span className="text-xs text-emerald-500 font-bold block mt-1">
                            Saves {formatMonths(baselineResult.monthsToDebtFree - currentPlanResult.monthsToDebtFree)}!
                          </span>
                        )}
                      </Card>

                      <Card className="bg-primary/5 border-primary/10 p-4">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Interest Paid</span>
                        <span className="text-2xl font-extrabold text-foreground block mt-1">₹{currentPlanResult.totalInterestPaid.toLocaleString()}</span>
                        {extraPayment > 0 && baselineResult && baselineResult.totalInterestPaid > currentPlanResult.totalInterestPaid && (
                          <span className="text-xs text-emerald-500 font-bold block mt-1">
                            Saves ₹{(Math.round((baselineResult.totalInterestPaid - currentPlanResult.totalInterestPaid) * 100) / 100).toLocaleString()}!
                          </span>
                        )}
                      </Card>
                    </div>

                    {/* Timeline schedule */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payoff Payment Timeline</h4>
                      <div className="overflow-x-auto border border-border/40 rounded-2xl">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-bold uppercase">
                              <th className="px-4 py-2 text-left">Month</th>
                              {currentPlanResult.schedule[0]?.debts.map(d => (
                                <th key={d.name} className="px-4 py-2 text-right">{d.name} Bal</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentPlanResult.schedule.slice(0, 12).map((sch) => (
                              <tr key={sch.month} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-2.5 font-bold text-muted-foreground">Month {sch.month}</td>
                                {sch.debts.map((d, i) => (
                                  <td key={i} className="px-4 py-2.5 text-right font-semibold">
                                    {d.remainingBalance > 0 ? (
                                      <span>₹{d.remainingBalance.toLocaleString()}</span>
                                    ) : (
                                      <span className="text-emerald-500 font-bold">PAID</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {currentPlanResult.monthsToDebtFree > 12 && (
                        <p className="text-[10px] text-muted-foreground font-semibold text-center italic mt-1">
                          * Timeline truncated to first 12 months. Total payoff requires {formatMonths(currentPlanResult.monthsToDebtFree)}.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
