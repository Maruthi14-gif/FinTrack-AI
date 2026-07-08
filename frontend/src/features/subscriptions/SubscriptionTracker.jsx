import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, AlertTriangle, Play, Pause, DollarSign, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SubscriptionTracker() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Bills');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = ['Bills', 'Entertainment', 'Food', 'Healthcare', 'Education', 'Others'];

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!name || !amount || !nextDueDate) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setFormLoading(true);
    try {
      await api.post('/subscriptions', {
        name,
        amount: Number(amount),
        category,
        billingCycle,
        nextDueDate
      });
      setName('');
      setAmount('');
      setBillingCycle('monthly');
      fetchSubscriptions();
    } catch (err) {
      setError('Failed to save subscription');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.put(`/subscriptions/${id}/toggle`);
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s));
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to delete subscription', err);
    }
  };

  // Calculate monthly equivalent overhead
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const totalMonthlyOverhead = activeSubs.reduce((sum, s) => {
    if (s.billingCycle === 'monthly') return sum + s.amount;
    return sum + (s.amount / 12); // yearly divide by 12
  }, 0);

  // Check if due soon (<= 3 days)
  const isDueSoon = (dateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateStr);
    due.setHours(0,0,0,0);
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 3;
  };

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Recurring Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Isolate fixed cost overheads and upcoming bills</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Form (Left) */}
        <Card className="md:col-span-1 border-primary/10 bg-card/65 backdrop-blur-md h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="text-primary" size={18} /> Add Bill
            </CardTitle>
            <CardDescription>Track new subscription details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSubscription} className="space-y-4">
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Wifi Bill"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Amount *</label>
                  <input
                    type="number"
                    required
                    placeholder="649"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Next Due *</label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={formLoading}
                className="w-full font-bold cursor-pointer mt-2"
              >
                {formLoading ? 'Saving...' : 'Add Subscription'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Dashboard Grid (Right) */}
        <div className="md:col-span-2 space-y-6">
          {/* Overhead analysis card */}
          <Card className="bg-primary/5 border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Calendar size={120} className="text-primary animate-pulse" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-primary uppercase font-bold tracking-wider">Fixed Overhead Index</CardTitle>
              <CardDescription>Total committed subscriptions impact</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Monthly Equivalent Cost</span>
                <span className="text-3xl font-black text-foreground mt-1 block">₹{Math.round(totalMonthlyOverhead).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Active Subscriptions</span>
                <span className="text-3xl font-black text-foreground mt-1 block">{activeSubs.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* List panel */}
          <Card className="shadow-sm border-primary/5 bg-card/45 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Logged Subscriptions</CardTitle>
              <CardDescription>Active & paused recurring bill lists</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground animate-pulse text-center py-6">Loading subscriptions...</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 font-semibold">No subscriptions logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map(sub => {
                    const dueSoon = sub.status === 'active' && isDueSoon(sub.nextDueDate);
                    return (
                      <div
                        key={sub.id}
                        className={`border border-border/40 p-4 rounded-2xl bg-background/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${sub.status === 'paused' ? 'opacity-65' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {sub.status === 'active' ? (
                              <button
                                onClick={() => handleToggleStatus(sub.id)}
                                className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 rounded-xl hover:bg-emerald-500/20 cursor-pointer"
                                title="Pause subscription"
                              >
                                <Play size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(sub.id)}
                                className="p-2 bg-muted text-muted-foreground border border-border/20 rounded-xl hover:bg-muted/80 cursor-pointer"
                                title="Resume subscription"
                              >
                                <Pause size={14} />
                              </button>
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                              {sub.name}
                              {dueSoon && (
                                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle size={10} /> Due soon
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mt-1">
                              Category: {sub.category} | Next pay: {new Date(sub.nextDueDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <span className="font-black text-sm text-foreground">₹{sub.amount.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground font-bold block capitalize">/{sub.billingCycle}</span>
                          </div>

                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
