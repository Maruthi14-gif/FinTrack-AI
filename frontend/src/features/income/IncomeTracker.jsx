import { useState, useEffect } from 'react';
import { Plus, Trash2, Wallet, Calendar, Tag, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function IncomeTracker() {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('Salary');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination & Filtering
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = ['Salary', 'Freelance', 'Investments', 'Business', 'Gifts', 'Others'];

  useEffect(() => {
    fetchIncomes();
  }, [page, search]);

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/incomes', {
        params: {
          search,
          page,
          limit: 5,
          sortBy: 'date',
          sortOrder: 'desc'
        }
      });
      setIncomes(res.data.incomes);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    if (!source || !amount || !date) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setFormLoading(true);
    try {
      await api.post('/incomes', {
        source,
        category,
        amount: Number(amount),
        date,
        description
      });
      setSource('');
      setAmount('');
      setDescription('');
      setPage(1);
      fetchIncomes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add income');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this income?')) return;
    try {
      await api.delete(`/incomes/${id}`);
      fetchIncomes();
    } catch (err) {
      console.error('Failed to delete income', err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Income Tracker</h1>
        <p className="text-muted-foreground mt-1">Record your earnings and monitor cash flow sources</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Add Income Card */}
        <Card className="md:col-span-1 border-primary/10 bg-card/65 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="text-primary" size={18} /> Add Income
            </CardTitle>
            <CardDescription>Log a new source of revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddIncome} className="space-y-4">
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Source *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Salary"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Regular monthly paycheck"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={formLoading}
                className="w-full font-bold cursor-pointer mt-2"
              >
                {formLoading ? 'Saving...' : 'Add Income'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History Table Card */}
        <Card className="md:col-span-2 shadow-md border-primary/5 bg-card/45 backdrop-blur-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Earnings History</CardTitle>
              <CardDescription>Recent streams of income</CardDescription>
            </div>
            <div className="relative w-48">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-background border border-input rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {loading ? (
              <div className="py-20 text-center text-sm text-muted-foreground animate-pulse font-semibold">
                Loading earnings history...
              </div>
            ) : incomes.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground font-semibold">
                No incomes logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider font-bold">
                      <th className="px-6 py-3 text-left">Source</th>
                      <th className="px-6 py-3 text-left">Category</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map((inc) => (
                      <tr key={inc.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">
                          {inc.source}
                          {inc.description && (
                            <span className="block text-xs text-muted-foreground font-medium mt-0.5">{inc.description}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-emerald-500/10 text-emerald-500 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/10">
                            {inc.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-semibold">
                          {new Date(inc.date).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-emerald-500">
                          ₹{inc.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDelete(inc.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-border/40">
                    <span className="text-xs text-muted-foreground font-semibold">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
